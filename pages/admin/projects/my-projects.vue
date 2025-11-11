<script setup lang="ts">
import type { Project } from '~/composables/useProjectManagement'

const { t } = useI18n()

definePageMeta({ middleware: ['auth','project-owner'] })
useSeoMeta({ title: `Admin - ${t('admin.myProjects') || 'My Projects'}` })

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const currentAdminId = computed(() => user.value?.id || '')
const { isGlobalAdmin, canManageProject } = useAdminRole()
const { getErrorMessage } = useErrorMessage()
const { formatDate, formatValue, formatStatus, statusColor } = useCommissionFormatters()
const { canManageProjectSync: canManageProjectSyncHelper, refreshCounts: refreshCountsHelper } = useProjectManagement()
const allProjects = ref<Project[]>([])
const allUsers = ref<any[]>([])
const allAdmins = ref<any[]>([])

const isEditOpen = ref(false)
const isManageUsersOpen = ref(false)
const isManageAdminsOpen = ref(false)
const selected = ref<Project | null>(null)
const editProject = ref<Project | null>(null)

// Commissions
const commissions = ref<any[]>([])
const isLoadingCommissions = ref(false)

// Commission filters
const commissionFilters = reactive({
  project: '',
  status: '',
  year: '',
  month: '',
})

// Edit commission modal
const isEditCommissionOpen = ref(false)
const editCommissionDraft = reactive<{
  id: string
  contract_amount: number | null
  commission_rate: number | null
  status: string
  client_name: string
  description: string
}>({
  id: '',
  contract_amount: null,
  commission_rate: null,
  status: 'requested',
  client_name: '',
  description: '',
})

// Role states
const isGlobalAdminValue = ref(false)
const projectPermissions = ref<Record<string, boolean>>({})

// Filter projects - only show projects where current admin is in admins array
// Global admins see all projects, project owners see only their projects
const filteredProjects = computed(() => {
  if (isGlobalAdminValue.value) {
    // Global admin sees all projects
    return allProjects.value
  }
  // Project owner sees only projects where they are in admins array
  return allProjects.value.filter(p => 
    p.admins && Array.isArray(p.admins) && p.admins.includes(currentAdminId.value)
  )
})

// Check if current user can manage a project (Global Admin or Project Owner)
const canManageProjectSync = (project: Project | null): boolean => {
  if (!project || !currentAdminId.value) return false
  // Global admin can manage all projects
  if (isGlobalAdminValue.value) return true
  // Use cached permission if available
  if (projectPermissions.value[project.id] !== undefined) {
    return projectPermissions.value[project.id]
  }
  // Fallback: check if in admins array (for Project Owner)
  return (project.admins || []).includes(currentAdminId.value)
}

const goDetail = (id: string) => navigateTo({ name: 'admin-projects-id', params: { id } })

const projectIdToUsersCount = ref<Record<string, number>>({})
const tableRows = computed(() => filteredProjects.value.map(p => ({
  ...p,
  usersCount: projectIdToUsersCount.value[p.id] || 0,
  adminsCount: (p.admins || []).length,
})))

const openEdit = async (p: Project) => {
  // Check permission using cache
  const canManage = projectPermissions.value[p.id] ?? await canManageProject(p.id)
  if (!canManage) {
    const toast = useToast()
    toast.add({
      color: 'red',
      title: t('admin.permissionDenied'),
      description: isGlobalAdminValue.value ? t('admin.onlyGlobalAdminsCanEdit') : t('admin.onlyProjectAdminsCanEdit'),
    })
    return
  }
  
  editProject.value = JSON.parse(JSON.stringify(p))
  isEditOpen.value = true 
}

const handleProjectUpdated = async () => {
  // Refresh projects list
  const { data: projs } = await supabase.from('projects').select('id, name, admins, commission_rate_min, commission_rate_max, policy').order('name')
  if (projs) {
    allProjects.value = projs
    // Update selected project if it exists
    if (selected.value) {
      const updated = projs.find(p => p.id === selected.value!.id)
      if (updated) {
        selected.value = updated
      }
    }
  }
  await refreshCounts()
}


