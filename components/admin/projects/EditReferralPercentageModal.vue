<script setup lang="ts">
const { t } = useI18n()
const supabase = useSupabaseClient()
const { getErrorMessage } = useErrorMessage()

interface Props {
  modelValue: boolean
  userId: string | null
  initialValue: number | null
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

const refValue = ref<number | null>(null)
const isLoading = ref(false)

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    refValue.value = props.initialValue
  }
})

const save = async () => {
  if (!props.userId || refValue.value == null) {
    isOpen.value = false
    return
  }
  
  if (!props.isProjectAdmin) {
    const toast = useToast()
    toast.add({
      color: 'red',
      title: t('admin.permissionDenied'),
      description: t('admin.onlyProjectAdminsCanEditReferral'),
    })
    isOpen.value = false
    return
  }
  
  isLoading.value = true
  
  try {
    // Validate within project's commission rate range
    const min = props.commissionRateMin != null ? Number(props.commissionRateMin) : 0
    const max = props.commissionRateMax != null ? Number(props.commissionRateMax) : 100
    const v = Number(refValue.value)
    
    if (v < min || v > max) {
      const toast = useToast()
      toast.add({
        color: 'red',
        title: t('messages.failedToUpdate'),
        description: t('projects.referralPercentageMustBeInRange', { min, max }) || `Referral percentage must be between ${min}% and ${max}%`,
      })
      return
    }
    
    const { error } = await supabase
      .from('user_project_info')
      .upsert({ 
        project_id: props.projectId, 
        user_id: props.userId, 
        ref_percentage: v 
      }, { onConflict: 'project_id,user_id' })
    
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
  <Modal v-model="isOpen" :title="$t('projects.editReferralPercentage')">
    <UFormGroup :label="$t('projects.refPercentage')">
      <UInput 
        v-model.number="refValue" 
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
        <ActionButton type="save" :disabled="refValue == null || isLoading" @click="save" />
      </div>
    </template>
  </Modal>
</template>

