<script setup lang="ts">
const { t } = useI18n()
const { formatDate } = useCommissionFormatters()

interface Admin {
  id: string
  email: string
  name?: string | null
  role?: string | null
  created_at?: string
}

interface Props {
  adminsInProject: string[]
  allAdmins: Admin[]
  currentAdminId: string
  isGlobalAdmin: boolean
  canManageProject: boolean
}

interface Emits {
  (e: 'add'): void
  (e: 'remove', adminId: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const adminLabel = (uid: string) => {
  const a = props.allAdmins.find(x => x.id === uid)
  return a ? (a.name || a.email) : uid
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="font-medium">{{ $t('projects.projectOwners') }}</h3>
        <ActionButton 
          type="create"
          :label="$t('projects.addProjectOwner')"
          size="xs"
          :disabled="!isGlobalAdmin && !canManageProject"
          :title="(!isGlobalAdmin && !canManageProject) ? $t('admin.onlyProjectAdminsCanAddAdmins') : ''"
          @click="emit('add')"
        />
      </div>
    </template>
    <UTable :rows="adminsInProject.map(uid => ({ uid }))" :columns="[
      { key: 'name', label: $t('common.name') },
      { key: 'email', label: $t('common.email') },
      { key: 'role', label: $t('common.role') || 'Role' },
      { key: 'joined', label: $t('common.joined') },
      { key: 'actions', label: $t('common.actions') },
    ]">
      <template #name-data="{ row }">
        <span class="text-gray-900 dark:text-white">{{ adminLabel(row.uid) }}</span>
      </template>
      <template #role-data="{ row }">
        <UBadge 
          v-if="allAdmins.find(a => a.id === row.uid)?.role === 'global_admin'" 
          color="blue" 
          variant="soft"
          size="xs"
        >
          {{ $t('admin.globalAdmin') || 'Global Admin' }}
        </UBadge>
        <UBadge 
          v-else-if="allAdmins.find(a => a.id === row.uid)?.role === 'project_owner'" 
          color="gray" 
          variant="soft"
          size="xs"
        >
          {{ $t('admin.projectOwner') }}
        </UBadge>
        <span v-else class="text-gray-400 dark:text-gray-500 text-sm">—</span>
      </template>
      <template #email-data="{ row }">
        <span class="text-gray-900 dark:text-white">{{ allAdmins.find(a => a.id === row.uid)?.email || '-' }}</span>
      </template>
      <template #joined-data="{ row }">
        <span class="text-gray-900 dark:text-white">{{ formatDate(allAdmins.find(a => a.id === row.uid)?.created_at || '') }}</span>
      </template>
      <template #actions-data="{ row }">
        <ActionButton 
          type="remove"
          :disabled="row.uid === currentAdminId || (!isGlobalAdmin && !canManageProject)"
          :title="!isGlobalAdmin && !canManageProject ? $t('admin.onlyProjectAdminsCanRemoveAdmins') : ''"
          @click="emit('remove', row.uid)"
        />
      </template>
    </UTable>
  </UCard>
</template>

