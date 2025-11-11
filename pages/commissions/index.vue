<script setup lang="ts">
const { t } = useI18n()

definePageMeta({ middleware: ['auth', 'user-only'] })
useSeoMeta({ title: t('commissions.myCommissionRequests') })

const supabase = useSupabaseClient()
const user = useSupabaseUser()

const isLoading = ref(false)
const isLoadingData = ref(false)
const commissions = ref<any[]>([])
const isModalOpen = ref(false)
const editDraft = reactive<{ 
  id?: string
  client_name?: string
  description?: string
  contract_amount?: number | null
}>({ 
  id: undefined, 
  client_name: '', 
  description: '', 
  contract_amount: null 
})
const isCreateOpen = ref(false)
const filters = reactive({
  project: '',
  status: '',
  year: '',
  month: '',
})

const form = reactive<{
  project_id?: string
  client_name?: string
  description?: string
  contract_amount?: number | null
}>({
  project_id: '',
  client_name: '',
  description: '',
  contract_amount: null,
})

const projects = ref<any[]>([])
// Store ref_percentage for each project
const projectRefPercentages = ref<Record<string, number>>({})


const fetchProjects = async () => {
  if (!user.value) return
  
  try {
    // Fetch only projects that the user has joined (from user_project_info)
    const { data: userProjects, error } = await supabase
    .from('user_project_info')
    .select('project_id, ref_percentage')
    .eq('user_id', user.value.id)
  
  if (error) {
    projects.value = []
    return
  }
  
  if (!userProjects || userProjects.length === 0) {
    projects.value = []
    return
  }
  
  // Remove duplicates (in case there are any)
  const uniqueProjectIds = Array.from(new Set(userProjects.map(up => up.project_id)))
  
  
  if (uniqueProjectIds.length === 0) {
    projects.value = []
    return
  }
  
  // Store ref_percentage for each project
  const percentages: Record<string, number> = {}
  for (const up of userProjects || []) {
    percentages[up.project_id] = Number(up.ref_percentage || 0)
  }
  projectRefPercentages.value = percentages
  
  // Fetch project details for joined projects
  const { data, error: projectsError } = await supabase
    .from('projects')
    .select('id, name')
    .in('id', uniqueProjectIds)
    .order('name')
  
  if (projectsError) {
    projects.value = []
    return
  }
  
  
    projects.value = data || []
  } catch (error) {
    projects.value = []
  }
}

const fetchCommissions = async () => {
  if (!user.value) {
    return
  }
  try {
    const { data, error } = await supabase
      .from('commissions')
      .select('id, project_id, client_name, description, date, status, value, original_value, currency, contract_amount, commission_rate')
      .eq('user_id', user.value.id)
      .order('date', { ascending: false })
    
    if (error) {
      commissions.value = []
      return
    }
    
    commissions.value = data || []
  } catch (error) {
    commissions.value = []
  }
}

onMounted(async () => {
  isLoadingData.value = true
  try {
    await Promise.all([fetchProjects(), fetchCommissions()])
    // Don't set default filters - show all commissions
  } finally {
    isLoadingData.value = false
  }
})

const filteredCommissions = computed(() => {
  if (!Array.isArray(commissions.value)) {
    return []
  }
  
  let filtered = commissions.value
  
  // Filter by year (if year is selected)
  if (filters.year) {
    filtered = filtered.filter(c => (c.date || '').slice(0,4) === String(filters.year))
  }
  
  // Filter by month
  if (filters.month) {
    filtered = filtered.filter(c => (c.date || '').slice(0,7) === filters.month)
  }
  
  // Filter by project
  if (filters.project) {
    filtered = filtered.filter(c => c.project_id === filters.project)
  }
  
  // Filter by status
  if (filters.status) {
    filtered = filtered.filter(c => c.status === filters.status)
  }
  
  return filtered
})

