<script setup lang="ts">
const { t } = useI18n()
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const toast = useToast()

interface Props {
  modelValue: boolean
  initialData: {
    company: string
    descript: string
  }
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved', data: { company: string; descript: string }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const isSaving = ref(false)
const draft = reactive({
  company: '',
  descript: '',
})

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Initialize draft when modal opens
watch(isOpen, (open) => {
  if (open) {
    draft.company = props.initialData.company || ''
    draft.descript = props.initialData.descript || ''
  }
}, { immediate: true })

const saveProfile = async () => {
  if (!user.value) return
  
  isSaving.value = true
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({
        company: draft.company,
        descript: draft.descript,
      })
      .eq('id', user.value.id)
    
    if (error) {
      toast.add({ color: 'red', title: t('common.error') || 'Error', description: error.message, icon: 'i-lucide-x-circle' })
      return
    }
    
    emit('saved', {
      company: draft.company,
      descript: draft.descript,
    })
    isOpen.value = false
    toast.add({ color: 'green', title: t('profile.profileUpdated'), icon: 'i-lucide-check-circle' })
  } catch (error: any) {
    toast.add({ color: 'red', title: t('common.error') || 'Error', description: error.message, icon: 'i-lucide-x-circle' })
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <Modal v-model="isOpen" :title="$t('profile.editMyProfile')">
    <UFormGroup :label="$t('profile.company')">
      <UInput v-model="draft.company" @keyup.enter="saveProfile" :disabled="isSaving" />
    </UFormGroup>
    <UFormGroup :label="$t('profile.aboutDescription')">
      <UTextarea v-model="draft.descript" :rows="4" :disabled="isSaving" />
    </UFormGroup>
    <template #footer>
      <div class="flex justify-end gap-2 mt-2">
        <ActionButton type="cancel" :disabled="isSaving" @click="isOpen = false" />
        <ActionButton type="save" :disabled="!draft.company || isSaving" :loading="isSaving" @click="saveProfile" />
      </div>
    </template>
  </Modal>
</template>

