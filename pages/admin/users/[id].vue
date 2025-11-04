<script setup lang="ts">
const { t } = useI18n()

definePageMeta({ middleware: ['auth','admin'] })
useSeoMeta({ title: t('users.userDetail') })

const route = useRoute()
const supabase = useSupabaseClient()
const userId = computed(() => route.params.id as string)

// Loading state
const isLoading = ref(false)

// User profile data
const userProfile = ref<any>(null)
const userProjects = ref<any[]>([])
const userCommissions = ref<any[]>([])

// Filter for commissions
const selectedYear = ref<number>(new Date().getFullYear())
const selectedMonth = ref<string>('')

// Fetch user profile
const fetchUserProfile = async () => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, email, name, company, descript, ref_code, created_at')
    .eq('id', userId.value)
    .single()
  
  if (error || !data) {
    return
  }
  
  userProfile.value = data
}

// Fetch user projects
const fetchUserProjects = async () => {
  const { data, error } = await supabase
    .from('user_project_info')
    .select('project_id, ref_percentage, created_at')
    .eq('user_id', userId.value)
  
  if (error) {
    return
  }
  
  if (!data || data.length === 0) {
    userProjects.value = []
    return
  }
  
  // Fetch project details including commission rate range
  const projectIds = data.map((r: any) => r.project_id)
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, name, commission_rate_min, commission_rate_max')
    .in('id', projectIds)
  
  if (projectsError) {
    userProjects.value = []
    return
  }
  
  // Combine project info with user_project_info
  userProjects.value = (projects || []).map((p: any) => {
    const info = data.find((r: any) => r.project_id === p.id)
    return {
      ...p,
      ref_percentage: info?.ref_percentage || 0,
      joined_at: info?.created_at || '',
    }
  })
}

// Fetch user commissions
const fetchUserCommissions = async () => {
  const { data, error } = await supabase
    .from('commissions')
    .select('id, project_id, client_name, description, date, status, value, original_value, currency, contract_amount, commission_rate')
    .eq('user_id', userId.value)
    .order('date', { ascending: false })
  
  if (error) {
    return
  }
  
  userCommissions.value = data || []
}

// Fetch project names for commissions
const projectsMap = ref<Record<string, string>>({})

const fetchProjectsMap = async () => {
  if (userCommissions.value.length === 0) return
  
  const projectIds = Array.from(new Set(userCommissions.value.map(c => c.project_id)))
  const { data, error } = await supabase
    .from('projects')
    .select('id, name')
    .in('id', projectIds)
  
  if (error) {
    return
  }
  
  const map: Record<string, string> = {}
  for (const p of data || []) {
    map[p.id] = p.name
  }
  projectsMap.value = map
}


// Format functions
const { formatDate, formatValue, formatStatus } = useCommissionFormatters()

// Year and month filters
const { yearOptions, monthOptions } = useDateFilters(selectedYear, selectedMonth)

const filteredCommissions = computed(() => {
  const byYear = userCommissions.value.filter(c => (c.date || '').slice(0,4) === String(selectedYear.value))
  if (!selectedMonth.value) return byYear
  return byYear.filter(c => (c.date || '').slice(0,7) === selectedMonth.value)
})

// Statistics
const totals = computed(() => {
  const result = {
    totalVND: 0,
    confirmedVND: 0,
    paidVND: 0,
    requestedVND: 0,
  }
  
  for (const c of userCommissions.value) {
    const value = Number(c.value || 0)
    
    result.totalVND += value
    if (c.status === 'confirmed') result.confirmedVND += value
    if (c.status === 'paid') result.paidVND += value
    if (c.status === 'requested') result.requestedVND += value
  }
  
  return result
})

// Helpers for commissions table (inline table replacing component)
const projectRefInfo = computed(() => Object.fromEntries(userProjects.value.map(p => [p.id, { ref_percentage: p.ref_percentage || 0 }])))

const getOriginalValueDisplay = (commission: any) => {
  return commission.contract_amount != null ? commission.contract_amount : (commission.original_value != null ? commission.original_value : commission.value)
}

const getCommissionReceivedDisplay = (commission: any) => {
  if (commission.status === 'confirmed' || commission.status === 'paid') {
    return commission.value
  }
  if (commission.contract_amount != null && commission.commission_rate != null) {
    return Number(commission.contract_amount || 0) * (Number(commission.commission_rate || 0) / 100)
  }
  const refInfo = projectRefInfo.value[commission.project_id]
  const refPercentage = refInfo?.ref_percentage || 0
  if (refPercentage > 0) {
    const originalValue = commission.original_value != null ? commission.original_value : commission.value
    return originalValue * (refPercentage / 100)
  }
  return commission.value
}

