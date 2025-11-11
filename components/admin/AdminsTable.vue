<script setup lang="ts">
const { t } = useI18n()
const { formatDate } = useCommissionFormatters()

interface Admin {
  id: string
  email: string
  name?: string | null
  role?: string | null
  created_at: string
}

interface Props {
  admins: Admin[]
  loading?: boolean
  isGlobalAdmin?: boolean
  currentAdminId?: string | null
  isRemoving?: boolean
}

interface Emits {
  (e: 'remove', adminId: string): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  isGlobalAdmin: false,
  currentAdminId: null,
  isRemoving: false,
})

const emit = defineEmits<Emits>()

const columns = computed(() => [
  { key: 'name', label: t('common.name') },
  { key: 'email', label: t('common.email') },
  { key: 'role', label: t('common.role') || 'Role' },
  { key: 'created_at', label: t('projects.created') },
  { key: 'actions', label: t('common.actions') },
])
</script>

<template>
  <div v-if="props.loading" class="flex items-center justify-center py-12">
    <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-gray-400" />
    <span class="ml-3 text-gray-500">{{ $t('common.loading') || 'Loading...' }}</span>
  </div>
  <UTable v-else :rows="admins" :columns="columns">
    <template #name-data="{ row }">
      <span class="text-gray-900 dark:text-white">{{ row.name || row.email }}</span>
    </template>
    <template #email-data="{ row }">
      <span class="text-gray-900 dark:text-white">{{ row.email }}</span>
    </template>
    <template #role-data="{ row }">
      <UBadge 
        v-if="row.role === 'global_admin'" 
        color="blue" 
        variant="soft"
        size="xs"
      >
        {{ $t('admin.globalAdmin') || 'Global Admin' }}
      </UBadge>
      <UBadge 
        v-else-if="row.role === 'project_owner'" 
        color="gray" 
        variant="soft"
        size="xs"
      >
        {{ $t('admin.projectOwner') }}
      </UBadge>
      <span v-else class="text-gray-400 dark:text-gray-500 text-sm">—</span>
    </template>
    <template #created_at-data="{ row }">
      <span class="text-gray-900 dark:text-white">{{ formatDate(row.created_at) }}</span>
    </template>
    <template #actions-data="{ row }">
      <UButton 
        v-if="isGlobalAdmin && row.role === 'project_owner' && row.id !== currentAdminId"
        size="xs" 
        color="red" 
        variant="soft" 
        :loading="isRemoving"
        :disabled="isRemoving"
        :title="$t('admin.removeProjectOwnerFromAllProjects')"
        @click="emit('remove', row.id)"
      >
        {{ $t('common.remove') }}
      </UButton>
      <span v-else-if="row.role === 'global_admin' || row.id === currentAdminId" class="text-gray-400 dark:text-gray-500 text-sm">
        -
      </span>
    </template>
    <template #empty>
      <div class="text-center py-8 text-gray-500">
        {{ $t('users.noAdminsFound') || 'No admins found' }}
      </div>
    </template>
  </UTable>
</template>

