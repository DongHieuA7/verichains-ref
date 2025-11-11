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
  
  const commissionsList: any[] = userCommissions.value || []
  for (const c of commissionsList) {
    const value = Number(c.value || 0)
    
    result.totalVND += value
    if (c.status === 'confirmed') result.confirmedVND += value
    if (c.status === 'paid') result.paidVND += value
    if (c.status === 'requested') result.requestedVND += value
  }
  
  return result
})

// Helpers for commissions
const projectRefInfo = computed(() => Object.fromEntries(userProjects.value.map(p => [p.id, { ref_percentage: p.ref_percentage || 0 }])))

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
  
  const updateData: Record<string, any> = {
    status: 'confirmed',
    value: calculatedValue,
    original_value: commission.contract_amount != null ? commission.contract_amount : commission.original_value, // Store contract_amount as original_value
  }
  
  const { error } = await (supabase as any)
    .from('commissions')
    .update(updateData)
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
        <AdminUsersProfileCard :user-profile="userProfile" />

        <!-- Projects Joined -->
        <AdminUsersProjectsCard :projects="userProjects" />

        <!-- Commissions -->
        <AdminUsersCommissionsCard
          :commissions="userCommissions"
          :filtered-commissions="filteredCommissions"
          :projects-map="projectsMap"
          :project-ref-info="projectRefInfo"
          :totals="totals"
          v-model:selected-year="selectedYear"
          v-model:selected-month="selectedMonth"
          @confirm="confirmCommission"
        />
      </div>
    </UCard>
  </div>
</template>

<style scoped></style>

