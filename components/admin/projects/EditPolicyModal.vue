<script setup lang="ts">
const { t } = useI18n()
const supabase = useSupabaseClient()
const { getErrorMessage } = useErrorMessage()

interface Props {
  modelValue: boolean
  initialPolicy: string | null | undefined
  projectId: string
  isProjectAdmin: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved', policy: string | null): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const policy = ref('')
const isLoading = ref(false)

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    if (!props.isProjectAdmin) {
      const toast = useToast()
      toast.add({
        color: 'red',
        title: t('admin.permissionDenied'),
        description: t('admin.onlyProjectAdminsCanEdit'),
      })
      isOpen.value = false
      return
    }
    policy.value = props.initialPolicy || ''
  }
})

const save = async () => {
  if (!props.isProjectAdmin) return
  
  isLoading.value = true
  
  try {
    const { error } = await supabase
      .from('projects')
      .update({ policy: policy.value || null })
      .eq('id', props.projectId)
    
    if (error) {
      const toast = useToast()
      toast.add({
        color: 'red',
        title: t('messages.failedToCreateProject'),
        description: getErrorMessage(error),
      })
      return
    }
    
    emit('saved', policy.value || null)
    isOpen.value = false
    
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
      title: t('messages.failedToCreateProject'),
      description: getErrorMessage(error),
    })
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <Modal v-model="isOpen" :title="$t('projects.editPolicy') || 'Edit Policy'">
    <UFormGroup :label="$t('projects.policy')">
      <UTextarea 
        v-model="policy" 
        :rows="8"
        :placeholder="$t('projects.policyPlaceholder')"
        :disabled="isLoading"
      />
    </UFormGroup>
    <template #footer>
      <div class="flex justify-end gap-2">
        <ActionButton type="cancel" @click="isOpen = false" :disabled="isLoading" />
        <ActionButton type="save" @click="save" :disabled="isLoading" />
      </div>
    </template>
  </Modal>
</template>

