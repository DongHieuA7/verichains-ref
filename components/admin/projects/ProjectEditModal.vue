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
  <UModal v-model="isOpen">
    <UCard>
      <template #header>
        <h3 class="font-semibold">{{ $t('projects.editProject') }}</h3>
      </template>
      <div class="space-y-4">
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
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="gray" variant="outline" class="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700" @click="isOpen = false">{{ $t('common.cancel') }}</UButton>
          <UButton color="primary" @click="saveProject" :disabled="!draft.name.trim()">{{ $t('common.save') }}</UButton>
        </div>
      </template>
    </UCard>
  </UModal>
</template>

