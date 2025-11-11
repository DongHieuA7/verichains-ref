<script setup lang="ts">
const { t } = useI18n()
const supabase = useSupabaseClient()
const { getErrorMessage } = useErrorMessage()

interface Props {
  modelValue: boolean
  initialCommissionRateMin: number | null | undefined
  initialCommissionRateMax: number | null | undefined
  projectId: string
  isProjectAdmin: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved', commissionRateMin: number | null, commissionRateMax: number | null): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const commissionRateMin = ref<number | null>(null)
const commissionRateMax = ref<number | null>(null)
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
    commissionRateMin.value = props.initialCommissionRateMin ?? null
    commissionRateMax.value = props.initialCommissionRateMax ?? null
  }
})

const save = async () => {
  if (!props.isProjectAdmin) return
  
  isLoading.value = true
  
  try {
    const { error } = await supabase
      .from('projects')
      .update({ 
        commission_rate_min: commissionRateMin.value || null,
        commission_rate_max: commissionRateMax.value || null
      })
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
    
    emit('saved', commissionRateMin.value, commissionRateMax.value)
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
  <Modal v-model="isOpen" :title="$t('projects.commissionRateRange')">
    <UFormGroup :label="$t('projects.commissionRateMin')">
      <UInput 
        v-model.number="commissionRateMin" 
        type="number" 
        step="0.01"
        min="0"
        max="100"
        :placeholder="$t('projects.commissionRateMinPlaceholder')"
        :disabled="isLoading"
      />
    </UFormGroup>
    <UFormGroup :label="$t('projects.commissionRateMax')">
      <UInput 
        v-model.number="commissionRateMax" 
        type="number" 
        step="0.01"
        min="0"
        max="100"
        :placeholder="$t('projects.commissionRateMaxPlaceholder')"
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