// Statistics cards configuration
const statisticsCards = computed(() => {
  const { t } = useI18n()
  return [
    {
      title: t('commissions.projectsJoined'),
      icon: 'i-lucide-folders',
      iconColor: 'blue',
      value: projectCount.value,
      gridCols: 'md:grid-cols-3'
    },
    {
      title: t('commissions.totalContractAmount'),
      icon: 'i-lucide-file-text',
      iconColor: 'blue',
      valueVND: totals.value.totalContractAmountVND,
      gridCols: 'md:grid-cols-3'
    },
    {
      title: t('commissions.pendingContractAmount'),
      icon: 'i-lucide-clock',
      iconColor: 'yellow',
      valueVND: totals.value.pendingContractAmountVND,
      gridCols: 'md:grid-cols-3'
    },
    {
      title: t('commissions.receivedCommission'),
      icon: 'i-lucide-badge-dollar-sign',
      iconColor: 'green',
      valueVND: totals.value.receivedCommissionVND,
      gridCols: 'md:grid-cols-2'
    },
    {
      title: t('commissions.pendingCommission'),
      icon: 'i-lucide-hourglass',
      iconColor: 'orange',
      valueVND: totals.value.pendingCommissionVND,
      gridCols: 'md:grid-cols-2'
    }
  ]
})

// Group cards by grid layout
const statisticsCardsByRow = computed(() => {
  const row1 = statisticsCards.value.slice(0, 3) // First 3 cards (3 columns)
  const row2 = statisticsCards.value.slice(3) // Last 2 cards (2 columns)
  return [
    { cards: row1, gridCols: 'md:grid-cols-3' },
    { cards: row2, gridCols: 'md:grid-cols-2' }
  ]
})

// Project filter options
const projectOptions = computed(() => {
  const { t } = useI18n()
  const options = [
    { label: t('common.all'), value: '' }
  ]
  for (const p of projects.value) {
    options.push({ label: p.name || p.id, value: p.id })
  }
  return options
})

// Status filter options
const statusOptions = computed(() => {
  const { t } = useI18n()
  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1)
  return [
    { label: t('common.all'), value: '' },
    { label: capitalize(t('commissions.requested')), value: 'requested' },
    { label: capitalize(t('commissions.confirmed')), value: 'confirmed' },
    { label: capitalize(t('commissions.paid')), value: 'paid' },
  ]
})

// Total statistics should show all commissions, not filtered ones
const totals = computed(() => {
  const list: any[] = commissions.value || []
  const result = {
    // Total Contract Amount: Sum all contract_amount
    totalContractAmountVND: 0,
    // Pending Contract Amount: Sum contract_amount of status = requested
    pendingContractAmountVND: 0,
    // Received Commission: Sum commission amount (value) of status = paid
    receivedCommissionVND: 0,
    // Pending Commission: Sum commission amount (value) of status = confirmed
    pendingCommissionVND: 0,
  }
  
  for (const c of list) {
    // Get contract amount (use contract_amount if exists, otherwise original_value, otherwise 0)
    const contractAmount = c.contract_amount != null ? Number(c.contract_amount || 0) : (c.original_value != null ? Number(c.original_value || 0) : 0)
    
    // Get commission amount (value)
    const commissionAmount = Number(c.value || 0)
    
    // Total Contract Amount - sum all
    result.totalContractAmountVND += contractAmount
    
    // Pending Contract Amount - status = requested
    if (c.status === 'requested') {
      result.pendingContractAmountVND += contractAmount
    }
    
    // Received Commission - status = paid
    if (c.status === 'paid') {
      result.receivedCommissionVND += commissionAmount
    }
    
    // Pending Commission - status = confirmed
    if (c.status === 'confirmed') {
      result.pendingCommissionVND += commissionAmount
    }
  }
  
  return result
})


// Project count should show all projects that user has joined (from user_project_info)
// This matches the dropdown options in "New Commission"
const projectCount = computed(() => projects.value.length)

const submit = async () => {
  try {
    isLoading.value = true
    if (!user.value) return
    const { error } = await supabase
      .from('commissions')
      .insert({
        user_id: user.value.id,
        project_id: form.project_id || null,
        client_name: form.client_name || null,
        description: form.description || null,
        contract_amount: form.contract_amount ?? null,
        value: 0, // Will be calculated by admin when setting commission_rate
        original_value: form.contract_amount ?? null, // Store contract amount as original value
        currency: 'VND',
        status: 'requested',
      } as any)
    if (error) {
      throw error // Re-throw to be caught by catch block
    }
    form.project_id = ''
    form.client_name = ''
    form.description = ''
    form.contract_amount = null
    isCreateOpen.value = false
    await fetchCommissions()
  } finally {
    isLoading.value = false
  }
}

