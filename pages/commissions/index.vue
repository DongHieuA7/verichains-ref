<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useSeoMeta({ title: 'My Commissions' })

const supabase = useSupabaseClient()
const user = useSupabaseUser()

const isLoading = ref(false)
const commissions = ref<any[]>([])
const isModalOpen = ref(false)
const editDraft = reactive<{ id: string; description: string; value: number | undefined }>({ id: '', description: '', value: undefined })
const isCreateOpen = ref(false)
const selectedYear = ref<number>(new Date().getFullYear())
const selectedMonth = ref<string>('')

const form = reactive({
  project_id: '',
  description: '',
  value: undefined as unknown as number,
})

const projects = ref<any[]>([])

const formatDate = (input: string) => {
  const d = new Date(input)
  if (isNaN(d.getTime())) return input
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

const fetchProjects = async () => {
  const { data } = await supabase.from('projects').select('id, name').order('name')
  projects.value = data || []
}

const fetchCommissions = async () => {
  if (!user.value) return
  const { data } = await supabase
    .from('commissions')
    .select('id, project_id, description, date, status, value')
    .eq('user_id', user.value.id)
    .order('date', { ascending: false })
  commissions.value = data || []
}

onMounted(async () => {
  await Promise.all([fetchProjects(), fetchCommissions()])
  // default select current month
  const now = new Date()
  selectedYear.value = now.getFullYear()
  const ym = `${selectedYear.value}-${String(now.getMonth() + 1).padStart(2,'0')}`
  selectedMonth.value = ym
})

const getProjectLabel = (projectId: string) => {
  return projects.value.find(p => p.id === projectId)?.name || 'Failed to get cell value'
}

const statusColor = (status: string) => {
  switch (status) {
    case 'requested':
      return 'yellow'
    case 'approved':
      return 'blue'
    case 'claimed':
      return 'green'
    default:
      return 'gray'
  }
}

const yearOptions = computed(() => {
  const current = new Date().getFullYear()
  const years: { label: string, value: number }[] = []
  for (let y = current; y >= current - 4; y--) {
    years.push({ label: String(y), value: y })
  }
  return years
})

const monthOptions = computed(() => {
  const options: { label: string, value: string }[] = []
  for (let m = 1; m <= 12; m++) {
    const value = `${selectedYear.value}-${String(m).padStart(2,'0')}`
    const label = new Date(`${selectedYear.value}-${String(m).padStart(2,'0')}-01`).toLocaleString(undefined, { month: 'long'})
    options.push({ label, value })
  }
  return options
})

const filteredCommissions = computed(() => {
  const byYear = commissions.value.filter(c => (c.date || '').slice(0,4) === String(selectedYear.value))
  if (!selectedMonth.value) return byYear
  return byYear.filter(c => (c.date || '').slice(0,7) === selectedMonth.value)
})

const totals = computed(() => {
  const list = filteredCommissions.value
  return list.reduce((acc, c) => {
    acc.total += Number(c.value || 0)
    acc.approved += c.status === 'approved' ? Number(c.value || 0) : 0
    acc.claimed += c.status === 'claimed' ? Number(c.value || 0) : 0
    return acc
  }, { total: 0, approved: 0, claimed: 0 })
})

const perProject = computed(() => {
  const map: Record<string, { project_id: string, total: number, approved: number, claimed: number, count: number }> = {}
  for (const c of filteredCommissions.value) {
    const key = c.project_id
    if (!map[key]) map[key] = { project_id: key, total: 0, approved: 0, claimed: 0, count: 0 }
    map[key].total += Number(c.value || 0)
    map[key].approved += c.status === 'approved' ? Number(c.value || 0) : 0
    map[key].claimed += c.status === 'claimed' ? Number(c.value || 0) : 0
    map[key].count += 1
  }
  return Object.values(map)
})

const projectCount = computed(() => new Set(filteredCommissions.value.map(c => c.project_id)).size)

const submit = async () => {
  try {
    isLoading.value = true
    if (!user.value) return
    const { error } = await supabase
      .from('commissions')
      .insert({
        user_id: user.value.id,
        project_id: form.project_id,
        description: form.description,
        value: form.value,
      })
    if (error) throw error
    form.project_id = ''
    form.description = ''
    ;(form as any).value = undefined
    isCreateOpen.value = false
    await fetchCommissions()
  } finally {
    isLoading.value = false
  }
}

const openEdit = (row: any) => {
  if (row.status === 'approved') return
  editDraft.id = row.id
  editDraft.description = row.description
  ;(editDraft as any).value = row.value
  isModalOpen.value = true
}

const saveEdit = async () => {
  const idx = commissions.value.findIndex(c => c.id === editDraft.id)
  if (idx === -1) return
  await supabase.from('commissions').update({ description: editDraft.description, value: editDraft.value }).eq('id', editDraft.id)
  await fetchCommissions()
  isModalOpen.value = false
}
</script>

<template>
  <div class="container mx-auto py-6">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="font-semibold">My Commission Requests</h2>
          <UButton color="primary" @click="isCreateOpen = true">New Commission</UButton>
        </div>
      </template>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="md:col-span-3 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-sm text-gray-500">Filter</span>
            <USelect v-model="selectedYear" :options="yearOptions" />
            <USelect v-model="selectedMonth" :options="monthOptions" />
          </div>
        </div>
        <div class="md:col-span-3">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <UCard>
              <template #header>
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-folders" />
                  <span class="font-medium">Projects Joined</span>
                </div>
              </template>
              <div class="text-2xl font-semibold">{{ projectCount }}</div>
            </UCard>
            <UCard>
              <template #header>
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-badge-dollar-sign" />
                  <span class="font-medium">Total Received</span>
                </div>
              </template>
              <div class="text-2xl font-semibold">{{ totals.total.toLocaleString() }}</div>
            </UCard>
            <UCard>
              <template #header>
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-receipt-text" />
                  <span class="font-medium">Total Claimed</span>
                </div>
              </template>
              <div class="text-2xl font-semibold">{{ totals.claimed.toLocaleString() }}</div>
            </UCard>
          </div>
        </div>
        <div class="md:col-span-3">
          <UTable :rows="commissions" :columns="[
            { key: 'date', label: 'Date' },
            { key: 'project_id', label: 'Project' },
            { key: 'description', label: 'Description' },
            { key: 'value', label: 'Value' },
            { key: 'status', label: 'Status' },
            { key: 'actions', label: 'Actions' },
          ]">
            <template #default="{ rows }">
              <UTable :rows="filteredCommissions" :columns="[
                { key: 'date', label: 'Date' },
                { key: 'project_id', label: 'Project' },
                { key: 'description', label: 'Description' },
                { key: 'value', label: 'Value' },
                { key: 'status', label: 'Status' },
                { key: 'actions', label: 'Actions' },
              ]">
                <template #date-data="{ row }">
                  <span>{{ formatDate(row.date) }}</span>
                </template>
                <template #project_id-data="{ row }">
                  <span>{{ getProjectLabel(row.project_id) }}</span>
                </template>
                <template #description-data="{ row }">
                  <span>{{ row.description || 'Failed to get cell value' }}</span>
                </template>
                <template #value-data="{ row }">
                  <span>{{ (row.value ?? '') === '' ? 'Failed to get cell value' : row.value }}</span>
                </template>
                <template #status-data="{ row }">
                  <UBadge :label="row.status || 'unknown'" :color="statusColor(row.status)" variant="soft" />
                </template>
                <template #actions-data="{ row }">
                  <UButton v-if="row.status === 'requested'" color="gray" size="xs" @click="openEdit(row)">Edit</UButton>
                  <UButton v-else-if="row.status === 'approved'" color="primary" size="xs" @click="async () => { await supabase.from('commissions').update({ status: 'claimed' }).eq('id', row.id); await fetchCommissions() }">Claim</UButton>
                  <div v-else>-</div>
                </template>
              </UTable>
            </template>
            <template #project_id-data="{ row }">
              <span>{{ getProjectLabel(row.project_id) }}</span>
            </template>
            <template #date-data="{ row }">
              <span>{{ formatDate(row.date) }}</span>
            </template>
            <template #description-data="{ row }">
              <span>{{ row.description || 'Failed to get cell value' }}</span>
            </template>
            <template #value-data="{ row }">
              <span>{{ (row.value ?? '') === '' ? 'Failed to get cell value' : row.value }}</span>
            </template>
            <template #status-data="{ row }">
              <UBadge :label="row.status || 'unknown'" :color="statusColor(row.status)" variant="soft" />
            </template>
            <template #actions-data="{ row }">
              <UButton v-if="row.status === 'requested'" color="gray" size="xs" @click="openEdit(row)">Edit</UButton>
              <UButton v-else-if="row.status === 'approved'" color="primary" size="xs" @click="async () => { await supabase.from('commissions').update({ status: 'claimed' }).eq('id', row.id); await fetchCommissions() }">Claim</UButton>
              <div v-else>-</div>
            </template>
          </UTable>
        </div>

        <UModal v-model="isModalOpen">
          <UCard>
            <template #header>
              <h3 class="font-semibold">Edit Commission</h3>
            </template>
            <div class="space-y-4">
              <UFormGroup label="Description">
                <UTextarea v-model="editDraft.description" />
              </UFormGroup>
              <UFormGroup label="Value">
                <UInput v-model.number="(editDraft as any).value" type="number" step="0.01" />
              </UFormGroup>
            </div>
            <template #footer>
              <div class="flex justify-end gap-2">
                <UButton color="gray" variant="soft" @click="isModalOpen = false">Cancel</UButton>
                <UButton color="primary" @click="saveEdit">Save</UButton>
              </div>
            </template>
          </UCard>
        </UModal>

        <UModal v-model="isCreateOpen">
          <UCard>
            <template #header>
              <h3 class="font-semibold">New Commission</h3>
            </template>
            <UForm id="create-form" @submit.prevent="submit">
              <div class="space-y-4">
                <UFormGroup label="Project">
                  <USelect v-model="form.project_id" :options="projects.map(p => ({ label: p.name || p.id, value: p.id }))" />
                </UFormGroup>
                <UFormGroup label="Description">
                  <UTextarea v-model="form.description" />
                </UFormGroup>
                <UFormGroup label="Value">
                  <UInput v-model.number="form.value" type="number" step="0.01" />
                </UFormGroup>
              </div>
            </UForm>
            <template #footer>
              <div class="flex justify-end gap-2">
                <UButton color="gray" variant="soft" @click="isCreateOpen = false">Cancel</UButton>
                <UButton form="create-form" type="submit" :loading="isLoading" :disabled="isLoading || !form.project_id || !form.value" color="primary">Create</UButton>
              </div>
            </template>
          </UCard>
        </UModal>
      </div>
    </UCard>
  </div>
</template>

<style scoped></style>




