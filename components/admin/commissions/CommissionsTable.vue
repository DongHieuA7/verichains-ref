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
}

interface Emits {
  (e: 'edit', commission: Commission): void
  (e: 'approve', commission: Commission): void
}

const props = withDefaults(defineProps<Props>(), {
  showProject: false,
  showUser: false,
  canEdit: false,
  canApprove: false,
  userRefInfo: () => ({}),
  projectRefInfo: () => ({}),
  projectsMap: () => ({}),
  usersMap: () => ({}),
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
</script>

<template>
  <div class="w-full overflow-x-auto" style="width: 100%; display: block; min-height: 200px;">
    <UTable :rows="props.commissions || []" :columns="columns" style="width: 100%; min-width: 100%;">
    <template #date-data="{ row }">
      <span>{{ formatDate(row.date) }}</span>
    </template>
    
    <template v-if="showUser" #user_id-data="{ row }">
      <NuxtLink 
        v-if="row.user_id"
        class="text-primary hover:underline" 
        :to="`/admin/users/${row.user_id}`"
      >
        {{ getUserName(row.user_id) }}
      </NuxtLink>
      <span v-else>—</span>
    </template>
    
    <template v-if="showProject" #project_id-data="{ row }">
      <NuxtLink 
        v-if="row.project_id"
        class="text-primary hover:underline" 
        :to="`/admin/projects/${row.project_id}`"
      >
        {{ getProjectName(row.project_id) }}
      </NuxtLink>
      <span v-else>—</span>
    </template>
    
    <template #client_name-data="{ row }">
      <span>{{ row.client_name || '—' }}</span>
    </template>
    
    <template #description-data="{ row }">
      <span>{{ row.description || '—' }}</span>
    </template>
    
    <template #value-data="{ row }">
      <span>{{ formatValue(getOriginalValueDisplay(row), row.currency || 'VND') }}</span>
    </template>
    
    <template #commission_rate-data="{ row }">
      <span>{{ row.commission_rate != null ? `${row.commission_rate}%` : '—' }}</span>
    </template>
    
    <template #commission_received-data="{ row }">
      <span>{{ formatValue(getCommissionReceivedDisplay(row), row.currency || 'VND') }}</span>
    </template>
    
    <template #status-data="{ row }">
      <UBadge 
        :label="formatStatus(row.status || 'unknown')" 
        :color="getStatusColor(row.status)" 
        variant="soft" 
      />
    </template>
    
    <template v-if="canEdit || canApprove" #actions-data="{ row }">
      <div class="flex gap-2">
        <UButton 
          v-if="canEdit"
          size="xs" 
          color="gray" 
          @click="emit('edit', row)"
        >
          {{ $t('common.edit') }}
        </UButton>
        <UButton 
          v-if="canApprove && row.status === 'requested'"
          size="xs" 
          color="green" 
          variant="soft"
          @click="emit('approve', row)"
        >
          {{ $t('projects.approve') }}
        </UButton>
        <span v-if="!canEdit && !canApprove" class="text-xs text-gray-400">—</span>
      </div>
    </template>
    
    <template #empty>
      <div class="text-sm text-gray-500 py-4 text-center">
        {{ $t('commissions.noCommissions') }}
      </div>
    </template>
  </UTable>
  </div>
</template>

