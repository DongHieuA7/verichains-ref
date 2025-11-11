<script setup lang="ts">
const { t } = useI18n()

definePageMeta({ middleware: ['auth','admin'] })
useSeoMeta({ title: `Admin - ${t('users.admins')}` })

const admins = ref<any[]>([])
const allUsers = ref<any[]>([])
const supabase = useSupabaseClient()
const { isGlobalAdmin } = useAdminRole()
const isGlobalAdminValue = ref(false)
const { getErrorMessage } = useErrorMessage()

// Filter
const selectedRole = ref<string>('')

const isInviteOpen = ref(false)
const isLoading = ref(false)
const isLoadingList = ref(false)
const isConfirmRemoveAdminOpen = ref(false)
const adminToRemove = ref<string | null>(null)

const handleAdminInvited = async () => {
  await Promise.all([
    fetchAdmins(),
    fetchUsers() // Refresh users list as one might have been converted to admin
  ])
}

const fetchAdmins = async () => {
  isLoadingList.value = true
  try {
    const { data } = await supabase
      .from('admins')
      .select('id, email, name, created_at, role')
      .order('created_at', { ascending: false })
    admins.value = data || []
  } finally {
    isLoadingList.value = false
  }
}

const fetchUsers = async () => {
  const { data } = await supabase
    .from('user_profiles')
    .select('id, email, name')
    .order('email')
  allUsers.value = data || []
}

onMounted(async () => {
  await getCurrentAdminId()
  isGlobalAdminValue.value = await isGlobalAdmin()
  await Promise.all([
    fetchAdmins(),
    fetchUsers()
  ])
})


const userOptions = computed(() => {
  return allUsers.value
    .filter(u => !admins.value.find(a => a.id === u.id)) // Exclude users who are already admins
    .map(u => ({ label: `${u.name || u.email} (${u.email})`, value: u.id }))
})

// Role options for filter
const roleOptions = computed(() => [
  { label: t('common.all'), value: '' },
  { label: t('admin.globalAdmin') || 'Global Admin', value: 'global_admin' },
  { label: t('admin.projectOwner'), value: 'project_owner' },
])

// Filtered admins
const filteredAdmins = computed(() => {
  if (!selectedRole.value) {
    return admins.value
  }
  return admins.value.filter(admin => admin.role === selectedRole.value)
})

// Reset filter
const resetFilter = () => {
  selectedRole.value = ''
}

const currentAdminId = ref<string | null>(null)

const getCurrentAdminId = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  currentAdminId.value = user?.id || null
}

// Wrapper to show confirm dialog
const removeProjectOwnerWrapper = (adminId: string) => {
  // Only Global Admin can remove project owners
  if (!isGlobalAdminValue.value) {
    const toast = useToast()
    toast.add({
      color: 'red',
      title: t('admin.permissionDenied'),
      description: t('admin.onlyGlobalAdminsCanRemoveProjectOwners'),
    })
    return
  }

  // Check if it's a global admin (cannot remove)
  const admin = admins.value.find(a => a.id === adminId)
  if (admin?.role === 'global_admin') {
    const toast = useToast()
    toast.add({
      color: 'red',
      title: t('admin.cannotRemoveGlobalAdmin'),
      description: t('admin.cannotRemoveGlobalAdminMessage'),
    })
    return
  }

  adminToRemove.value = adminId
  isConfirmRemoveAdminOpen.value = true
}

