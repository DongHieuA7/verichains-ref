<script setup lang="ts">
const { t } = useI18n()
const supabase = useSupabaseClient()
const { getErrorMessage } = useErrorMessage()

interface Props {
  modelValue: boolean
  requestId: string | null
  initialRefPercentage: number | null
  projectId: string
  commissionRateMin: number | null | undefined
  commissionRateMax: number | null | undefined
  isProjectAdmin: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const refPercentage = ref<number | null>(null)
const isLoading = ref(false)

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    refPercentage.value = props.initialRefPercentage
  }
})

const save = async () => {
  if (!props.requestId) return
  
  if (!props.isProjectAdmin) {
    const toast = useToast()
    toast.add({
      color: 'red',
      title: t('admin.permissionDenied'),
      description: t('admin.onlyProjectAdminsCanEditRequests'),
    })
    isOpen.value = false
    return
  }
  
  isLoading.value = true
  
  try {
    // Validate within project's commission rate range
    if (refPercentage.value != null) {
      const min = props.commissionRateMin != null ? Number(props.commissionRateMin) : 0
      const max = props.commissionRateMax != null ? Number(props.commissionRateMax) : 100
      const v = Number(refPercentage.value)
      
      if (v < min || v > max) {
        const toast = useToast()
        toast.add({
          color: 'red',
          title: t('messages.failedToUpdate'),
          description: t('projects.referralPercentageMustBeInRange', { min, max }) || `Referral percentage must be between ${min}% and ${max}%`,
        })
        return
      }
    }
    
    const { error } = await supabase
      .from('project_join_requests')
      .update({ ref_percentage: refPercentage.value })
      .eq('id', props.requestId)
    
    if (error) {
      const toast = useToast()
      toast.add({
        color: 'red',
        title: t('messages.failedToUpdate'),
        description: getErrorMessage(error),
      })
      return
    }
    
    emit('saved')
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
      title: t('messages.failedToUpdate'),
      description: getErrorMessage(error),
    })
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <Modal v-model="isOpen" :title="$t('projects.editJoinRequest')">
    <UFormGroup :label="$t('projects.refPercentage')">
      <UInput 
        v-model.number="refPercentage" 
        type="number" 
        :min="commissionRateMin != null ? commissionRateMin : 0"
        :max="commissionRateMax != null ? commissionRateMax : 100"
        step="0.1"
        :disabled="isLoading"
      />
      <p v-if="commissionRateMin != null || commissionRateMax != null" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {{ $t('projects.commissionRateRange') }}: 
        {{ commissionRateMin != null ? `${commissionRateMin}%` : '—' }}
        <span v-if="commissionRateMin != null && commissionRateMax != null"> - </span>
        {{ commissionRateMax != null ? `${commissionRateMax}%` : '—' }}
      </p>
    </UFormGroup>
    <template #footer>
      <div class="flex justify-end gap-2">
        <ActionButton type="cancel" @click="isOpen = false" :disabled="isLoading" />
        <ActionButton type="save" :disabled="refPercentage == null || isLoading" @click="save" />
      </div>
    </template>
  </Modal>
</template>

