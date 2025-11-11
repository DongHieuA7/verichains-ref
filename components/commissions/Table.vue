<script setup lang="ts">
const { t } = useI18n()
const { formatDate, formatValue, formatStatus } = useCommissionFormatters()

type Commission = {
  id: string
  user_id?: string
  project_id?: string
  client_name?: string | null
  description?: string | null
  date: string
  status: 'requested' | 'confirmed' | 'paid'
  value: number
  original_value?: number | null
  currency?: string
  contract_amount?: number | null
  commission_rate?: number | null
}

interface Props {
  commissions: Commission[]
  showProject?: boolean
  showUser?: boolean
  canEdit?: boolean
  canApprove?: boolean
  userRefInfo?: Record<string, { ref_percentage: number }>
  projectRefInfo?: Record<string, { ref_percentage: number }>
  projectsMap?: Record<string, string>
  usersMap?: Record<string, { name?: string | null; email: string }>
  loading?: boolean
}

interface Emits {
  (e: 'edit', commission: Commission): void
  (e: 'approve', commission: Commission): void
}

const props = withDefaults(defineProps<Props>(), {
  commissions: () => [],
  showProject: false,
  showUser: false,
  canEdit: false,
  canApprove: false,
  userRefInfo: () => ({}),
  projectRefInfo: () => ({}),
  projectsMap: () => ({}),
  usersMap: () => ({}),
  loading: false,
})

// Ensure commissions is always an array
const commissionsArray = computed(() => {
  if (!props.commissions) return []
  if (Array.isArray(props.commissions)) return props.commissions
  return []
})

const emit = defineEmits<Emits>()

const getOriginalValueDisplay = (commission: Commission) => {
  return commission.contract_amount != null ? commission.contract_amount : (commission.original_value != null ? commission.original_value : commission.value)
}

const getCommissionReceivedDisplay = (commission: Commission) => {
  // If status is confirmed or paid, use the stored value
  if (commission.status === 'confirmed' || commission.status === 'paid') {
    return commission.value
  }
  
  // For requested status: calculate
  if (commission.contract_amount != null && commission.commission_rate != null) {
    return Number(commission.contract_amount || 0) * (Number(commission.commission_rate || 0) / 100)
  }
  
  // Fallback: calculate based on ref_percentage
  // Try userRefInfo first (for admin views), then projectRefInfo (for user views)
  let refPercentage = 0
  if (commission.user_id && props.userRefInfo[commission.user_id]) {
    const refInfo = props.userRefInfo[commission.user_id]
    refPercentage = refInfo?.ref_percentage || 0
  } else if (commission.project_id && props.projectRefInfo[commission.project_id]) {
    const refInfo = props.projectRefInfo[commission.project_id]
    refPercentage = refInfo?.ref_percentage || 0
  }
  
  if (refPercentage > 0) {
    const originalValue = commission.original_value != null ? commission.original_value : commission.value
    return originalValue * (refPercentage / 100)
  }
  
  return commission.value
}

const getStatusColor = (status: string) => {
  if (status === 'paid') return 'green'
  if (status === 'confirmed') return 'blue'
  return 'yellow'
}

const getProjectName = (projectId?: string) => {
  if (!projectId) return '—'
  return props.projectsMap[projectId] || projectId
}

const getUserName = (userId?: string) => {
  if (!userId) return '—'
  const user = props.usersMap[userId]
  return user ? (user.name || user.email) : userId
}

const columns = computed(() => {
  const cols = [
    { key: 'date', label: t('common.date') },
  ]
  
  if (props.showUser) {
    cols.push({ key: 'user_id', label: t('common.user') })
  }
  
  if (props.showProject) {
    cols.push({ key: 'project_id', label: t('common.project') })
  }
  
  cols.push(
    { key: 'client_name', label: t('commissions.clientName') },
    { key: 'description', label: t('common.description') },
    { key: 'value', label: t('commissions.contractAmount') },
    { key: 'commission_rate', label: t('commissions.commissionRate') },
    { key: 'commission_received', label: t('commissions.commissionAmount') },
    { key: 'status', label: t('common.status') },
  )
  
  if (props.canEdit || props.canApprove) {
    cols.push({ key: 'actions', label: t('common.actions') })
  }
  
  return cols
})

