<script setup lang="ts">
const { t } = useI18n()
const supabase = useSupabaseClient()
const { getErrorMessage } = useErrorMessage()
const toast = useToast()

interface Props {
  modelValue: boolean
  userOptions: Array<{ label: string; value: string }>
  allUsers?: Array<{ id: string; email: string; name?: string | null }>
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'invited'): void
}

const props = withDefaults(defineProps<Props>(), {
  userOptions: () => [],
  allUsers: () => [],
})

const emit = defineEmits<Emits>()

const isLoading = ref(false)
const useExistingUser = ref(false)
const form = reactive({
  email: '',
  name: '',
  selectedUserId: '',
})

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Reset form when modal opens
watch(isOpen, (open) => {
  if (open) {
    form.email = ''
    form.name = ''
    form.selectedUserId = ''
    useExistingUser.value = false
  }
})

const inviteAdmin = async () => {
  try {
    isLoading.value = true
    
    // Get session token
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('Not authenticated')
    }
    
    // If using existing user, get email from selected user
    let email = form.email
    let name = form.name
    
    if (useExistingUser.value && form.selectedUserId) {
      const selectedUser = props.allUsers?.find(u => u.id === form.selectedUserId)
      if (selectedUser) {
        email = selectedUser.email
        name = selectedUser.name || name
      }
    }
    
    if (!email) {
      throw new Error('Email is required')
    }
    
    await $fetch('/api/admin/invite', { 
      method: 'POST', 
      body: { email, name, makeAdmin: true },
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    })
    
    isOpen.value = false
    emit('invited')
    
    toast.add({
      color: 'green',
      title: t('users.adminInvited'),
      description: t('users.invitationSent', { email }),
    })
  } catch (error: any) {
    toast.add({
      color: 'red',
      title: t('users.failedToInviteAdmin'),
      description: getErrorMessage(error),
    })
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <Modal v-model="isOpen" :title="$t('users.inviteAdmin')">
    <UFormGroup>
      <UCheckbox v-model="useExistingUser" :label="$t('users.useExistingUser') || 'Use existing user'" />
    </UFormGroup>
    
    <UFormGroup v-if="useExistingUser" :label="$t('common.user')">
      <USelect 
        v-model="form.selectedUserId" 
        :options="userOptions" 
        :placeholder="$t('users.selectUser') || 'Select user'"
        searchable
      />
    </UFormGroup>
    
    <template v-else>
      <UFormGroup :label="$t('common.email')">
        <UInput v-model="form.email" type="email" @keyup.enter="inviteAdmin" />
      </UFormGroup>
      <UFormGroup :label="$t('common.name')">
        <UInput v-model="form.name" @keyup.enter="inviteAdmin" />
      </UFormGroup>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <ActionButton type="cancel" @click="isOpen = false" />
        <ActionButton type="create" :label="$t('users.inviteAdmin')" :loading="isLoading" :disabled="isLoading || (useExistingUser ? !form.selectedUserId : !form.email)" @click="inviteAdmin" />
      </div>
    </template>
  </Modal>
</template>

