<script setup lang="ts">
const { t } = useI18n()

definePageMeta({ middleware: ['auth','admin'] })
useSeoMeta({ title: t('users.userDetail') })

const route = useRoute()
const supabase = useSupabaseClient()
const userId = computed(() => route.params.id as string)

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
    console.error('Error fetching user profile:', error)
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
    console.error('Error fetching user projects:', error)
    return
  }
  
  if (!data || data.length === 0) {
    userProjects.value = []
    return
  }
  
  // Fetch project details
  const projectIds = data.map((r: any) => r.project_id)
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, name')
    .in('id', projectIds)
  
  if (projectsError) {
    console.error('Error fetching projects:', projectsError)
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
    console.error('Error fetching commissions:', error)
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
    console.error('Error fetching projects map:', error)
    return
  }
  
  const map: Record<string, string> = {}
  for (const p of data || []) {
    map[p.id] = p.name
  }
  projectsMap.value = map
}

const getProjectName = (projectId: string) => {
  return projectsMap.value[projectId] || projectId
}

// Format functions
const formatDate = (input: string) => {
  const d = new Date(input)
  if (isNaN(d.getTime())) return input
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

const formatValue = (value: number | string | null | undefined, currency: string = 'USD') => {
  if (value == null || value === '' || value === undefined) return '—'
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(numValue)) return '—'
  
  const currencySymbol = currency === 'VND' ? '₫' : '$'
  const locale = currency === 'VND' ? 'vi-VN' : 'en-US'
  const formatted = numValue.toLocaleString(locale, { 
    minimumFractionDigits: 0,
    maximumFractionDigits: 0 
  })
  
  return currency === 'VND' ? `${formatted} ${currencySymbol}` : `${currencySymbol}${formatted}`
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

// Get original value for display
const getOriginalValueDisplay = (commission: any) => {
  return commission.original_value != null ? commission.original_value : commission.value
}

// Calculate commission received for display
const getCommissionReceivedDisplay = (commission: any) => {
  if (commission.status === 'approved' || commission.status === 'claimed') {
    return commission.value
  }
  // For requested status, calculate based on ref_percentage from userProjects
  const project = userProjects.value.find(p => p.id === commission.project_id)
  const refPercentage = project?.ref_percentage || 0
  const originalValue = commission.original_value != null ? commission.original_value : commission.value
  return originalValue * (refPercentage / 100)
}

// Year and month filters
const yearOptions = computed(() => {
  const current = new Date().getFullYear()
  const years: { label: string, value: number }[] = []
  for (let y = current; y >= current - 4; y--) {
    years.push({ label: String(y), value: y })
  }
  return years
})

const monthOptions = computed(() => {
  const { t } = useI18n()
  const options: { label: string, value: string }[] = [
    { label: t('commissions.allMonths'), value: '' }
  ]
  for (let m = 1; m <= 12; m++) {
    const value = `${selectedYear.value}-${String(m).padStart(2,'0')}`
    const label = new Date(`${selectedYear.value}-${String(m).padStart(2,'0')}-01`).toLocaleString(undefined, { month: 'long'})
    options.push({ label, value })
  }
  return options
})

const filteredCommissions = computed(() => {
  const byYear = userCommissions.value.filter(c => (c.date || '').slice(0,4) === String(selectedYear.value))
  if (!selectedMonth.value) return byYear
  return byYear.filter(c => (c.date || '').slice(0,7) === selectedMonth.value)
})

// Statistics
const totals = computed(() => {
  const result = {
    totalUSD: 0,
    totalVND: 0,
    approvedUSD: 0,
    approvedVND: 0,
    claimedUSD: 0,
    claimedVND: 0,
  }
  
  for (const c of userCommissions.value) {
    const currency = c.currency || 'USD'
    const value = Number(c.value || 0)
    
    if (currency === 'VND') {
      result.totalVND += value
      if (c.status === 'approved') result.approvedVND += value
      if (c.status === 'claimed') result.claimedVND += value
    } else {
      result.totalUSD += value
      if (c.status === 'approved') result.approvedUSD += value
      if (c.status === 'claimed') result.claimedUSD += value
    }
  }
  
  return result
})

// Approve commission
const approveCommission = async (commission: any) => {
  if (commission.status !== 'requested') return
  
  // Get ref_percentage from user_project_info for this user and project
  const { data: refData, error: refError } = await supabase
    .from('user_project_info')
    .select('ref_percentage')
    .eq('user_id', userId.value)
    .eq('project_id', commission.project_id)
    .single()
  
  if (refError) {
    console.error('Error fetching ref_percentage:', refError)
    // Use 0 if not found
  }
  
  const refPercentage = refData?.ref_percentage || 0
  
  // Calculate new value: value * (ref_percentage / 100)
  // Get original value (if exists, use it; otherwise use current value)
  const currentOriginalValue = commission.original_value != null ? Number(commission.original_value || 0) : Number(commission.value || 0)
  const approvedValue = currentOriginalValue * (refPercentage / 100)
  
  const { error } = await supabase
    .from('commissions')
    .update({ 
      status: 'approved',
      value: approvedValue,
      original_value: currentOriginalValue // Ensure original_value is stored
    })
    .eq('id', commission.id)
  
  if (error) {
    console.error('Error approving commission:', error)
    return
  }
  
  await fetchUserCommissions()
}

onMounted(async () => {
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

      <div class="grid grid-cols-1 gap-6">
        <!-- User Info -->
        <UCard>
          <template #header>
            <h3 class="font-medium">{{ $t('users.userProfile') }}</h3>
          </template>
          <div class="space-y-2 text-sm" v-if="userProfile">
            <div><span class="text-gray-500">{{ $t('common.name') }}:</span> <span class="font-medium">{{ userProfile.name || '—' }}</span></div>
            <div><span class="text-gray-500">{{ $t('common.email') }}:</span> <span class="font-medium">{{ userProfile.email }}</span></div>
            <div><span class="text-gray-500">{{ $t('profile.company') }}:</span> <span class="font-medium">{{ userProfile.company || '—' }}</span></div>
            <div><span class="text-gray-500">{{ $t('profile.about') }}:</span> <span class="font-medium">{{ userProfile.descript || '—' }}</span></div>
            <div>
              <span class="text-gray-500">{{ $t('profile.referralCode') }}:</span>
              <UBadge color="primary" variant="soft" :label="userProfile.ref_code" />
            </div>
            <div><span class="text-gray-500">{{ $t('projects.created') }}:</span> <span class="font-medium">{{ formatDate(userProfile.created_at) }}</span></div>
          </div>
        </UCard>

        <!-- Projects Joined -->
        <UCard>
          <template #header>
            <h3 class="font-medium">{{ $t('commissions.projectsJoined') }}</h3>
          </template>
          <div v-if="userProjects.length === 0" class="text-sm text-gray-500 py-4 text-center">
            {{ $t('projects.noProjectsAvailable') }}
          </div>
          <UTable v-else :rows="userProjects" :columns="[
            { key: 'name', label: $t('common.name') },
            { key: 'ref_percentage', label: $t('projects.refPercentage') },
            { key: 'joined_at', label: $t('projects.joinedRequested') },
          ]">
            <template #joined_at-data="{ row }">
              <span>{{ formatDate(row.joined_at) }}</span>
            </template>
            <template #ref_percentage-data="{ row }">
              <span>{{ row.ref_percentage }}%</span>
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
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <UCard class="border border-gray-200 hover:shadow-md transition-shadow">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-3 mb-3">
                    <div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <UIcon name="i-lucide-badge-dollar-sign" class="w-5 h-5 text-green-600" />
                    </div>
                    <span class="text-sm font-medium text-gray-600">{{ $t('commissions.totalReceived') }}</span>
                  </div>
                  <div class="space-y-1">
                    <template v-if="totals.claimedUSD > 0">
                      <div class="text-3xl font-bold text-gray-900">{{ formatValue(totals.claimedUSD, 'USD') }}</div>
                      <div v-if="totals.claimedVND > 0" class="text-base font-medium text-gray-500">{{ formatValue(totals.claimedVND, 'VND') }}</div>
                    </template>
                    <template v-else-if="totals.claimedVND > 0">
                      <div class="text-3xl font-bold text-gray-900">{{ formatValue(totals.claimedVND, 'VND') }}</div>
                    </template>
                    <template v-else>
                      <div class="text-3xl font-bold text-gray-400">—</div>
                    </template>
                  </div>
                </div>
              </div>
            </UCard>
            <UCard class="border border-gray-200 hover:shadow-md transition-shadow">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-3 mb-3">
                    <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <UIcon name="i-lucide-check-circle" class="w-5 h-5 text-blue-600" />
                    </div>
                    <span class="text-sm font-medium text-gray-600">{{ $t('commissions.totalClaimed') }}</span>
                  </div>
                  <div class="space-y-1">
                    <template v-if="totals.claimedUSD > 0">
                      <div class="text-3xl font-bold text-gray-900">{{ formatValue(totals.claimedUSD, 'USD') }}</div>
                      <div v-if="totals.claimedVND > 0" class="text-base font-medium text-gray-500">{{ formatValue(totals.claimedVND, 'VND') }}</div>
                    </template>
                    <template v-else-if="totals.claimedVND > 0">
                      <div class="text-3xl font-bold text-gray-900">{{ formatValue(totals.claimedVND, 'VND') }}</div>
                    </template>
                    <template v-else>
                      <div class="text-3xl font-bold text-gray-400">—</div>
                    </template>
                  </div>
                </div>
              </div>
            </UCard>
          </div>

          <!-- Commissions Table -->
          <div v-if="filteredCommissions.length === 0" class="text-sm text-gray-500 py-4 text-center">
            {{ $t('commissions.noCommissions') }}
          </div>
          <UTable v-else :rows="filteredCommissions" :columns="[
            { key: 'date', label: $t('common.date') },
            { key: 'project_id', label: $t('common.project') },
            { key: 'client_name', label: $t('commissions.clientName') },
            { key: 'description', label: $t('common.description') },
            { key: 'value', label: $t('commissions.contractAmount') },
            { key: 'commission_rate', label: $t('commissions.commissionRate') },
            { key: 'commission_received', label: $t('commissions.commissionAmount') },
            { key: 'status', label: $t('common.status') },
            { key: 'actions', label: $t('common.actions') },
          ]">
            <template #date-data="{ row }">
              <span>{{ formatDate(row.date) }}</span>
            </template>
            <template #project_id-data="{ row }">
              <span>{{ getProjectName(row.project_id) }}</span>
            </template>
            <template #client_name-data="{ row }">
              <span>{{ row.client_name || '—' }}</span>
            </template>
            <template #value-data="{ row }">
              <span>{{ formatValue(getOriginalValueDisplay(row), row.currency) }}</span>
            </template>
            <template #commission_rate-data="{ row }">
              <span>{{ row.commission_rate != null ? `${row.commission_rate}%` : '—' }}</span>
            </template>
            <template #commission_received-data="{ row }">
              <span>{{ formatValue(getCommissionReceivedDisplay(row), row.currency) }}</span>
            </template>
            <template #status-data="{ row }">
              <UBadge :label="formatStatus(row.status || 'unknown')" :color="statusColor(row.status)" variant="soft" />
            </template>
            <template #actions-data="{ row }">
              <UButton 
                v-if="row.status === 'requested'" 
                size="xs" 
                color="primary" 
                @click="approveCommission(row)"
              >
                {{ $t('projects.approve') }}
              </UButton>
              <span v-else class="text-xs text-gray-400">—</span>
            </template>
          </UTable>
        </UCard>
      </div>
    </UCard>
  </div>
</template>

<style scoped></style>

