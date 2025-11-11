<script setup lang="ts">
const { t } = useI18n()
const supabase = useSupabaseClient()
const { getErrorMessage } = useErrorMessage()
const toast = useToast()

definePageMeta({ middleware: ['auth','admin'] })

useSeoMeta({ title: `Admin - ${t('users.users')}` })

const users = ref<any[]>([])
const isLoadingUsers = ref(false)
const isInviteOpen = ref(false)
const userToDelete = ref<string | null>(null)
const isDeleteConfirmOpen = ref(false)
const isDeletingUser = ref(false)

const fetchUsers = async () => {
  isLoadingUsers.value = true
  try {
    const { data } = await supabase
      .from('user_profiles')
      .select('id, email, name, ref_code, created_at')
      .order('created_at', { ascending: false })
    users.value = data || []
  } finally {
    isLoadingUsers.value = false
  }
}

const openDeleteConfirm = (userId: string) => {
  userToDelete.value = userId
  isDeleteConfirmOpen.value = true
}

const userToDeleteInfo = computed(() => {
  if (!userToDelete.value) return null
  return users.value.find(u => u.id === userToDelete.value)
})

const handleUserInvited = async () => {
  await fetchUsers()
}

const confirmDeleteUser = async () => {
  if (!userToDelete.value) return
  
  try {
    isDeletingUser.value = true
    
    // Get session token
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('Not authenticated')
    }
    
    // Call API to delete user (including auth.users)
    await $fetch('/api/admin/delete-user', { 
      method: 'POST', 
      body: { userId: userToDelete.value },
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    })
    
    isDeleteConfirmOpen.value = false
    userToDelete.value = null
    await fetchUsers()
    
    toast.add({
      color: 'green',
      title: t('users.userDeleted'),
      description: t('users.userDeletedSuccessfully'),
    })
  } catch (error: any) {
    toast.add({
      color: 'red',
      title: t('users.failedToDeleteUser'),
      description: getErrorMessage(error),
    })
  } finally {
    isDeletingUser.value = false
  }
}

onMounted(fetchUsers)
</script>

<template>
  <div class="container mx-auto">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="font-semibold">{{ $t('users.users') }}</h2>
          <ActionButton type="create" :label="$t('users.inviteUser')" @click="isInviteOpen = true" />
        </div>
      </template>

      <div v-if="isLoadingUsers" class="flex items-center justify-center py-12">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-gray-400" />
        <span class="ml-3 text-gray-500">{{ $t('common.loading') || 'Loading...' }}</span>
      </div>

      <div v-else class="grid grid-cols-1 gap-6">
        <div>
          <h3 class="mb-2 font-medium">{{ $t('users.users') }}</h3>
          <AdminUsersTable
            :users="users"
            :loading="isLoadingUsers"
            @delete="openDeleteConfirm"
          />
        </div>
      </div>
    </UCard>

    <AdminInviteUserModal
      v-model="isInviteOpen"
      @invited="handleUserInvited"
    />

    <!-- Confirm Delete User Modal -->
    <AdminConfirmDialog
      v-model="isDeleteConfirmOpen"
      :title="$t('users.deleteUser')"
      :message="$t('users.deleteUserConfirm')"
      :item-name="userToDeleteInfo?.name || userToDeleteInfo?.email || null"
      :warning="$t('users.deleteUserWarning')"
      action-type="delete"
      :loading="isDeletingUser"
      @confirm="confirmDeleteUser"
    />
  </div>
</template>

<style scoped></style>

