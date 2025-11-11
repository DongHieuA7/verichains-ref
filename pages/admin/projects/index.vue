<script setup lang="ts">
import type { Project } from '~/composables/useProjectManagement'

const { t } = useI18n()

definePageMeta({ middleware: ['auth','admin'] })
useSeoMeta({ title: `Admin - ${t('common.projects')}` })

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const currentAdminId = computed(() => user.value?.id || '')
const { isGlobalAdmin, canManageProject } = useAdminRole()
const { getErrorMessage } = useErrorMessage()
const { canManageProjectSync: canManageProjectSyncHelper, refreshCounts: refreshCountsHelper } = useProjectManagement()
const projects = ref<Project[]>([])
const allUsers = ref<any[]>([])
const allAdmins = ref<any[]>([])
const isLoadingUsers = ref(false)
const isLoadingAdmins = ref(false)

const isCreateOpen = ref(false)
const isEditOpen = ref(false)
const isManageUsersOpen = ref(false)
const isManageAdminsOpen = ref(false)
const selected = ref<Project | null>(null)
const editProject = ref<Project | null>(null)
const isConfirmDeleteProjectOpen = ref(false)
const projectToDelete = ref<Project | null>(null)

// Role states
const isGlobalAdminValue = ref(false)
const projectPermissions = ref<Record<string, boolean>>({})

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

const userOptions = computed(() => allUsers.value.map(u => ({ label: u.name || u.email, value: u.id })))

// Admin options for creating project (only project owners)
const availableOwnerOptions = computed(() => {
  return allAdmins.value
    .filter(a => {
      // Only allow project_owner or null role (exclude global_admin)
      return a.role !== 'global_admin'
    })
    .map(a => ({ 
      label: `${a.name || a.email}${a.role ? ` (${a.role === 'project_owner' ? t('admin.projectOwner') : a.role})` : ''}`, 
      value: a.id 
    }))
})

const goDetail = (id: string) => navigateTo({ name: 'admin-projects-id', params: { id } })

const projectIdToUsersCount = ref<Record<string, number>>({})
const tableRows = computed(() => projects.value.map(p => ({
  ...p,
  usersCount: projectIdToUsersCount.value[p.id] || 0,
  adminsCount: (p.admins || []).length,
})))

const openCreate = async () => {
  // Lazy load users and admins when opening create modal
  await Promise.all([fetchUsers(), fetchAdmins()])
  isCreateOpen.value = true
}

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

