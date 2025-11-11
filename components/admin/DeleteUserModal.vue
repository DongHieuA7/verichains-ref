<script setup lang="ts">
const { t } = useI18n()
const supabase = useSupabaseClient()
const { getErrorMessage } = useErrorMessage()
const toast = useToast()

interface Props {
  modelValue: boolean
  userId: string | null
  userEmail?: string
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'deleted'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const isLoading = ref(false)

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const deleteUser = async () => {
  if (!props.userId) return
  
  try {
    isLoading.value = true
    
    // Get session token
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('Not authenticated')
    }
    
    // Call API to delete user (including auth.users)
    await $fetch('/api/admin/delete-user', { 
      method: 'POST', 
      body: { userId: props.userId },
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    })
    
    isOpen.value = false
    emit('deleted')
    
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
    isLoading.value = false
  }
}
</script>

<template>
  <AdminConfirmDialog
    v-model="isOpen"
    :title="$t('users.deleteUser')"
    :message="$t('users.deleteUserConfirm')"
    :item-name="userEmail || null"
    :warning="$t('users.deleteUserWarning')"
    action-type="delete"
    :loading="isLoading"
    @confirm="deleteUser"
  />
</template>

