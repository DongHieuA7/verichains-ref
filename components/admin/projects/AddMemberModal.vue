<script setup lang="ts">
interface Props {
  modelValue: boolean
  title: string
  label: string
  placeholder: string
  options: Array<{ label: string; value: string }>
  selectedValue?: string
  existingItems?: string[]
  disabled?: boolean
  disabledTitle?: string
}

const props = withDefaults(defineProps<Props>(), {
  selectedValue: undefined,
  existingItems: () => [],
  disabled: false,
  disabledTitle: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'update:selectedValue', value: string | undefined): void
  (e: 'add', value: string): void
  (e: 'cancel'): void
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const localSelected = computed({
  get: () => props.selectedValue,
  set: (value) => emit('update:selectedValue', value)
})

const isDisabled = computed(() => {
  if (props.disabled || !localSelected.value) return true
  const existingItems = (props.existingItems || []) as string[]
  return existingItems.includes(localSelected.value || '')
})

const handleAdd = () => {
  if (localSelected.value) {
    emit('add', localSelected.value)
  }
}

const handleCancel = () => {
  emit('update:selectedValue', undefined)
  emit('cancel')
  isOpen.value = false
}
</script>

<template>
  <Modal v-model="isOpen" :title="title">
    <UFormGroup :label="label">
      <USelect 
        v-model="localSelected" 
        :options="options" 
        :placeholder="placeholder" 
      />
    </UFormGroup>
    <template #footer>
      <div class="flex justify-end gap-2">
        <ActionButton type="cancel" @click="handleCancel" />
        <ActionButton 
          type="create"
          :label="$t('common.add')"
          :disabled="isDisabled"
          :title="disabledTitle"
          @click="handleAdd"
        />
      </div>
    </template>
  </Modal>
</template>


