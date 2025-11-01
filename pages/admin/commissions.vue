<script setup lang="ts">
const { t } = useI18n()

definePageMeta({ middleware: ['auth','admin'] })
useSeoMeta({ title: 'Admin - Commissions' })

const supabase = useSupabaseClient()
const isLoading = ref(false)
const rows = ref<any[]>([])

// Format status display with capital first letter
const formatStatus = (status: string) => {
  const statusMap: Record<string, string> = {
    'requested': t('commissions.requested'),
    'approved': t('commissions.approved'),
    'claimed': t('commissions.claimed'),
  }
  const statusText = statusMap[status] || status
  return statusText.charAt(0).toUpperCase() + statusText.slice(1)
}

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
    .update({ status: row.status, value: row.value, original_value: row.original_value })
    .eq('id', row.id)
}

const approve = async (row: any) => {
  if (row.status !== 'requested') return
  
  // Get ref_percentage from user_project_info for this user and project
  const { data: refData, error: refError } = await supabase
    .from('user_project_info')
    .select('ref_percentage')
    .eq('user_id', row.user_id)
    .eq('project_id', row.project_id)
    .single()
  
  if (refError) {
    console.error('Error fetching ref_percentage:', refError)
    // Use 0 if not found
  }
  
  const refPercentage = refData?.ref_percentage || 0
  
  // Calculate new value: value * (ref_percentage / 100)
  // Get original value (if exists, use it; otherwise use current value)
  const currentOriginalValue = row.original_value != null ? Number(row.original_value || 0) : Number(row.value || 0)
  const approvedValue = currentOriginalValue * (refPercentage / 100)
  
  row.status = 'approved'
  row.value = approvedValue
  row.original_value = currentOriginalValue
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
          <UBadge :label="formatStatus(row.status || 'unknown')" :color="row.status === 'claimed' ? 'blue' : row.status === 'approved' ? 'green' : 'yellow'" variant="soft" />
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




