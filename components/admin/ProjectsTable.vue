<script setup lang="ts">
import type { Project as BaseProject } from '~/composables/useProjectManagement'

const { t } = useI18n()

interface Project extends BaseProject {
  usersCount: number
  adminsCount: number
}

interface Props {
  projects: Project[]
  loading?: boolean
  isGlobalAdmin?: boolean
  projectPermissions?: Record<string, boolean>
  showDelete?: boolean
  adminsLabel?: string // "projectOwners" or "admins"
}

interface Emits {
  (e: 'manage-users', project: BaseProject): void
  (e: 'manage-admins', project: BaseProject): void
  (e: 'edit', project: BaseProject): void
  (e: 'delete', project: BaseProject): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  isGlobalAdmin: false,
  projectPermissions: () => ({}),
  showDelete: true,
  adminsLabel: 'projectOwners',
})

const emit = defineEmits<Emits>()

// Wrapper functions to handle async handlers
const handleManageUsers = (project: Project) => {
  emit('manage-users', project as BaseProject)
}

const handleManageAdmins = (project: Project) => {
  emit('manage-admins', project as BaseProject)
}

const handleEdit = (project: Project) => {
  emit('edit', project as BaseProject)
}

const handleDelete = (project: Project) => {
  emit('delete', project as BaseProject)
}

const columns = computed(() => [
  { key: 'name', label: t('common.project') },
  { key: 'commissionRate', label: t('projects.commissionRateRange') },
  { key: 'usersCount', label: t('common.users') },
  { key: 'adminsCount', label: props.adminsLabel === 'projectOwners' ? t('projects.projectOwners') : t('common.admins') },
  { key: 'actions', label: t('common.actions') },
])

const canManageProjectSync = (project: Project) => {
  if (props.projectPermissions && props.projectPermissions[project.id] !== undefined) {
    return props.projectPermissions[project.id]
  }
  return props.isGlobalAdmin
}
</script>

<template>
  <div v-if="props.loading" class="flex items-center justify-center py-12">
    <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-gray-400" />
    <span class="ml-3 text-gray-500">{{ $t('common.loading') || 'Loading...' }}</span>
  </div>
  <UTable v-else :rows="projects" :columns="columns">
    <template #name-data="{ row }">
      <NuxtLink class="text-primary dark:text-primary font-bold hover:underline" :to="{ name: 'admin-projects-id', params: { id: row.id } }">{{ row.name }}</NuxtLink>
    </template>
    <template #commissionRate-data="{ row }">
      <span v-if="row.commission_rate_min != null || row.commission_rate_max != null" class="text-sm text-gray-900 dark:text-white">
        {{ row.commission_rate_min != null ? `${row.commission_rate_min}%` : '' }}
        <span v-if="row.commission_rate_min != null && row.commission_rate_max != null"> - </span>
        {{ row.commission_rate_max != null ? `${row.commission_rate_max}%` : '' }}
      </span>
      <span v-else class="text-gray-400 dark:text-gray-500 text-sm">—</span>
    </template>
    <template #usersCount-data="{ row }">
      <span class="text-gray-900 dark:text-white">{{ row.usersCount }}</span>
    </template>
    <template #adminsCount-data="{ row }">
      <span class="text-gray-900 dark:text-white">{{ row.adminsCount }}</span>
    </template>
    <template #actions-data="{ row }">
      <div class="flex gap-2">
        <ActionButton 
          type="create"
          :label="$t('projects.addUsers')"
          size="xs"
          :disabled="!canManageProjectSync(row)"
          :title="!canManageProjectSync(row) ? (isGlobalAdmin ? $t('admin.onlyGlobalAdminsCanManageUsers') : $t('admin.onlyProjectAdminsCanManageUsers')) : ''"
          @click="handleManageUsers(row)"
        />
        <ActionButton 
          type="create"
          :label="$t('projects.addAdmins')"
          size="xs"
          color="blue"
          :disabled="!canManageProjectSync(row)"
          :title="!canManageProjectSync(row) ? (isGlobalAdmin ? $t('admin.onlyGlobalAdminsCanManageAdmins') : $t('admin.onlyProjectAdminsCanManageAdmins')) : ''"
          @click="handleManageAdmins(row)"
        />
        <ActionButton 
          type="edit"
          :disabled="!canManageProjectSync(row)"
          :title="!canManageProjectSync(row) ? (isGlobalAdmin ? $t('admin.onlyGlobalAdminsCanEdit') : $t('admin.onlyProjectAdminsCanEdit')) : ''"
          @click="handleEdit(row)"
        />
        <ActionButton 
          v-if="showDelete"
          type="delete"
          :disabled="!canManageProjectSync(row) || !isGlobalAdmin"
          :title="!isGlobalAdmin ? $t('admin.onlyGlobalAdminsCanDelete') || 'Only global admins can delete projects' : (!canManageProjectSync(row) ? $t('admin.onlyProjectAdminsCanDelete') : '')"
          @click="handleDelete(row)"
        />
      </div>
    </template>
    <template #empty>
      <div class="text-center py-8 text-gray-500">
        {{ $t('projects.noProjectsAvailable') || 'No projects found' }}
      </div>
    </template>
  </UTable>
</template>