const openManageUsers = async (p: Project) => {
  // Check permission using cache
  const canManage = projectPermissions.value[p.id] ?? await canManageProject(p.id)
  if (!canManage) {
    const toast = useToast()
    toast.add({
      color: 'red',
      title: t('admin.permissionDenied'),
      description: isGlobalAdminValue.value ? t('admin.onlyGlobalAdminsCanManageUsers') : t('admin.onlyProjectAdminsCanManageUsers'),
    })
    return
  }
  
  selected.value = JSON.parse(JSON.stringify(p))
  isManageUsersOpen.value = true
}

const openManageAdmins = async (p: Project) => {
  // Check permission using cache
  const canManage = projectPermissions.value[p.id] ?? await canManageProject(p.id)
  if (!canManage) {
    const toast = useToast()
    toast.add({
      color: 'red',
      title: t('admin.permissionDenied'),
      description: isGlobalAdminValue.value ? t('admin.onlyGlobalAdminsCanManageAdmins') : t('admin.onlyProjectAdminsCanManageAdmins'),
    })
    return
  }
  
  selected.value = JSON.parse(JSON.stringify(p))
  isManageAdminsOpen.value = true
}

// Wrapper functions for event handlers (to handle async functions)
const handleManageUsers = (project: Project) => {
  openManageUsers(project)
}

const handleManageAdmins = (project: Project) => {
  openManageAdmins(project)
}

const handleEdit = (project: Project) => {
  openEdit(project)
}

const refreshCounts = async () => {
  const counts = await refreshCountsHelper()
  projectIdToUsersCount.value = counts
}

// Get project IDs that admin manages
const managedProjectIds = computed(() => {
  return filteredProjects.value.map(p => p.id)
})

// Fetch commissions from managed projects
const fetchCommissions = async () => {
  if (managedProjectIds.value.length === 0) {
    commissions.value = []
    return
  }
  
  isLoadingCommissions.value = true
  try {
    const { data, error } = await supabase
      .from('commissions')
      .select('id, user_id, project_id, client_name, description, date, status, value, original_value, currency, contract_amount, commission_rate')
      .in('project_id', managedProjectIds.value)
      .order('date', { ascending: false })
    
    if (error) {
      return
    }
    
    commissions.value = data || []
  } finally {
    isLoadingCommissions.value = false
  }
}

// Helper function to extract date parts from various date formats
const getDateString = (dateValue: any): string => {
  if (!dateValue) return ''
  if (typeof dateValue === 'string') return dateValue
  if (dateValue instanceof Date) return dateValue.toISOString()
  if (typeof dateValue === 'number') return new Date(dateValue).toISOString()
  return String(dateValue)
}

// Get project name
const getProjectName = (projectId: string) => {
  if (!projectId) return '—'
  return filteredProjects.value.find(p => p.id === projectId)?.name || projectId
}

// Get user name/email
const getUserName = (userId: string) => {
  if (!userId) return '—'
  const u = allUsers.value.find(u => u.id === userId)
  return u ? (u.name || u.email) : userId
}

// Filtered commissions
const filteredCommissions = computed(() => {
  let filtered = commissions.value
  
  if (commissionFilters.project) {
    filtered = filtered.filter(c => c.project_id === commissionFilters.project)
  }
  
  if (commissionFilters.status) {
    filtered = filtered.filter(c => c.status === commissionFilters.status)
  }
  
  // Filter by year if selected
  if (commissionFilters.year && commissionFilters.year !== '') {
    const yearStr = String(commissionFilters.year)
    filtered = filtered.filter(c => {
      const dateStr = getDateString(c.date)
      if (!dateStr) return false
      const year = dateStr.slice(0, 4)
      return year === yearStr
    })
  }
  
  // Filter by month if selected
  if (commissionFilters.month && commissionFilters.month !== '') {
    const monthStr = commissionFilters.month
    filtered = filtered.filter(c => {
      const dateStr = getDateString(c.date)
      if (!dateStr) return false
      const yearMonth = dateStr.slice(0, 7)
      return yearMonth === monthStr
    })
  }
  
  return filtered
})

// Project options for commission filter (only managed projects)
const commissionProjectOptions = computed(() => [
  { label: t('common.all'), value: '' },
  ...filteredProjects.value.map(p => ({ label: p.name || p.id, value: p.id }))
])

