<script setup lang="ts">
const { t } = useI18n()
const { formatDate, formatValue, formatStatus } = useCommissionFormatters()

interface User {
  id: string
  email: string
  name?: string | null
}

interface Commission {
  id: string
  user_id: string
  project_id: string
  client_name?: string | null
  description: string
  date: string
  status: 'requested' | 'confirmed' | 'paid'
  value: number
  original_value?: number | null
  currency?: string
  contract_amount?: number | null
  commission_rate?: number | null
}

interface JoinRequest {
  id: string
  user_id: string
  project_id: string
  message: string | null
  ref_percentage: number | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string | null
}

interface UserTableRow {
  user_id: string
  status: 'joined' | 'pending'
  join_request_id?: string
  message?: string | null
  ref_percentage: number
  joined_at?: string
  requested_at?: string
}

interface Props {
  usersTableData: UserTableRow[]
  allUsers: User[]
  joinRequests: JoinRequest[]
  commissionsByUser: Record<string, Commission[]>
  totalCommissionByUser: Record<string, { amount: number; currency: string }>
  project: {
    commission_rate_min?: number | null
    commission_rate_max?: number | null
  } | null
  userRefInfo: Record<string, { ref_percentage: number; joined_at: string }>
  expandedUsers: Set<string>
  isProjectAdmin: boolean
  isGlobalAdmin: boolean
  canManageProject: boolean
}

