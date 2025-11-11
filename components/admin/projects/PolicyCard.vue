<script setup lang="ts">
const { t } = useI18n()

interface Props {
  policy: string | null | undefined
  isProjectAdmin: boolean
}

interface Emits {
  (e: 'edit'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="font-medium">{{ $t('projects.policy') }}</h3>
        <ActionButton 
          v-if="isProjectAdmin"
          type="edit"
          @click="emit('edit')"
        />
      </div>
    </template>
    <div class="whitespace-pre-wrap text-sm text-gray-700 dark:text-white">
      {{ policy || $t('common.noData') }}
    </div>
  </UCard>
</template>