const handleProjectCreated = async () => {
  // Refresh projects list
  const { data: projs } = await supabase.from('projects').select('id, name, admins, commission_rate_min, commission_rate_max, policy').order('name')
  if (projs) {
    projects.value = projs
  }
  await refreshCounts()
}
const handleProjectUpdated = async () => {
  // Refresh projects list
  const { data: projs } = await supabase.from('projects').select('id, name, admins, commission_rate_min, commission_rate_max, policy').order('name')
  if (projs) {
    projects.value = projs
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

const deleteProject = async (p: Project) => {
  // Check if current user can manage this project using cache
  const canManage = projectPermissions.value[p.id] ?? await canManageProject(p.id)
  if (!canManage) {
    const toast = useToast()
    toast.add({
      color: 'red',
      title: t('admin.permissionDenied'),
      description: isGlobalAdminValue.value ? t('admin.onlyGlobalAdminsCanDelete') : t('admin.onlyProjectAdminsCanDelete'),
    })
    return
  }
  
  // Only global admins can delete projects
  if (!isGlobalAdminValue.value) {
    const toast = useToast()
    toast.add({
      color: 'red',
      title: t('admin.permissionDenied'),
      description: t('admin.onlyGlobalAdminsCanDelete'),
    })
    return
  }
  
  const { error } = await supabase.from('projects').delete().eq('id', p.id)
  
  if (error) {
    const toast = useToast()
    toast.add({
      color: 'red',
      title: t('messages.failedToDelete'),
      description: getErrorMessage(error),
    })
    return
  }
  
  projects.value = projects.value.filter(x => x.id !== p.id)
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
  // Lazy load users when opening modal
  await fetchUsers()
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
  // Lazy load admins when opening modal
  await fetchAdmins()
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

// Wrapper to show confirm dialog
const handleDelete = (project: Project) => {
  projectToDelete.value = project
  isConfirmDeleteProjectOpen.value = true
}

// Confirm and delete project
const confirmDeleteProject = async () => {
  if (projectToDelete.value) {
    await deleteProject(projectToDelete.value)
    isConfirmDeleteProjectOpen.value = false
    projectToDelete.value = null
  }
}

const refreshCounts = async () => {
  const counts = await refreshCountsHelper()
  projectIdToUsersCount.value = counts
}

const isLoadingProjects = ref(false)

// Lazy load users when needed
const fetchUsers = async () => {
  if (allUsers.value.length > 0) return // Already loaded
  isLoadingUsers.value = true
  try {
    const { data } = await supabase.from('user_profiles').select('id, email, name')
    allUsers.value = data || []
  } finally {
    isLoadingUsers.value = false
  }
}

// Lazy load admins when needed
const fetchAdmins = async () => {
  if (allAdmins.value.length > 0) return // Already loaded
  isLoadingAdmins.value = true
  try {
    const { data } = await supabase.from('admins').select('id, email, name, role')
    allAdmins.value = data || []
  } finally {
    isLoadingAdmins.value = false
  }
}

onMounted(async () => {
  isLoadingProjects.value = true
  // Check if user is global admin
  isGlobalAdminValue.value = await isGlobalAdmin()
  
  try {
    const { data: projs } = await supabase.from('projects').select('id, name, admins, commission_rate_min, commission_rate_max, policy').order('name')
    projects.value = projs || []
  } finally {
    isLoadingProjects.value = false
  }
  
  // Pre-check permissions for all projects
  if (currentAdminId.value) {
    if (isGlobalAdminValue.value) {
      // Global admin can manage all projects - no need to check
      for (const project of projects.value) {
        projectPermissions.value[project.id] = true
      }
    } else {
      // For non-global admins, check if user is in admins array
      // If user is in admins array, they can manage (no need to call RPC)
      // If not, they cannot manage
      for (const project of projects.value) {
        if (project.admins && Array.isArray(project.admins) && project.admins.includes(currentAdminId.value)) {
          projectPermissions.value[project.id] = true
        } else {
          projectPermissions.value[project.id] = false
        }
      }
    }
  }
  
  await refreshCounts()
})
</script>

<template>
  <div class="container mx-auto">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="font-semibold">{{ $t('common.projects') }}</h2>
          <ActionButton type="create" :label="$t('projects.newProject')" :disabled="!isGlobalAdminValue" :title="!isGlobalAdminValue ? $t('admin.onlyGlobalAdminsCanCreateProjects') || 'Only global admins can create projects' : ''" @click="openCreate" />
        </div>
      </template>

      <div v-if="isLoadingProjects" class="flex items-center justify-center py-12">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-gray-400" />
        <span class="ml-3 text-gray-500">{{ $t('common.loading') || 'Loading...' }}</span>
      </div>
      <AdminProjectsTable
        v-else
        :projects="tableRows as any"
        :loading="isLoadingProjects"
        :is-global-admin="isGlobalAdminValue"
        :project-permissions="projectPermissions"
        admins-label="projectOwners"
        @manage-users="handleManageUsers"
        @manage-admins="handleManageAdmins"
        @edit="handleEdit"
        @delete="handleDelete"
      />
    </UCard>

    <!-- Create -->
    <AdminProjectsCreateModal
      v-model="isCreateOpen"
      :available-owner-options="availableOwnerOptions"
      :user-options="userOptions"
      @created="handleProjectCreated"
    />

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
      :projects="projects"
      :is-global-admin="isGlobalAdminValue"
      @updated="handleProjectUpdated"
    />

    <!-- Confirm Delete Project Modal -->
    <AdminConfirmDialog
      v-model="isConfirmDeleteProjectOpen"
      :title="$t('projects.deleteProject')"
      :message="$t('projects.deleteProjectConfirm')"
      :item-name="projectToDelete?.name || null"
      :warning="$t('projects.deleteProjectWarning')"
      action-type="delete"
      @confirm="confirmDeleteProject"
    />
  </div>
</template>

<style scoped></style>