// Status options
const statusOptions = computed(() => [
  { label: t('common.all'), value: '' },
  { label: capitalize(t('commissions.requested')), value: 'requested' },
  { label: capitalize(t('commissions.confirmed')), value: 'confirmed' },
  { label: capitalize(t('commissions.paid')), value: 'paid' },
])

// Status options for edit commission modal (hide 'requested' if current status is confirmed or paid)
const commissionStatusOptions = computed(() => {
  const currentStatus = editCommissionDraft.status
  const allOptions = [
    { label: capitalize(t('commissions.requested')), value: 'requested' },
    { label: capitalize(t('commissions.confirmed')), value: 'confirmed' },
    { label: capitalize(t('commissions.paid')), value: 'paid' },
  ]
  
  // If current status is confirmed or paid, hide 'requested' option
  if (currentStatus === 'confirmed' || currentStatus === 'paid') {
    return allOptions.filter(opt => opt.value !== 'requested')
  }
  
  return allOptions
})

// Capitalize helper
const capitalize = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// Reset commission filters
const resetCommissionFilters = () => {
  commissionFilters.project = ''
  commissionFilters.status = ''
  commissionFilters.year = ''
  commissionFilters.month = ''
}

// Open edit commission modal
const openEditCommission = (row: any) => {
  if (!row || !row.id) return
  
  editCommissionDraft.id = row.id || ''
  editCommissionDraft.contract_amount = (row.contract_amount != null && row.contract_amount !== '') 
    ? Number(row.contract_amount) 
    : (row.original_value != null && row.original_value !== '') 
      ? Number(row.original_value) 
      : null
  editCommissionDraft.commission_rate = (row.commission_rate != null && row.commission_rate !== '') 
    ? Number(row.commission_rate) 
    : null
  editCommissionDraft.status = row.status || 'requested'
  editCommissionDraft.client_name = (row.client_name != null) ? String(row.client_name) : ''
  editCommissionDraft.description = (row.description != null) ? String(row.description) : ''
  
  nextTick(() => {
    isEditCommissionOpen.value = true
  })
}

// Calculate commission amount
const calculateCommissionAmount = () => {
  if (editCommissionDraft.contract_amount != null && editCommissionDraft.commission_rate != null) {
    return Number(editCommissionDraft.contract_amount || 0) * (Number(editCommissionDraft.commission_rate || 0) / 100)
  }
  return 0
}

// Save commission
const saveCommission = async () => {
  if (!editCommissionDraft.id) return
  
  isLoadingCommissions.value = true
  try {
    const calculatedValue = calculateCommissionAmount()
    
    const updateData: any = {
      client_name: editCommissionDraft.client_name || null,
      description: editCommissionDraft.description || null,
      contract_amount: editCommissionDraft.contract_amount || null,
      commission_rate: editCommissionDraft.commission_rate || null,
      status: editCommissionDraft.status,
      original_value: editCommissionDraft.contract_amount || null,
    }
    
    if (calculatedValue > 0 && editCommissionDraft.contract_amount != null && editCommissionDraft.commission_rate != null) {
      updateData.value = calculatedValue
    }
    
    const { error } = await (supabase as any)
      .from('commissions')
      .update(updateData)
      .eq('id', editCommissionDraft.id)
    
    if (error) {
      throw error // Re-throw to be caught by catch block
    }
    
    await fetchCommissions()
    isEditCommissionOpen.value = false
    
    const toast = useToast()
    toast.add({
      color: 'green',
      title: t('common.save'),
      description: t('messages.success'),
    })
  } catch (error: any) {
    const toast = useToast()
    toast.add({
      color: 'red',
      title: t('messages.failedToUpdate'),
      description: getErrorMessage(error),
    })
  } finally {
    isLoadingCommissions.value = false
  }
}

