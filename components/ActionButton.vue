<script setup lang="ts">
const { t } = useI18n()
const attrs = useAttrs()

type ButtonType = 'edit' | 'cancel' | 'save' | 'delete' | 'approve' | 'create' | 'remove' | 'reject'
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xs'
type ButtonVariant = 'outline' | 'solid' | 'soft' | 'ghost' | 'link'

interface Props {
  type: ButtonType
  disabled?: boolean
  loading?: boolean
  title?: string
  size?: ButtonSize
  variant?: ButtonVariant
  color?: 'gray' | 'primary' | 'red' | 'green' | 'blue' | 'yellow'
  label?: string // Custom label to override default label from type
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  loading: false,
  title: '',
  size: 'xs',
  variant: undefined,
  color: undefined,
})

const emit = defineEmits<{
  (e: 'click'): void
}>()

const handleClick = () => {
  if (!props.disabled && !props.loading) {
    emit('click')
  }
}

// Button configuration based on type
const buttonConfig = computed(() => {
  const configs: Record<ButtonType, { color: Props['color'], variant: ButtonVariant, label: string, class?: string }> = {
    edit: {
      color: 'gray',
      variant: 'outline',
      label: t('common.edit'),
      class: 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700',
    },
    cancel: {
      color: 'gray',
      variant: 'outline',
      label: t('common.cancel'),
      class: 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700',
    },
    save: {
      color: 'primary',
      variant: 'solid',
      label: t('common.save'),
    },
    delete: {
      color: 'red',
      variant: 'soft',
      label: t('common.delete'),
    },
    approve: {
      color: 'green',
      variant: 'soft',
      label: t('projects.approve'),
    },
    create: {
      color: 'primary',
      variant: 'solid',
      label: t('common.create'),
    },
    remove: {
      color: 'red',
      variant: 'soft',
      label: t('common.remove'),
    },
    reject: {
      color: 'red',
      variant: 'soft',
      label: t('projects.reject'),
    },
  }
  
  return configs[props.type]
})

const finalColor = computed(() => props.color || buttonConfig.value.color)
const finalVariant = computed(() => props.variant || buttonConfig.value.variant)
const finalLabel = computed(() => props.label || buttonConfig.value.label)
const finalClass = computed(() => {
  const defaultClass = buttonConfig.value.class || ''
  const attrsClass = (attrs.class as string) || ''
  return [defaultClass, attrsClass].filter(Boolean).join(' ')
})
</script>

<template>
  <UButton 
    :size="size"
    :color="finalColor"
    :variant="finalVariant"
    :class="finalClass"
    :disabled="disabled"
    :loading="loading"
    :title="title"
    @click="handleClick"
  >
    {{ finalLabel }}
  </UButton>
</template>