interface Emits {
  (e: 'add'): void
  (e: 'edit-ref', userId: string): void
  (e: 'remove', userId: string): void
  (e: 'edit-request', request: JoinRequest): void
  (e: 'approve-request', request: JoinRequest): void
  (e: 'reject-request', request: JoinRequest): void
  (e: 'toggle-expand', userId: string): void
  (e: 'edit-commission', commission: Commission): void
  (e: 'confirm-commission', commission: Commission): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const userLabel = (uid: string) => {
  const u = props.allUsers.find(x => x.id === uid)
  return u ? (u.name || u.email) : uid
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="font-medium">{{ $t('common.users') }}</h3>
        <ActionButton 
          type="create"
          :label="$t('projects.addUser')"
          size="xs"
          :disabled="!isProjectAdmin"
          :title="!isProjectAdmin ? $t('admin.onlyProjectAdminsCanAddUsers') : ''"
          @click="emit('add')"
        />
      </div>
    </template>
    <div class="overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead>
          <tr class="text-left text-gray-500 dark:text-white">
            <th class="w-10"></th>
            <th class="py-2">{{ $t('common.name') }}</th>
            <th class="py-2">{{ $t('common.email') }}</th>
            <th class="py-2">{{ $t('common.status') }}</th>
            <th class="py-2">{{ $t('projects.joinedRequested') }}</th>
            <th class="py-2">{{ $t('projects.refPercentage') }}</th>
            <th class="py-2">{{ $t('commissions.totalReceived') }}</th>
            <th class="py-2">{{ $t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <template v-if="usersTableData.length === 0">
            <tr>
              <td colspan="8" class="py-8 text-center text-gray-500 dark:text-white">
                {{ $t('projects.noUsersOrPending') }}
              </td>
            </tr>
          </template>
          <template v-else>
            <template v-for="row in usersTableData" :key="`${row.user_id}-${row.status}`">
              <tr class="border-t">
                <td class="py-2">
                  <UButton 
                    v-if="row.status === 'joined'" 
                    size="xs" 
                    color="gray" 
                    variant="soft" 
                    @click="emit('toggle-expand', row.user_id)"
                  >
                    <UIcon :name="expandedUsers.has(row.user_id) ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" />
                  </UButton>
                </td>
                <td class="py-2 font-medium">
                  <NuxtLink 
                    class="text-primary dark:text-primary hover:underline font-bold" 
                    :to="`/admin/users/${row.user_id}`"
                  >
                    {{ userLabel(row.user_id) }}
                  </NuxtLink>
                </td>
                <td class="py-2">
                  <span class="text-gray-900 dark:text-white">{{ allUsers.find(u => u.id === row.user_id)?.email || '-' }}</span>
                </td>
                <td class="py-2">
                  <UBadge 
                    :label="row.status === 'joined' ? $t('projects.joined') : $t('projects.pending')" 
                    :color="row.status === 'joined' ? 'green' : 'yellow'" 
                    variant="soft" 
                  />
                </td>
                <td class="py-2">
                  <span class="text-gray-900 dark:text-white">{{ formatDate(row.status === 'joined' ? (row.joined_at || '') : (row.requested_at || '')) }}</span>
                </td>
                <td class="py-2">
                  <span v-if="project?.commission_rate_min != null || project?.commission_rate_max != null" class="text-gray-900 dark:text-white">
                    <template v-if="project?.commission_rate_min != null && project?.commission_rate_max != null">
                      {{ project?.commission_rate_min }}% - {{ project?.commission_rate_max }}%
                    </template>
                    <template v-else>
                      {{ (project?.commission_rate_min ?? project?.commission_rate_max) }}%
                    </template>
                  </span>
                  <span v-else class="text-gray-400 dark:text-gray-500">—</span>
                </td>
                <td class="py-2">
                  <span v-if="row.status === 'joined' && totalCommissionByUser[row.user_id] && totalCommissionByUser[row.user_id].amount > 0" class="text-gray-900 dark:text-white">
                    {{ formatValue(totalCommissionByUser[row.user_id].amount, 'VND') }}
                  </span>
                  <span v-else class="text-gray-400 dark:text-gray-500">—</span>
                </td>
                <td class="py-2 flex items-center gap-2">
                  <template v-if="row.status === 'joined'">
                    <ActionButton 
                      type="edit"
                      :label="$t('projects.editRef')"
                      size="xs"
                      color="gray"
                      :disabled="!isProjectAdmin"
                      :title="!isProjectAdmin ? $t('admin.onlyProjectAdminsCanEditReferral') : ''"
                      @click="emit('edit-ref', row.user_id)"
                    />
                    <ActionButton 
                      type="remove"
                      :disabled="!isGlobalAdmin && !canManageProject"
                      :title="!isGlobalAdmin && !canManageProject ? $t('admin.onlyProjectAdminsCanRemoveUsers') : ''"
                      @click="emit('remove', row.user_id)"
                    />
                  </template>
                  <template v-else>
                    <ActionButton 
                      type="edit"
                      :disabled="!isProjectAdmin"
                      :title="!isProjectAdmin ? $t('admin.onlyProjectAdminsCanEditRequests') : ''"
                      @click="emit('edit-request', joinRequests.find(r => r.id === row.join_request_id)!)"
                    />
                    <ActionButton 
                      type="approve"
                      :disabled="!isProjectAdmin"
                      :title="!isProjectAdmin ? $t('admin.onlyProjectAdminsCanApproveRequests') : ''"
                      @click="emit('approve-request', joinRequests.find(r => r.id === row.join_request_id)!)"
                    />
                    <ActionButton 
                      type="reject"
                      :disabled="!isProjectAdmin"
                      :title="!isProjectAdmin ? $t('admin.onlyProjectAdminsCanRejectRequests') : ''"
                      @click="emit('reject-request', joinRequests.find(r => r.id === row.join_request_id)!)"
                    />
                  </template>
                </td>
              </tr>
              <tr v-show="row.status === 'joined' && expandedUsers.has(row.user_id)" class="bg-gray-50/40">
                <td></td>
                <td class="py-2" :colspan="7">
                  <UTable 
                    :rows="commissionsByUser[row.user_id] || []" 
                    :columns="[
                      { key: 'date', label: $t('common.date') },
                      { key: 'client_name', label: $t('commissions.clientName') },
                      { key: 'description', label: $t('common.description') },
                      { key: 'value', label: $t('commissions.contractAmount') },
                      { key: 'commission_rate', label: $t('commissions.commissionRate') },
                      { key: 'commission_received', label: $t('commissions.commissionAmount') },
                      { key: 'status', label: $t('common.status') },
                      { key: 'actions', label: $t('common.actions') },
                    ]"
                  >
                    <template #date-data="{ row: c }">
                      <span class="text-gray-900 dark:text-white">{{ formatDate(c.date) }}</span>
                    </template>
                    <template #client_name-data="{ row: c }">
                      <span class="text-gray-900 dark:text-white">{{ c.client_name || '—' }}</span>
                    </template>
                    <template #description-data="{ row: c }">
                      <span class="text-gray-900 dark:text-white">{{ c.description || '—' }}</span>
                    </template>
                    <template #value-data="{ row: c }">
                      <span class="text-gray-900 dark:text-white">{{ formatValue(c.contract_amount != null ? c.contract_amount : (c.original_value != null ? c.original_value : c.value), c.currency || 'VND') }}</span>
                    </template>
                    <template #commission_rate-data="{ row: c }">
                      <span class="text-gray-900 dark:text-white">{{ c.commission_rate != null ? `${c.commission_rate}%` : '—' }}</span>
                    </template>
                    <template #commission_received-data="{ row: c }">
                      <span class="text-gray-900 dark:text-white">
                        {{ formatValue((() => {
                          if (c.status === 'confirmed' || c.status === 'paid') return c.value
                          if (c.contract_amount != null && c.commission_rate != null) {
                            return Number(c.contract_amount || 0) * (Number(c.commission_rate || 0) / 100)
                          }
                          const ref = userRefInfo[c.user_id]?.ref_percentage || 0
                          if (ref > 0) {
                            const base = c.original_value != null ? c.original_value : c.value
                            return base * (ref / 100)
                          }
                          return c.value
                        })(), c.currency || 'VND') }}
                      </span>
                    </template>
                    <template #status-data="{ row: c }">
                      <UBadge :label="formatStatus(c.status || 'unknown')" :color="c.status === 'paid' ? 'green' : (c.status === 'confirmed' ? 'blue' : 'yellow')" variant="soft" />
                    </template>
                    <template #actions-data="{ row: c }">
                      <div class="flex gap-2">
                        <ActionButton 
                          v-if="isProjectAdmin && c.status !== 'paid'"
                          type="edit"
                          @click="emit('edit-commission', c)"
                        />
                        <ActionButton 
                          v-if="isProjectAdmin && c.status === 'requested'"
                          type="approve"
                          @click="emit('confirm-commission', c)"
                        />
                      </div>
                    </template>
                    <template #empty>
                      <div class="text-sm text-gray-500 dark:text-white py-4 text-center">{{ $t('commissions.noCommissions') }}</div>
                    </template>
                  </UTable>
                </td>
              </tr>
            </template>
          </template>
        </tbody>
      </table>
    </div>
  </UCard>
</template>