const removeProjectOwner = async (adminId: string) => {

  try {
    isLoading.value = true

    // Get all projects where this admin is a project owner
    // Query all projects and filter on client side (Supabase array filter is complex)
    const { data: allProjects, error: fetchError } = await supabase
      .from('projects')
      .select('id, admins')

    if (fetchError) {
      throw fetchError // Re-throw to be caught by catch block
    }

    // Filter projects where admin is in admins array
    const projects = ((allProjects || []) as any[]).filter((p: any) => 
      p.admins && Array.isArray(p.admins) && p.admins.includes(adminId)
    )

    // If admin is not owner of any project, we still proceed to remove admin role
    // Otherwise, first remove them from all projects below, then delete admin role

    // Remove admin from all projects (if any)
    for (const project of projects) {
      const nextAdmins = (project.admins || []).filter((id: string) => id !== adminId)
      const { error: updateError } = await (supabase as any)
        .from('projects')
        .update({ admins: nextAdmins })
        .eq('id', project.id)

      if (updateError) {
        throw updateError // Re-throw to be caught by catch block
      }
    }

    // Finally, remove admin role (delete from admins table)
    const { error: deleteAdminErr } = await supabase
      .from('admins')
      .delete()
      .eq('id', adminId)

    if (deleteAdminErr) {
      throw deleteAdminErr // Re-throw to be caught by catch block
    }

    // Refresh admins list after removal
    await fetchAdmins()
    
    const toast = useToast()
    toast.add({
      color: 'green',
      title: t('admin.adminRemoved') || 'Admin removed',
      description: projects.length > 0
        ? (t('admin.projectOwnerRemovedFromProjects', { count: projects.length }) as string)
        : (t('admin.adminNotInAnyProject') as string),
    })
  } catch (error: any) {
    const toast = useToast()
    toast.add({
      color: 'red',
      title: t('admin.failedToRemoveProjectOwner'),
      description: getErrorMessage(error),
    })
  } finally {
    isLoading.value = false
  }
}

// Confirm and remove admin
const confirmRemoveAdmin = async () => {
  if (adminToRemove.value) {
    await removeProjectOwner(adminToRemove.value)
    isConfirmRemoveAdminOpen.value = false
    adminToRemove.value = null
  }
}
</script>

<template>
  <div class="container mx-auto">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="font-semibold">{{ $t('users.admins') }}</h2>
          <div class="flex items-center gap-3">
            <span class="text-sm text-gray-500">{{ $t('common.filter') }}</span>
            <USelect 
              v-model="selectedRole" 
              :options="roleOptions" 
              :placeholder="$t('common.all')"
              class="min-w-[150px]"
            />
            <UButton 
              v-if="selectedRole"
              color="gray" 
              variant="soft" 
              size="xs"
              @click="resetFilter"
              icon="i-lucide-x"
            >
              {{ $t('common.reset') || 'Reset' }}
            </UButton>
            <ActionButton type="create" :label="$t('users.inviteAdmin')" @click="isInviteOpen = true" />
          </div>
        </div>
      </template>

      <div v-if="isLoadingList" class="flex items-center justify-center py-12">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-gray-400" />
        <span class="ml-3 text-gray-500">{{ $t('common.loading') || 'Loading...' }}</span>
      </div>
      <AdminAdminsTable
        v-else
        :admins="filteredAdmins"
        :loading="isLoadingList"
        :is-global-admin="isGlobalAdminValue"
        :current-admin-id="currentAdminId"
        :is-removing="isLoading"
        @remove="removeProjectOwnerWrapper"
      />
    </UCard>

    <AdminInviteAdminModal
      v-model="isInviteOpen"
      :user-options="userOptions"
      :all-users="allUsers"
      @invited="handleAdminInvited"
    />

    <!-- Confirm Remove Admin Modal -->
    <AdminConfirmDialog
      v-model="isConfirmRemoveAdminOpen"
      :title="$t('admin.removeProjectOwner')"
      :message="$t('admin.removeProjectOwnerConfirm')"
      :item-name="adminToRemove ? (admins.find(a => a.id === adminToRemove)?.name || admins.find(a => a.id === adminToRemove)?.email || adminToRemove) : null"
      :warning="$t('admin.removeProjectOwnerWarning')"
      action-type="remove"
      :loading="isLoading"
      @confirm="confirmRemoveAdmin"
    />
  </div>
</template>

<style scoped></style>

