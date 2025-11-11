<script setup lang="ts">
const { t } = useI18n()
const { formatDate } = useCommissionFormatters()

interface Project {
  id: string
  name: string
  commission_rate_min?: number | null
  commission_rate_max?: number | null
  ref_percentage?: number
  joined_at?: string
}

interface Props {
  projects: Project[]
}

defineProps<Props>()
</script>

<template>
  <UCard>
    <template #header>
      <h3 class="font-medium">{{ $t('commissions.projectsJoined') }}</h3>
    </template>
    <UTable
      :rows="projects"
      :columns="[
        { key: 'name', label: $t('common.name') },
        { key: 'commission_rate', label: $t('projects.refPercentage') },
        { key: 'joined_at', label: $t('projects.joinedRequested') },
      ]"
    >
      <template #name-data="{ row }">
        <span class="text-gray-900 dark:text-white">{{ row.name }}</span>
      </template>
      <template #joined_at-data="{ row }">
        <span class="text-gray-900 dark:text-white">{{ formatDate(row.joined_at) }}</span>
      </template>
      <template #commission_rate-data="{ row }">
        <span v-if="row.commission_rate_min != null || row.commission_rate_max != null" class="text-gray-900 dark:text-white">
          <template v-if="row.commission_rate_min != null && row.commission_rate_max != null">
            {{ row.commission_rate_min }}% - {{ row.commission_rate_max }}%
          </template>
          <template v-else>
            {{ (row.commission_rate_min ?? row.commission_rate_max) }}%
          </template>
        </span>
        <span v-else class="text-gray-400 dark:text-gray-500">—</span>
      </template>
      <template #empty>
        <div class="text-sm text-gray-500 py-4 text-center">
          {{ $t('projects.noProjectsAvailable') }}
        </div>
      </template>
    </UTable>
  </UCard>
</template>