const openEdit = (row: any) => {
  if (row.status === 'confirmed' || row.status === 'paid') return
  editDraft.id = row.id
  editDraft.client_name = row.client_name || ''
  editDraft.description = row.description || ''
  // Use contract_amount if exists, otherwise use original_value or value
  editDraft.contract_amount = row.contract_amount != null ? row.contract_amount : (row.original_value != null ? row.original_value : row.value)
  isModalOpen.value = true
}

// Computed draft for edit modal (only Draft fields, without id)
const editDraftForModal = computed<{
  client_name?: string
  description?: string
  contract_amount?: number | null
}>(() => ({
  client_name: editDraft.client_name,
  description: editDraft.description,
  contract_amount: editDraft.contract_amount,
}))

const saveEdit = async () => {
  if (!editDraft.id) return
  const idx = commissions.value.findIndex(c => c.id === editDraft.id)
  if (idx === -1) return
  // When editing requested commission, update contract_amount
  const updateData: Record<string, any> = {
    client_name: editDraft.client_name || null,
    description: editDraft.description || null, 
    contract_amount: editDraft.contract_amount ?? null,
    original_value: editDraft.contract_amount ?? null, // Store contract_amount as original_value
    currency: 'VND'
  }
  await (supabase as any).from('commissions').update(updateData).eq('id', editDraft.id)
  await fetchCommissions()
  isModalOpen.value = false
}

</script>

<template>
  <div>
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="font-semibold">{{ $t('commissions.myCommissionRequests') }}</h2>
          <ActionButton type="create" :label="$t('commissions.newCommission')" @click="isCreateOpen = true" />
        </div>
      </template>

      <div v-if="isLoadingData" class="flex items-center justify-center py-12">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-gray-400" />
        <span class="ml-3 text-gray-500">{{ $t('common.loading') || 'Loading...' }}</span>
      </div>

      <template v-else>
      <!-- Statistics Cards -->
      <div v-for="(row, rowIndex) in statisticsCardsByRow" :key="rowIndex" :class="['grid grid-cols-1 gap-4 mb-6', row.gridCols]">
        <StatisticsCard
          v-for="(card, cardIndex) in row.cards"
          :key="cardIndex"
          :title="card.title"
          :icon="card.icon"
          :icon-color="card.iconColor"
          :value="card.value"
          :value-VND="card.valueVND"
        />
      </div>

      <!-- Filters -->
      <div class="mb-4">
        <CommissionFilters
          v-model="filters"
          :show-project="true"
          :project-options="projectOptions"
          :show-status="true"
          :status-options="statusOptions"
          :show-year="true"
          :show-month="true"
          layout="inline"
        />
      </div>

      <!-- Commissions Table -->
      <CommissionsTable
        :commissions="filteredCommissions"
        :show-project="true"
        :can-edit="true"
        :project-ref-info="Object.fromEntries(Object.entries(projectRefPercentages).map(([k,v]) => [k, { ref_percentage: v }]))"
        :projects-map="Object.fromEntries(projects.map(p => [p.id, p.name || p.id]))"
        @edit="openEdit"
      />

      <CommissionsModal
        v-model="isModalOpen"
        :title="$t('commissions.editCommission')"
        :draft="editDraftForModal"
        :show-project="false"
        :show-status="false"
        :show-rate="false"
        confirm-type="save"
        @update:draft="val => {
          editDraft.client_name = val.client_name || ''
          editDraft.description = val.description || ''
          editDraft.contract_amount = val.contract_amount ?? null
        }"
        @cancel="() => { isModalOpen = false }"
        @confirm="saveEdit"
      />

      <CommissionsModal
        v-model="isCreateOpen"
        :title="$t('commissions.newCommission')"
        :draft="form"
        :show-project="true"
        :project-options="projects.map(p => ({ label: p.name || p.id, value: p.id }))"
        :show-status="false"
        :show-rate="false"
        confirm-type="create"
        :confirm-loading="isLoading"
        :confirm-disabled="isLoading || !form.project_id || !form.contract_amount"
        @update:draft="val => Object.assign(form, val)"
        @cancel="() => { isCreateOpen = false }"
        @confirm="submit"
      />
      </template>
    </UCard>
  </div>
</template>

<style scoped></style>