<script setup lang="ts">
const { t } = useI18n()

type ActionType = 'delete' | 'remove'

interface Props {
  modelValue: boolean
  title: string
  message: string
  itemName?: string | null
  warning?: string | null
  actionType?: ActionType
  loading?: boolean
  disabled?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm'): void
}

const props = withDefaults(defineProps<Props>(), {
  itemName: null,
  warning: null,
  actionType: 'delete',
  loading: false,
  disabled: false,
})

const emit = defineEmits<Emits>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const handleConfirm = () => {
  if (!props.disabled && !props.loading) {
    emit('confirm')
  }
}

const handleCancel = () => {
  isOpen.value = false
}
</script>

<template>
  <Modal v-model="isOpen" :title="title">
    <p class="text-gray-600 dark:text-white">
      {{ message }}
    </p>
    <p v-if="itemName" class="font-medium mt-2">
      {{ itemName }}
    </p>
    <p v-if="warning" class="text-sm mt-2" :class="actionType === 'delete' ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'">
      {{ warning }}
    </p>
    <template #footer>
      <div class="flex justify-end gap-2">
        <ActionButton type="cancel" @click="handleCancel" />
        <ActionButton 
          :type="actionType" 
          :loading="loading" 
          :disabled="disabled || loading" 
          @click="handleConfirm" 
        />
      </div>
    </template>
  </Modal>
</template>

