<script setup lang="ts">
const { t } = useI18n()

interface Props {
  commissionRateMin: number | null | undefined
  commissionRateMax: number | null | undefined
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
        <h3 class="font-medium">{{ $t('projects.commissionRateRange') }}</h3>
        <ActionButton 
          v-if="isProjectAdmin"
          type="edit"
          @click="emit('edit')"
        />
      </div>
    </template>
    <div class="text-sm text-gray-700 dark:text-white">
      <div v-if="commissionRateMin != null || commissionRateMax != null">
        <span v-if="commissionRateMin != null">{{ commissionRateMin }}%</span>
        <span v-if="commissionRateMin != null && commissionRateMax != null"> - </span>
        <span v-if="commissionRateMax != null">{{ commissionRateMax }}%</span>
      </div>
      <span v-else>{{ $t('common.noData') }}</span>
    </div>
  </UCard>
</template>

