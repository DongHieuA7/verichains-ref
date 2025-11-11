<script setup lang="ts">
const { t } = useI18n()
const { formatDate } = useCommissionFormatters()

interface UserProfile {
  id: string
  email: string
  name?: string | null
  company?: string | null
  descript?: string | null
  ref_code?: string | null
  created_at: string
}

interface Props {
  userProfile: UserProfile | null
}

defineProps<Props>()
</script>

<template>
  <UCard>
    <template #header>
      <h3 class="font-medium">{{ $t('users.userProfile') }}</h3>
    </template>
    <div v-if="userProfile" class="space-y-2 text-sm">
      <div>
        <span class="text-gray-500 dark:text-gray-400">{{ $t('common.name') }}:</span>
        <span class="font-medium text-gray-900 dark:text-white">{{ userProfile.name || '—' }}</span>
      </div>
      <div>
        <span class="text-gray-500 dark:text-gray-400">{{ $t('common.email') }}:</span>
        <span class="font-medium text-gray-900 dark:text-white">{{ userProfile.email }}</span>
      </div>
      <div>
        <span class="text-gray-500 dark:text-gray-400">{{ $t('profile.company') }}:</span>
        <span class="font-medium text-gray-900 dark:text-white">{{ userProfile.company || '—' }}</span>
      </div>
      <div>
        <span class="text-gray-500 dark:text-gray-400">{{ $t('profile.about') }}:</span>
        <span class="font-medium text-gray-900 dark:text-white">{{ userProfile.descript || '—' }}</span>
      </div>
      <div>
        <span class="text-gray-500 dark:text-gray-400">{{ $t('profile.referralCode') }}:</span>
        <UBadge color="primary" variant="soft" :label="userProfile.ref_code" />
      </div>
      <div>
        <span class="text-gray-500 dark:text-gray-400">{{ $t('projects.created') }}:</span>
        <span class="font-medium text-gray-900 dark:text-white">{{ formatDate(userProfile.created_at) }}</span>
      </div>
    </div>
  </UCard>
</template>

