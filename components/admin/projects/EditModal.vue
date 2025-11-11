<script setup lang="ts">
const { t } = useI18n()
const supabase = useSupabaseClient()
const { getErrorMessage } = useErrorMessage()

type Project = { 
  id: string
  name: string
  admins: string[]
  commission_rate_min?: number | null
  commission_rate_max?: number | null
  policy?: string | null
}

interface Props {
  modelValue: boolean
  project: Project | null
  isGlobalAdmin: boolean
  canManage: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'updated'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const draft = reactive<{
  id?: string
  name: string
  commission_rate_min?: number | null
  commission_rate_max?: number | null
  policy?: string | null
}>({
  id: undefined,
  name: '',
  commission_rate_min: null,
  commission_rate_max: null,
  policy: null,
})

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

watch(() => props.project, (project) => {
  if (project) {
    draft.id = project.id
    draft.name = project.name
    draft.commission_rate_min = project.commission_rate_min || null
    draft.commission_rate_max = project.commission_rate_max || null
    draft.policy = project.policy || null
  }
}, { immediate: true })

const saveProject = async () => {
  if (!draft.id) return
  
  const { error } = await supabase.from('projects').update({ 
    name: draft.name.trim(),
    commission_rate_min: draft.commission_rate_min || null,
    commission_rate_max: draft.commission_rate_max || null,
    policy: draft.policy || null
  }).eq('id', draft.id)
  
  if (error) {
    const toast = useToast()
    toast.add({
      color: 'red',
      title: t('messages.failedToUpdate'),
      description: getErrorMessage(error),
    })
    return
  }
  
  emit('updated')
  isOpen.value = false
}
</script>

<template>
  <Modal v-model="isOpen" :title="$t('projects.editProject')">
    <UFormGroup :label="$t('common.name')">
      <UInput v-model="draft.name" @keyup.enter="saveProject" />
    </UFormGroup>
    <UFormGroup :label="$t('projects.commissionRateMin')">
      <UInput 
        v-model.number="draft.commission_rate_min" 
        type="number" 
        step="0.01" 
        min="0" 
        max="100"
        :placeholder="$t('projects.commissionRateMinPlaceholder')"
      />
    </UFormGroup>
    <UFormGroup :label="$t('projects.commissionRateMax')">
      <UInput 
        v-model.number="draft.commission_rate_max" 
        type="number" 
        step="0.01" 
        min="0" 
        max="100"
        :placeholder="$t('projects.commissionRateMaxPlaceholder')"
      />
    </UFormGroup>
    <UFormGroup :label="$t('projects.policy')">
      <UTextarea 
        v-model="draft.policy" 
        :rows="4"
        :placeholder="$t('projects.policyPlaceholder')"
      />
    </UFormGroup>
    <template #footer>
      <div class="flex justify-end gap-2">
        <ActionButton type="cancel" @click="isOpen = false" />
        <ActionButton type="save" :disabled="!draft.name.trim()" @click="saveProject" />
      </div>
    </template>
  </Modal>
</template>

