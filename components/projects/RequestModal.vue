<script setup lang="ts">
const { t } = useI18n()
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const toast = useToast()

interface Props {
  modelValue: boolean
  project: {
    id: string
    name: string
    commission_rate_min?: number | null
    commission_rate_max?: number | null
    policy?: string | null
  } | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'submitted'): void
  (e: 'viewPolicy'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const isLoading = ref(false)
const requestForm = reactive({
  message: '',
})

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Reset form when modal opens
watch(isOpen, (open) => {
  if (open) {
    requestForm.message = ''
  }
})

const submitJoinRequest = async () => {
  if (!user.value || !props.project) return
  
  try {
    isLoading.value = true
    
    const { error } = await supabase
      .from('project_join_requests')
      .insert({
        project_id: props.project.id,
        user_id: user.value.id,
        message: requestForm.message || null,
        ref_percentage: null, // User cannot set commission rate
        status: 'pending',
      })
    
    if (error) {
      throw error
    }
    
    isOpen.value = false
    emit('submitted')
    
    // Show success message
    toast.add({
      color: 'green',
      title: t('projects.requestSubmitted'),
      description: t('projects.requestSubmittedDescription'),
    })
  } catch (error: any) {
    toast.add({
      color: 'red',
      title: t('common.error') || 'Error',
      description: error.message || t('projects.requestFailed'),
    })
  } finally {
    isLoading.value = false
  }
}

const handleViewPolicy = () => {
  emit('viewPolicy')
}
</script>

<template>
  <Modal v-model="isOpen" :title="$t('projects.requestToJoinProject')">
    <UFormGroup :label="$t('common.project')">
      <UInput 
        :value="project?.name || ''" 
        disabled 
        class="bg-gray-50 dark:bg-gray-800 dark:border-gray-700"
      />
    </UFormGroup>
    
    <!-- Show Commission Rate Range (read-only) -->
    <UFormGroup v-if="project && (project.commission_rate_min != null || project.commission_rate_max != null)" :label="$t('projects.commissionRateRange')">
      <UInput 
        :value="`${project.commission_rate_min != null ? project.commission_rate_min : ''}${project.commission_rate_min != null && project.commission_rate_max != null ? ' - ' : ''}${project.commission_rate_max != null ? project.commission_rate_max : ''}%`"
        disabled
        class="bg-gray-50 dark:bg-gray-800 dark:border-gray-700 flex-1"
      />
    </UFormGroup>
    
    <!-- Show Policy link if exists -->
    <div v-if="project?.policy" class="text-sm">
      <ActionButton 
        type="edit"
        :label="$t('projects.viewPolicy')"
        @click="handleViewPolicy"
        class="w-full"
      />
    </div>
    
    <UFormGroup :label="$t('projects.message')">
      <UTextarea 
        v-model="requestForm.message" 
        :placeholder="$t('projects.whyJoin')"
        :rows="3"
      />
      <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ $t('projects.messageOptional') || 'Optional message explaining why you want to join this project' }}</p>
    </UFormGroup>
    <template #footer>
      <div class="flex justify-end gap-2">
        <ActionButton type="cancel" :disabled="isLoading" @click="isOpen = false" />
        <ActionButton 
          type="create"
          :label="$t('projects.submitRequest')"
          :loading="isLoading"
          :disabled="isLoading"
          @click="submitJoinRequest"
        />
      </div>
    </template>
  </Modal>
</template>

