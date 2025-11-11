<script setup lang="ts">
const { t } = useI18n()

interface Props {
  project: {
    id: string
    name: string
    created_at: string
    commission_rate_min?: number | null
    commission_rate_max?: number | null
    policy?: string | null
  }
  isJoined: boolean
  hasPendingRequest: boolean
}

interface Emits {
  (e: 'request-join', projectId: string): void
  (e: 'view-policy', project: Props['project']): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const handleRequestJoin = () => {
  emit('request-join', props.project.id)
}

const handleViewPolicy = () => {
  emit('view-policy', props.project)
}
</script>

<template>
  <UCard class="hover:shadow-lg transition-shadow">
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="font-medium">{{ project.name }}</h3>
        <UBadge v-if="isJoined" color="green" variant="soft">{{ $t('projects.joined') }}</UBadge>
        <UBadge v-else-if="hasPendingRequest" color="yellow" variant="soft">{{ $t('projects.pending') }}</UBadge>
      </div>
    </template>
    
    <div class="space-y-3">
      <div class="text-sm text-gray-500 dark:text-gray-400">
        {{ $t('projects.created') }}: {{ new Date(project.created_at).toLocaleDateString('en-GB') }}
      </div>
      
      <!-- Commission Rate Range -->
      <div v-if="project.commission_rate_min != null || project.commission_rate_max != null" class="text-sm">
        <span class="font-medium text-gray-700 dark:text-gray-300">{{ $t('projects.commissionRateRange') }}:</span>
        <span class="text-gray-600 dark:text-gray-300 ml-1">
          {{ project.commission_rate_min != null ? `${project.commission_rate_min}%` : '' }}
          <span v-if="project.commission_rate_min != null && project.commission_rate_max != null"> - </span>
          {{ project.commission_rate_max != null ? `${project.commission_rate_max}%` : '' }}
        </span>
      </div>
      
      <!-- Policy -->
      <div v-if="project.policy" class="text-sm">
        <ActionButton 
          type="edit"
          :label="$t('projects.viewPolicy')"
          @click="handleViewPolicy"
        />
      </div>
      
      <div v-if="!isJoined && !hasPendingRequest" class="pt-2">
        <ActionButton 
          type="create"
          :label="$t('projects.requestToJoin')"
          size="sm"
          @click="handleRequestJoin"
          class="w-full justify-center"
        />
      </div>
    </div>
  </UCard>
</template>