const getProjectName = (projectId?: string) => {
  if (!projectId) return '—'
  return projectsMap.value[projectId] || projectId
}

const getStatusColor = (status: string) => {
  if (status === 'paid') return 'green'
  if (status === 'confirmed') return 'blue'
  return 'yellow'
}

// Confirm commission
const confirmCommission = async (commission: any) => {
  if (commission.status !== 'requested') return
  
  // Calculate commission amount from contract_amount and commission_rate (never use existing value)
  let calculatedValue = 0
  if (commission.contract_amount != null && commission.commission_rate != null) {
    calculatedValue = Number(commission.contract_amount || 0) * (Number(commission.commission_rate || 0) / 100)
  } else {
    // Fallback: Get ref_percentage from user_project_info
    const { data: refData, error: refError } = await supabase
      .from('user_project_info')
      .select('ref_percentage')
      .eq('user_id', userId.value)
      .eq('project_id', commission.project_id)
      .single()
    
    if (refError) {
      // Use 0 if not found
    }
    
    const refPercentage = refData?.ref_percentage || 0
    
    // Use original_value only (never use existing value for calculation)
    const currentOriginalValue = commission.original_value != null ? Number(commission.original_value || 0) : (commission.contract_amount != null ? Number(commission.contract_amount || 0) : 0)
    calculatedValue = currentOriginalValue * (refPercentage / 100)
  }
  
  const { error } = await supabase
    .from('commissions')
    .update({ 
      status: 'confirmed',
      value: calculatedValue,
      original_value: commission.contract_amount != null ? commission.contract_amount : commission.original_value // Store contract_amount as original_value
    })
    .eq('id', commission.id)
  
  if (error) {
    return
  }
  
  await fetchUserCommissions()
}

onMounted(async () => {
  isLoading.value = true
  try {
    await Promise.all([
      fetchUserProfile(),
      fetchUserProjects(),
      fetchUserCommissions(),
    ])
    await fetchProjectsMap()
    
    // Set default month/year
    const now = new Date()
    selectedYear.value = now.getFullYear()
    selectedMonth.value = `${selectedYear.value}-${String(now.getMonth() + 1).padStart(2, '0')}`
  } finally {
    isLoading.value = false
  }
})

// Watch for commissions changes to update projects map
watch(userCommissions, () => {
  fetchProjectsMap()
}, { immediate: true })
</script>