onMounted(async () => {
  // Check if user is global admin
  isGlobalAdminValue.value = await isGlobalAdmin()
  
  const [{ data: projs }, { data: users }, { data: admins }] = await Promise.all([
    supabase.from('projects').select('id, name, admins, commission_rate_min, commission_rate_max, policy').order('name'),
    supabase.from('user_profiles').select('id, email, name'),
    supabase.from('admins').select('id, email, name, role')
  ])
  allProjects.value = projs || []
  allUsers.value = users || []
  allAdmins.value = admins || []
  
  // Pre-check permissions for all projects
  if (currentAdminId.value) {
    if (isGlobalAdminValue.value) {
      // Global admin can manage all projects - no need to check
      for (const project of allProjects.value) {
        projectPermissions.value[project.id] = true
      }
    } else {
      // For non-global admins, check if user is in admins array
      // If user is in admins array, they can manage (no need to call RPC)
      // If not, they cannot manage
      for (const project of allProjects.value) {
        if (project.admins && Array.isArray(project.admins) && project.admins.includes(currentAdminId.value)) {
          projectPermissions.value[project.id] = true
        } else {
          projectPermissions.value[project.id] = false
        }
      }
    }
  }
  
  await refreshCounts()
  await fetchCommissions()
})

// Watch for project changes to refetch commissions
watch(filteredProjects, () => {
  fetchCommissions()
})
</script>

<template>
  <div class="container mx-auto">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="font-semibold">{{ $t('admin.myProjects') || 'My Projects' }}</h2>
        </div>
      </template>

      <AdminProjectsTable
        :projects="tableRows as any"
        :loading="false"
        :is-global-admin="isGlobalAdminValue"
        :project-permissions="projectPermissions"
        admins-label="admins"
        :show-delete="false"
        @manage-users="handleManageUsers"
        @manage-admins="handleManageAdmins"
        @edit="handleEdit"
      />
    </UCard>

    <!-- Edit -->
    <AdminProjectsEditModal
      v-model="isEditOpen"
      :project="editProject"
      :is-global-admin="isGlobalAdminValue"
      :can-manage="editProject ? canManageProjectSync(editProject) : false"
      @updated="handleProjectUpdated"
    />

    <!-- Manage Users -->
    <AdminProjectsMembersModal
      v-model="isManageUsersOpen"
      :project="selected"
      member-type="users"
      :all-members="allUsers"
      :is-global-admin="isGlobalAdminValue"
      @updated="handleProjectUpdated"
    />

    <!-- Manage Admins -->
    <AdminProjectsMembersModal
      v-model="isManageAdminsOpen"
      :project="selected"
      member-type="admins"
      :all-members="allAdmins"
      :projects="allProjects"
      :is-global-admin="isGlobalAdminValue"
      @updated="handleProjectUpdated"
    />

    <!-- Commissions Section -->
    <UCard class="mt-6">
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="font-semibold">{{ $t('admin.allCommissions') || 'All Commissions' }}</h2>
          <CommissionFilters
            v-model="commissionFilters"
            :show-project="true"
            :project-options="commissionProjectOptions"
            :show-status="true"
            :status-options="statusOptions"
            :show-year="true"
            :show-month="true"
            :show-reset="true"
            layout="header"
            @reset="resetCommissionFilters"
          />
        </div>
      </template>

      <div v-if="isLoadingCommissions" class="text-center py-8">
        <div class="text-gray-500">{{ $t('common.loading') || 'Loading...' }}</div>
      </div>
      <CommissionsTable
        v-else
        :commissions="filteredCommissions"
        :show-user="true"
        :show-project="true"
        :can-edit="true"
        :users-map="Object.fromEntries(allUsers.map(u => [u.id, { name: u.name, email: u.email }]))"
        :projects-map="Object.fromEntries(filteredProjects.map(p => [p.id, p.name || p.id]))"
        @edit="openEditCommission"
      />
    </UCard>

    <!-- Edit Commission Modal -->
    <CommissionsModal
      v-model="isEditCommissionOpen"
      :title="$t('commissions.editCommission')"
      :draft="(editCommissionDraft as any)"
      :show-project="false"
      :show-status="true"
      :status-options="commissionStatusOptions"
      :show-rate="true"
      :min-rate="0"
      :max-rate="100"
      :show-calculated-hint="true"
      currency="VND"
      confirm-type="save"
      @update:draft="val => Object.assign(editCommissionDraft, val)"
      @cancel="() => { isEditCommissionOpen = false }"
      @confirm="saveCommission"
    />
  </div>
</template>

<style scoped></style>

