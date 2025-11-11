<script setup lang="ts">
const { t } = useI18n()

interface Props {
  modelValue: boolean
  project: {
    id: string
    name: string
    policy?: string | null
  } | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'closed'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit('update:modelValue', value)
    if (!value) {
      // Emit closed event when modal is closed (by any means)
      emit('closed')
    }
  }
})

const closeModal = () => {
  isOpen.value = false
}
</script>

<template>
  <Modal v-model="isOpen">
    <template #header>
      <h3 class="font-semibold">{{ $t('projects.policy') }} - {{ project?.name }}</h3>
    </template>
    <div class="whitespace-pre-wrap text-sm text-gray-700 dark:text-white">
      {{ project?.policy || $t('common.noData') }}
    </div>
    <template #footer>
      <div class="flex justify-end gap-2">
        <ActionButton type="cancel" @click="closeModal" />
      </div>
    </template>
  </Modal>
</template>

