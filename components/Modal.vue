<script setup lang="ts">
interface Props {
  modelValue: boolean
  title?: string
  width?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  width: undefined,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const modalUi = computed(() => {
  if (props.width) {
    return { width: props.width }
  }
  return undefined
})
</script>

<template>
  <UModal v-model="isOpen" :ui="modalUi">
    <UCard>
      <template v-if="title || $slots.header" #header>
        <slot name="header">
          <h3 v-if="title" class="font-semibold">{{ title }}</h3>
        </slot>
      </template>
      
      <div class="space-y-4">
        <slot />
      </div>
      
      <template v-if="$slots.footer" #footer>
        <slot name="footer" />
      </template>
    </UCard>
  </UModal>
</template>