<template>
  <div class="container mx-auto">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <NuxtLink class="text-sm text-gray-500 hover:underline" to="/admin/users">← {{ $t('common.back') }}</NuxtLink>
            <h2 class="font-semibold">{{ $t('users.userDetail') }} - {{ userProfile?.name || userProfile?.email || userId }}</h2>
          </div>
        </div>
      </template>

      <div v-if="isLoading" class="flex items-center justify-center py-12">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-gray-400" />
        <span class="ml-3 text-gray-500">{{ $t('common.loading') || 'Loading...' }}</span>
      </div>

      <div v-else class="grid grid-cols-1 gap-6">
        <!-- User Info -->
        <UCard>
          <template #header>
            <h3 class="font-medium">{{ $t('users.userProfile') }}</h3>
          </template>
          <div class="space-y-2 text-sm" v-if="userProfile">
            <div><span class="text-gray-500 dark:text-gray-400">{{ $t('common.name') }}:</span> <span class="font-medium text-gray-900 dark:text-white">{{ userProfile.name || '—' }}</span></div>
            <div><span class="text-gray-500 dark:text-gray-400">{{ $t('common.email') }}:</span> <span class="font-medium text-gray-900 dark:text-white">{{ userProfile.email }}</span></div>
            <div><span class="text-gray-500 dark:text-gray-400">{{ $t('profile.company') }}:</span> <span class="font-medium text-gray-900 dark:text-white">{{ userProfile.company || '—' }}</span></div>
            <div><span class="text-gray-500 dark:text-gray-400">{{ $t('profile.about') }}:</span> <span class="font-medium text-gray-900 dark:text-white">{{ userProfile.descript || '—' }}</span></div>
            <div>
              <span class="text-gray-500 dark:text-gray-400">{{ $t('profile.referralCode') }}:</span>
              <UBadge color="primary" variant="soft" :label="userProfile.ref_code" />
            </div>
            <div><span class="text-gray-500 dark:text-gray-400">{{ $t('projects.created') }}:</span> <span class="font-medium text-gray-900 dark:text-white">{{ formatDate(userProfile.created_at) }}</span></div>
          </div>
        </UCard>

        <!-- Projects Joined -->
        <UCard>
          <template #header>
            <h3 class="font-medium">{{ $t('commissions.projectsJoined') }}</h3>
          </template>
          <UTable :rows="userProjects" :columns="[
            { key: 'name', label: $t('common.name') },
            { key: 'commission_rate', label: $t('projects.refPercentage') },
            { key: 'joined_at', label: $t('projects.joinedRequested') },
          ]">
            <template #name-data="{ row }">
              <span class="text-gray-900 dark:text-white">{{ row.name }}</span>
            </template>
            <template #joined_at-data="{ row }">
              <span class="text-gray-900 dark:text-white">{{ formatDate(row.joined_at) }}</span>
            </template>
            <template #commission_rate-data="{ row }">
              <span v-if="row.commission_rate_min != null || row.commission_rate_max != null" class="text-gray-900 dark:text-white">
                <template v-if="row.commission_rate_min != null && row.commission_rate_max != null">
                  {{ row.commission_rate_min }}% - {{ row.commission_rate_max }}%
                </template>
                <template v-else>
                  {{ (row.commission_rate_min ?? row.commission_rate_max) }}%
                </template>
              </span>
              <span v-else class="text-gray-400 dark:text-gray-500">—</span>
            </template>
            <template #empty>
              <div class="text-sm text-gray-500 py-4 text-center">
                {{ $t('projects.noProjectsAvailable') }}
              </div>
            </template>
          </UTable>
        </UCard>

        <!-- Commissions -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-medium">{{ $t('users.userCommissions') }}</h3>
              <div class="flex items-center gap-3">
                <span class="text-sm text-gray-500">{{ $t('common.filter') }}</span>
                <USelect v-model="selectedYear" :options="yearOptions" />
                <USelect v-model="selectedMonth" :options="monthOptions" />
              </div>
            </div>
          </template>

          <!-- Statistics -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatisticsCard
              :title="$t('commissions.totalReceived')"
              icon="i-lucide-badge-dollar-sign"
              icon-color="green"
              :value-VND="totals.paidVND"
            />
            <StatisticsCard
              :title="$t('commissions.pendingCommission')"
              icon="i-lucide-hourglass"
              icon-color="orange"
              :value-VND="totals.confirmedVND"
            />
            <StatisticsCard
              :title="$t('commissions.requested')"
              icon="i-lucide-clock"
              icon-color="yellow"
              :value-VND="totals.requestedVND"
            />
          </div>

          <!-- Commissions Table (inline) -->
          <UTable 
            :rows="filteredCommissions" 
            :columns="[
              { key: 'date', label: $t('common.date') },
              { key: 'project_id', label: $t('common.project') },
              { key: 'client_name', label: $t('commissions.clientName') },
              { key: 'description', label: $t('common.description') },
              { key: 'value', label: $t('commissions.contractAmount') },
              { key: 'commission_rate', label: $t('commissions.commissionRate') },
              { key: 'commission_received', label: $t('commissions.commissionAmount') },
              { key: 'status', label: $t('common.status') },
              { key: 'actions', label: $t('common.actions') },
            ]"
          >
            <template #date-data="{ row }">
              <span class="text-gray-900 dark:text-white">{{ formatDate(row.date) }}</span>
            </template>
            <template #project_id-data="{ row }">
              <NuxtLink 
                v-if="row.project_id"
                class="text-gray-900 dark:text-primary font-bold dark:font-medium hover:underline hover:text-primary" 
                :to="`/admin/projects/${row.project_id}`"
              >
                {{ getProjectName(row.project_id) }}
              </NuxtLink>
              <span v-else>—</span>
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
            <template #actions-data="{ row }">
              <div class="flex gap-2">
                <UButton 
                  v-if="row.status === 'requested'"
                  size="xs" 
                  color="green" 
                  variant="soft"
                  @click="confirmCommission(row)"
                >
                  {{ $t('projects.approve') }}
                </UButton>
                <span v-else class="text-xs text-gray-400 dark:text-gray-500">—</span>
              </div>
            </template>
            <template #empty>
              <div class="text-sm text-gray-500 py-8 text-center">
                {{ $t('commissions.noCommissions') }}
              </div>
            </template>
          </UTable>
        </UCard>
      </div>
    </UCard>
  </div>
</template>

<style scoped></style>

