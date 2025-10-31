<script setup lang="ts">
definePageMeta({ middleware: ['auth','admin'] })
useSeoMeta({ title: 'Admin - Commissions' })

const supabase = useSupabaseClient()
const isLoading = ref(false)
const rows = ref<any[]>([])

const fetchAll = async () => {
  const { data } = await supabase
    .from('commissions')
    .select('id, user_id, project_id, description, date, status, value')
    .order('date', { ascending: false })
  rows.value = data || []
}

onMounted(fetchAll)

const statuses = ['requested','approved','claimed']

const save = async (row: any) => {
  await supabase
    .from('commissions')
    .update({ status: row.status, value: row.value })
    .eq('id', row.id)
}

const approve = async (row: any) => {
  if (row.status !== 'requested') return
  row.status = 'approved'
  await save(row)
}
</script>

<template>
  <div class="container mx-auto py-6">
    <UCard>
      <template #header>
        <h2 class="font-semibold">All Commissions</h2>
      </template>
      <UTable :rows="rows" :columns="[
        { key: 'date', label: 'Date' },
        { key: 'user_id', label: 'User' },
        { key: 'project_id', label: 'Project' },
        { key: 'description', label: 'Description' },
        { key: 'value', label: 'Value' },
        { key: 'status', label: 'Status' },
        { key: 'actions', label: 'Actions' },
      ]">
        <template #value-data="{ row }">
          <UInput v-model.number="row.value" type="number" step="0.01" @blur="save(row)" />
        </template>
        <template #status-data="{ row }">
          <UBadge :label="row.status" :color="row.status === 'claimed' ? 'blue' : row.status === 'approved' ? 'green' : 'yellow'" variant="soft" />
        </template>
        <template #actions-data="{ row }">
          <UButton v-if="row.status === 'requested'" size="xs" color="gray" @click="approve(row)">Approve</UButton>
          <span v-else class="text-xs text-gray-400">—</span>
        </template>
      </UTable>
    </UCard>
  </div>
</template>

<style scoped></style>