const emptyState = computed(() => ({
  icon: 'i-lucide-inbox',
  label: t('commissions.noCommissions')
}))
</script>

<template>
  <div class="w-full min-h-[200px]">
    <!-- Debug info -->
    <div v-if="false" class="text-xs text-gray-400 mb-2">
      Debug: loading={{ props.loading }}, commissions.length={{ commissionsArray.length }}, isArray={{ Array.isArray(props.commissions) }}
    </div>
    
    <div v-if="props.loading" class="flex items-center justify-center py-8">
      <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin text-gray-400" />
      <span class="ml-2 text-gray-500">{{ $t('common.loading') || 'Loading...' }}</span>
    </div>
    <div v-else class="w-full overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
      <UTable 
        :rows="commissionsArray.length > 0 ? commissionsArray : []" 
        :columns="columns"
        class="w-full"
        :ui="{ wrapper: 'w-full overflow-x-auto' }"
        :empty-state="emptyState"
      >
    <template #date-data="{ row }">
      <span class="text-gray-900 dark:text-white">{{ formatDate(row.date) }}</span>
    </template>
    
    <template v-if="props.showUser" #user_id-data="{ row }">
      <NuxtLink 
        v-if="row.user_id"
        class="text-primary dark:text-primary font-bold hover:underline" 
        :to="`/admin/users/${row.user_id}`"
      >
        {{ getUserName(row.user_id) }}
      </NuxtLink>
      <span v-else class="text-gray-400 dark:text-gray-500">—</span>
    </template>
    
    <template v-if="props.showProject" #project_id-data="{ row }">
      <NuxtLink 
        v-if="row.project_id"
        class="text-primary dark:text-primary font-bold hover:underline" 
        :to="`/admin/projects/${row.project_id}`"
      >
        {{ getProjectName(row.project_id) }}
      </NuxtLink>
      <span v-else class="text-gray-400 dark:text-gray-500">—</span>
    </template>
    
    <template #client_name-data="{ row }">
      <span class="text-gray-900 dark:text-white">{{ row.client_name || '—' }}</span>
    </template>
    
    <template #description-data="{ row }">
      <span class="text-gray-900 dark:text-white">{{ row.description || '—' }}</span>
    </template>
    
    <template #value-data="{ row }">
      <span class="text-gray-900 dark:text-white">{{ formatValue(getOriginalValueDisplay(row), row.currency || 'VND') }}</span>
    </template>
    
    <template #commission_rate-data="{ row }">
      <span class="text-gray-900 dark:text-white">{{ row.commission_rate != null ? `${row.commission_rate}%` : '—' }}</span>
    </template>
    
    <template #commission_received-data="{ row }">
      <span class="text-gray-900 dark:text-white">{{ formatValue(getCommissionReceivedDisplay(row), row.currency || 'VND') }}</span>
    </template>
    
    <template #status-data="{ row }">
      <UBadge 
        :label="formatStatus(row.status || 'unknown')" 
        :color="getStatusColor(row.status)" 
        variant="soft" 
      />
    </template>
    
    <template v-if="props.canEdit || props.canApprove" #actions-data="{ row }">
      <div class="flex gap-2">
        <ActionButton
          v-if="props.canEdit && row.status !== 'paid'"
          type="edit"
          @click="emit('edit', row)"
        />
        <ActionButton
          v-if="props.canApprove && row.status === 'requested'"
          type="approve"
          @click="emit('approve', row)"
        />
        <span v-if="!props.canEdit && !props.canApprove" class="text-xs text-gray-400">—</span>
      </div>
    </template>
    
    </UTable>
    </div>
  </div>
</template>

