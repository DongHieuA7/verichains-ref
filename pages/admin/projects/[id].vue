<script setup lang="ts">
definePageMeta({ middleware: ['auth','admin'] })
useSeoMeta({ title: 'Admin - Project Detail' })

const route = useRoute()
const projectId = computed(() => route.params.id as string)
// Mock current admin id (replace with auth user id later)
const currentAdminId = ref<string>('u-1')

// Mock project + users (align with admin/projects.vue mocks)
const mockUsers = [
  { id: 'u-1', email: 'alice@example.com', name: 'Alice', created_at: new Date(Date.now() - 86400000 * 30).toISOString() },
  { id: 'u-2', email: 'bob@example.com', name: 'Bob', created_at: new Date(Date.now() - 86400000 * 25).toISOString() },
  { id: 'u-3', email: 'carol@example.com', name: 'Carol', created_at: new Date(Date.now() - 86400000 * 10).toISOString() },
  { id: 'u-4', email: 'dave@example.com', name: 'Dave', created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
]

const projects = [
  { id: 'p-1', name: 'Project Alpha', admins: ['u-1'], users: ['u-1','u-2'] },
  { id: 'p-2', name: 'Project Beta', admins: ['u-2','u-3'], users: ['u-2','u-3','u-4'] },
  { id: 'p-3', name: 'Project Gamma', admins: [], users: [] },
]

const project = computed(() => projects.find(p => p.id === projectId.value))

type Commission = { id: string, user_id: string, project_id: string, description: string, date: string, status: 'requested'|'approved'|'claimed', value: number }

const statuses = ['requested','approved','claimed']
const rows = ref<Commission[]>([])

const usersInProject = ref<string[]>([])
const adminsInProject = ref<string[]>([])

// Month-Year filter
const selectedYear = ref<number>(new Date().getFullYear())
const selectedMonth = ref<string>('')
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
const filteredRows = computed(() => {
  const byYear = rows.value.filter(r => (r.date || '').slice(0,4) === String(selectedYear.value))
  if (!selectedMonth.value) return byYear
  return byYear.filter(r => (r.date || '').slice(0,7) === selectedMonth.value)
})

const commissionsByUser = computed<Record<string, Commission[]>>(() => {
  const map: Record<string, Commission[]> = {}
  for (const c of filteredRows.value) {
    if (!map[c.user_id]) map[c.user_id] = []
    map[c.user_id].push(c)
  }
  return map
})

const expandedUsers = ref<Set<string>>(new Set())
const toggleExpand = (uid: string) => {
  const set = new Set(expandedUsers.value)
  if (set.has(uid)) set.delete(uid); else set.add(uid)
  expandedUsers.value = set
}

// User-project info (editable): ref percentage and joined date per project
const userRefInfo = ref<Record<string, { ref_percentage: number, joined_at: string }>>({})
const initUserRefInfo = () => {
  const map: Record<string, { ref_percentage: number, joined_at: string }> = {}
  for (const uid of usersInProject.value) {
    map[uid] = {
      ref_percentage: 5 + (uid.charCodeAt(uid.length - 1) % 15),
      joined_at: mockUsers.find(u => u.id === uid)?.created_at || new Date().toISOString(),
    }
  }
  userRefInfo.value = map
}

// Edit commission modal
const approveCommission = (c: Commission) => {
  if (c.status !== 'requested') return
  const idx = rows.value.findIndex(r => r.id === c.id)
  if (idx !== -1) rows.value[idx] = { ...rows.value[idx], status: 'approved' }
}

const formatDate = (input: string) => {
  const d = new Date(input)
  if (isNaN(d.getTime())) return input
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// Available options excluding existing members
const availableUserOptions = computed(() => {
  const set = new Set(usersInProject.value)
  return mockUsers
    .filter(u => !set.has(u.id))
    .map(u => ({ label: u.name || u.email, value: u.id }))
})
const availableAdminOptions = computed(() => {
  const set = new Set(adminsInProject.value)
  return mockUsers
    .filter(u => !set.has(u.id))
    .map(u => ({ label: u.name || u.email, value: u.id }))
})

const removeUser = (uid: string) => {
  usersInProject.value = usersInProject.value.filter(id => id !== uid)
  const set = new Set(expandedUsers.value)
  if (set.has(uid)) { set.delete(uid); expandedUsers.value = set }
  delete userRefInfo.value[uid]
}
const removeAdmin = (uid: string) => {
  if (uid === currentAdminId.value) return
  adminsInProject.value = adminsInProject.value.filter(id => id !== uid)
}

const userLabel = (uid: string) => {
  const u = mockUsers.find(x => x.id === uid)
  return u ? (u.name || u.email) : uid
}

const initMock = () => {
  const users = usersInProject.value
  const items: Commission[] = []
  let i = 1
  for (const uid of users) {
    items.push({ id: `c-${projectId.value}-${i++}`, user_id: uid, project_id: projectId.value, description: 'Requested commission', date: new Date().toISOString(), status: 'requested', value: 1200 })
    items.push({ id: `c-${projectId.value}-${i++}`, user_id: uid, project_id: projectId.value, description: 'Approved commission', date: new Date(Date.now() - 86400000).toISOString(), status: 'approved', value: 800 })
    items.push({ id: `c-${projectId.value}-${i++}`, user_id: uid, project_id: projectId.value, description: 'Claimed commission', date: new Date(Date.now() - 172800000).toISOString(), status: 'claimed', value: 500 })
  }
  rows.value = items
}

onMounted(() => {
  initMock()
  usersInProject.value = [...(project.value?.users || [])]
  adminsInProject.value = [...(project.value?.admins || [])]
  initUserRefInfo()
  const now = new Date()
  selectedYear.value = now.getFullYear()
  selectedMonth.value = `${selectedYear.value}-${String(now.getMonth() + 1).padStart(2,'0')}`
})

const save = async (row: Commission) => {
  if (row.status === 'claimed') return
  const idx = rows.value.findIndex(r => r.id === row.id)
  if (idx !== -1) rows.value[idx] = { ...row }
}

// Edit Ref % modal
const isEditRefOpen = ref(false)
const isAddUserOpen = ref(false)
const isAddAdminOpen = ref(false)
const manageState = reactive<{ addUser?: string, addAdmin?: string }>({})
const editRef = reactive<{ uid: string, value: number | null }>({ uid: '', value: null })
const openEditRef = (uid: string) => {
  editRef.uid = uid
  editRef.value = userRefInfo.value[uid]?.ref_percentage ?? null
  isEditRefOpen.value = true
}
const saveEditRef = () => {
  if (!editRef.uid || editRef.value == null) { isEditRefOpen.value = false; return }
  const v = Math.max(0, Math.min(100, Number(editRef.value)))
  if (!userRefInfo.value[editRef.uid]) userRefInfo.value[editRef.uid] = { ref_percentage: v, joined_at: new Date().toISOString() }
  userRefInfo.value[editRef.uid].ref_percentage = v
  isEditRefOpen.value = false
}
</script>

<template>
  <div class="container mx-auto py-6">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <NuxtLink class="text-sm text-gray-500 hover:underline" to="/admin/projects">← Back</NuxtLink>
            <h2 class="font-semibold">Project Detail - {{ project?.name || projectId }}</h2>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-sm text-gray-500">Filter</span>
            <USelect v-model="selectedYear" :options="yearOptions" />
            <USelect v-model="selectedMonth" :options="monthOptions" />
          </div>
        </div>
      </template>

      <div class="grid grid-cols-1 gap-6">
        <div class="col-span-1">
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="font-medium">Admins</h3>
                <UButton size="xs" color="primary" @click="isAddAdminOpen = true">Add Admin</UButton>
              </div>
            </template>
            <UTable :rows="adminsInProject.map(uid => ({ uid }))" :columns="[
              { key: 'name', label: 'Name' },
              { key: 'email', label: 'Email' },
              { key: 'joined', label: 'Joined' },
              { key: 'actions', label: 'Actions' },
            ]">
              <template #name-data="{ row }">
                <span>{{ mockUsers.find(u => u.id === row.uid)?.name || row.uid }}</span>
              </template>
              <template #email-data="{ row }">
                <span>{{ mockUsers.find(u => u.id === row.uid)?.email || '-' }}</span>
              </template>
              <template #joined-data="{ row }">
                <span>{{ formatDate(mockUsers.find(u => u.id === row.uid)?.created_at || '') }}</span>
              </template>
              <template #actions-data="{ row }">
                <UButton size="xs" color="red" variant="soft" :disabled="row.uid === currentAdminId" @click="removeAdmin(row.uid)">Remove</UButton>
              </template>
            </UTable>
          </UCard>
        </div>

        <div class="col-span-1">
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="font-medium">Users</h3>
                <UButton size="xs" color="primary" @click="isAddUserOpen = true">Add User</UButton>
              </div>
            </template>
            <div class="overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead>
                  <tr class="text-left text-gray-500">
                    <th class="w-10"></th>
                    <th class="py-2">Name</th>
                    <th class="py-2">Email</th>
                    <th class="py-2">Joined</th>
                    <th class="py-2">Ref %</th>
                    <th class="py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="uid in usersInProject" :key="uid">
                    <tr class="border-t">
                      <td class="py-2">
                        <UButton size="xs" color="gray" variant="soft" @click="toggleExpand(uid)">
                          <UIcon :name="expandedUsers.has(uid) ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" />
                        </UButton>
                      </td>
                      <td class="py-2 font-medium">{{ mockUsers.find(u => u.id === uid)?.name || uid }}</td>
                      <td class="py-2">{{ mockUsers.find(u => u.id === uid)?.email || '-' }}</td>
                      <td class="py-2">{{ formatDate(userRefInfo[uid]?.joined_at || '') }}</td>
                      <td class="py-2">{{ userRefInfo[uid]?.ref_percentage }}%</td>
                      <td class="py-2 flex items-center gap-2">
                        <UButton size="xs" color="gray" @click="openEditRef(uid)">Edit Ref</UButton>
                        <UButton size="xs" color="red" variant="soft" @click="removeUser(uid)">Remove</UButton>
                      </td>
                    </tr>
                    <tr v-show="expandedUsers.has(uid)" class="bg-gray-50/40">
                      <td></td>
                      <td class="py-2" :colspan="5">
                        <UTable :rows="commissionsByUser[uid] || []" :columns="[
                          { key: 'date', label: 'Date' },
                          { key: 'description', label: 'Description' },
                          { key: 'value', label: 'Value' },
                          { key: 'status', label: 'Status' },
                          { key: 'actions', label: 'Actions' },
                        ]">
                          <template #date-data="{ row }">
                            <span>{{ formatDate(row.date) }}</span>
                          </template>
                          <template #status-data="{ row }">
                            <UBadge :label="row.status" :color="row.status === 'claimed' ? 'blue' : row.status === 'approved' ? 'green' : 'yellow'" variant="soft" />
                          </template>
                          <template #actions-data="{ row }">
                            <UButton v-if="row.status === 'requested'" size="xs" color="gray" @click="approveCommission(row)">Approve</UButton>
                            <span v-else class="text-xs text-gray-400">—</span>
                          </template>
                        </UTable>
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>
            <div v-if="!usersInProject.length" class="text-xs text-gray-500 py-2">No users</div>
          </UCard>
        </div>
      </div>

      <UModal v-model="isAddUserOpen">
        <UCard>
          <template #header>
            <h3 class="font-semibold">Add User</h3>
          </template>
          <div class="flex items-center gap-2">
            <USelect v-model="(manageState as any).addUser" :options="availableUserOptions" placeholder="Select user" />
            <UButton size="xs" color="gray" @click="() => { if (manageState.addUser && !usersInProject.includes(manageState.addUser)) { usersInProject.push(manageState.addUser); if (!userRefInfo[manageState.addUser]) userRefInfo[manageState.addUser] = { ref_percentage: 5, joined_at: new Date().toISOString() }; manageState.addUser = undefined } }">Add</UButton>
          </div>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton color="gray" variant="soft" @click="isAddUserOpen = false">Close</UButton>
            </div>
          </template>
        </UCard>
      </UModal>

      <UModal v-model="isAddAdminOpen">
        <UCard>
          <template #header>
            <h3 class="font-semibold">Add Admin</h3>
          </template>
          <div class="flex items-center gap-2">
            <USelect v-model="(manageState as any).addAdmin" :options="availableAdminOptions" placeholder="Select admin" />
            <UButton size="xs" color="gray" @click="() => { if (manageState.addAdmin && !adminsInProject.includes(manageState.addAdmin)) { adminsInProject.push(manageState.addAdmin); manageState.addAdmin = undefined } }">Add</UButton>
          </div>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton color="gray" variant="soft" @click="isAddAdminOpen = false">Close</UButton>
            </div>
          </template>
        </UCard>
      </UModal>
      

      <UModal v-model="isEditRefOpen">
        <UCard>
          <template #header>
            <h3 class="font-semibold">Edit Referral Percentage</h3>
          </template>
          <div class="space-y-4">
            <UFormGroup label="Ref %">
              <UInput v-model.number="(editRef as any).value" type="number" min="0" max="100" step="0.1" />
            </UFormGroup>
          </div>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton color="gray" variant="soft" @click="isEditRefOpen = false">Cancel</UButton>
              <UButton color="primary" :disabled="editRef.value == null" @click="saveEditRef">Save</UButton>
            </div>
          </template>
        </UCard>
      </UModal>
    </UCard>
  </div>
</template>

<style scoped></style>

