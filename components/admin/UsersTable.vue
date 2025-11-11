<script setup lang="ts">
const { t } = useI18n()
const { formatDate } = useCommissionFormatters()

interface User {
  id: string
  email: string
  name?: string | null
  ref_code?: string | null
  created_at: string
}

interface Props {
  users: User[]
  loading?: boolean
}

interface Emits {
  (e: 'delete', userId: string): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
})

const emit = defineEmits<Emits>()

const columns = computed(() => [
  { key: 'name', label: t('common.name') },
  { key: 'email', label: t('common.email') },
  { key: 'ref_code', label: t('profile.referralCode') },
  { key: 'created_at', label: t('projects.created') },
  { key: 'actions', label: t('common.actions') },
])
</script>

<template>
  <div v-if="props.loading" class="flex items-center justify-center py-12">
    <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-gray-400" />
    <span class="ml-3 text-gray-500">{{ $t('common.loading') || 'Loading...' }}</span>
  </div>
  <UTable v-else :rows="users" :columns="columns">
    <template #name-data="{ row }">
      <NuxtLink 
        class="text-gray-900 dark:text-primary hover:underline font-medium" 
        :to="`/admin/users/${row.id}`"
      >
        {{ row.name || row.email }}
      </NuxtLink>
    </template>
    <template #email-data="{ row }">
      <span class="text-gray-900 dark:text-white">{{ row.email }}</span>
    </template>
    <template #ref_code-data="{ row }">
      <span class="text-gray-900 dark:text-white">{{ row.ref_code || '—' }}</span>
    </template>
    <template #created_at-data="{ row }">
      <span class="text-gray-900 dark:text-white">{{ formatDate(row.created_at) }}</span>
    </template>
    <template #actions-data="{ row }">
      <div class="flex gap-2">
        <UButton size="xs" color="primary" variant="soft" @click="navigateTo(`/admin/users/${row.id}`)">{{ $t('common.view') }}</UButton>
        <ActionButton type="delete" @click="emit('delete', row.id)" />
      </div>
    </template>
    <template #empty>
      <div class="text-center py-8 text-gray-500">
        {{ $t('users.noUsersFound') || 'No users found' }}
      </div>
    </template>
  </UTable>
</template>

