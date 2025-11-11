<script setup lang="ts">
const { t } = useI18n()
const supabase = useSupabaseClient()
const { getErrorMessage } = useErrorMessage()
const toast = useToast()

interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'invited'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const isLoading = ref(false)
const form = reactive({
  email: '',
  name: '',
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
  }
})

const invite = async () => {
  try {
    isLoading.value = true
    
    // Get session token
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('Not authenticated')
    }
    
    await $fetch('/api/admin/invite', { 
      method: 'POST', 
      body: { email: form.email, name: form.name, makeAdmin: false },
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    })
    
    const invitedEmail = form.email
    isOpen.value = false
    emit('invited')
    
    toast.add({
      color: 'green',
      title: t('users.userInvited'),
      description: t('users.invitationSent', { email: invitedEmail }),
    })
  } catch (error: any) {
    toast.add({
      color: 'red',
      title: t('users.failedToInviteUser'),
      description: getErrorMessage(error),
    })
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <Modal v-model="isOpen" :title="$t('users.inviteUser')">
    <UFormGroup :label="$t('common.email')">
      <UInput v-model="form.email" type="email" @keyup.enter="invite" />
    </UFormGroup>
    <UFormGroup :label="$t('common.name')">
      <UInput v-model="form.name" @keyup.enter="invite" />
    </UFormGroup>
    <template #footer>
      <div class="flex justify-end gap-2">
        <ActionButton type="cancel" @click="isOpen = false" />
        <ActionButton type="create" :label="$t('users.inviteUser')" :loading="isLoading" :disabled="isLoading || !form.email" @click="invite" />
      </div>
    </template>
  </Modal>
</template>

