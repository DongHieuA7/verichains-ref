<script setup lang="ts">
import type { Commission, JoinRequest } from '~/composables/useProjectDetail'

const { t } = useI18n()

definePageMeta({ middleware: ['auth','admin'] })
useSeoMeta({ title: t('admin.projectDetail') })

const route = useRoute()
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const projectId = computed(() => route.params.id as string)
const currentAdminId = computed(() => user.value?.id || '')
const { getErrorMessage } = useErrorMessage()

// Use composable for project detail logic
const projectDetail = useProjectDetail(projectId)

// Destructure from composable
const {
  project,
  isLoadingPage,
  isGlobalAdminValue,
  canManageProjectValue,
  isProjectAdmin,
  allUsers,
  allAdmins,
  commissions,
  joinRequests,
  usersInProject,
  adminsInProject,
  userRefInfo,
  dateFilters,
  expandedUsers,
  usersTableData,
  filteredCommissions,
  commissionsByUser,
  totalCommissionByUser,
  availableUserOptions,
  availableAdminOptions,
  toggleExpand,
  fetchJoinRequests,
  fetchUsersInProject,
  fetchCommissions,
  approveJoinRequest,
  rejectJoinRequest,
  confirmCommission,
  removeUser,
  removeAdmin,
  handleAddUser,
  handleAddAdmin,
  initialize,
} = projectDetail

// Edit Ref % modal
const isEditRefOpen = ref(false)
const editRefUserId = ref<string | null>(null)
const isAddUserOpen = ref(false)
const isAddAdminOpen = ref(false)
const isEditRequestOpen = ref(false)
const editRequestId = ref<string | null>(null)
const isEditPolicyOpen = ref(false)
const isEditCommissionRateRangeOpen = ref(false)
const isEditCommissionOpen = ref(false)
const manageState = reactive<{ addUser?: string, addAdmin?: string }>({})

// Confirm delete modals
const isConfirmRemoveUserOpen = ref(false)
const isConfirmRemoveAdminOpen = ref(false)
const userToRemove = ref<string | null>(null)
const adminToRemove = ref<string | null>(null)

// Wrapper for handleAddUser to close modal
const handleAddUserWrapper = async (userId: string) => {
  await handleAddUser(userId)
    isAddUserOpen.value = false
    manageState.addUser = undefined
}

// Wrapper for handleAddAdmin to close modal
const handleAddAdminWrapper = async (adminId: string) => {
  await handleAddAdmin(adminId)
    isAddAdminOpen.value = false
    manageState.addAdmin = undefined
}

// Wrapper for removeUser to show confirm dialog
const removeUserWrapper = (uid: string) => {
  userToRemove.value = uid
  isConfirmRemoveUserOpen.value = true
}

// Wrapper for removeAdmin to show confirm dialog
const removeAdminWrapper = (uid: string) => {
  adminToRemove.value = uid
  isConfirmRemoveAdminOpen.value = true
}

// Confirm and remove user
const confirmRemoveUser = async () => {
  if (userToRemove.value) {
    await removeUser(userToRemove.value)
    isConfirmRemoveUserOpen.value = false
    userToRemove.value = null
  }
}

// Confirm and remove admin
const confirmRemoveAdmin = async () => {
  if (adminToRemove.value) {
    await removeAdmin(adminToRemove.value, currentAdminId.value)
    isConfirmRemoveAdminOpen.value = false
    adminToRemove.value = null
  }
}
const editCommissionDraft = reactive<{ 
  id: string, 
  client_name: string, 
  description: string, 
  contract_amount: number | null, 
  commission_rate: number | null, 
  status: 'requested' | 'confirmed' | 'paid' 
}>({ 
  id: '', 
  client_name: '', 
  description: '', 
  contract_amount: null, 
  commission_rate: null, 
  status: 'requested' 
})
const openEditRequest = (request: JoinRequest) => {
  editRequestId.value = request.id
  isEditRequestOpen.value = true
}

const handleEditRequestSaved = async () => {
  await fetchJoinRequests()
}

const openEditRef = (uid: string) => {
  editRefUserId.value = uid
  isEditRefOpen.value = true
}

const handleEditRefSaved = async () => {
  await fetchUsersInProject()
}

onMounted(async () => {
  await initialize()
})

const openEditPolicy = () => {
  isEditPolicyOpen.value = true
}

const handleEditPolicySaved = (newPolicy: string | null) => {
  if (project.value) {
    project.value.policy = newPolicy
  }
}

const openEditCommissionRateRange = () => {
  isEditCommissionRateRangeOpen.value = true
}

const handleEditCommissionRateRangeSaved = (min: number | null, max: number | null) => {
  if (project.value) {
    project.value.commission_rate_min = min
    project.value.commission_rate_max = max
  }
}

// Open edit commission modal
const openEditCommission = (row: Commission) => {
  if (!row || !row.id) return
  
  if (!isProjectAdmin.value) {
    const toast = useToast()
    toast.add({
      color: 'red',
      title: t('admin.permissionDenied'),
      description: t('admin.onlyProjectAdminsCanEdit'),
    })
    return
  }
  
  editCommissionDraft.id = row.id || ''
  editCommissionDraft.contract_amount = row.contract_amount != null 
    ? Number(row.contract_amount) 
    : (row.original_value != null) 
      ? Number(row.original_value) 
      : null
  editCommissionDraft.commission_rate = row.commission_rate != null 
    ? Number(row.commission_rate) 
    : null
  editCommissionDraft.status = row.status || 'requested'
  editCommissionDraft.client_name = (row.client_name != null) ? String(row.client_name) : ''
  editCommissionDraft.description = (row.description != null) ? String(row.description) : ''
  
  isEditCommissionOpen.value = true
}

// Status options for edit commission modal (hide 'requested' if current status is confirmed or paid)
const commissionStatusOptions = computed(() => {
  const currentStatus = editCommissionDraft.status
  const allOptions = [
    { label: t('commissions.requested'), value: 'requested' },
    { label: t('commissions.confirmed'), value: 'confirmed' },
    { label: t('commissions.paid'), value: 'paid' },
  ]
  
  // If current status is confirmed or paid, hide 'requested' option
  if (currentStatus === 'confirmed' || currentStatus === 'paid') {
    return allOptions.filter(opt => opt.value !== 'requested')
  }
  
  return allOptions
})

// Save commission
const saveCommission = async () => {
  if (!editCommissionDraft.id || !isProjectAdmin.value) return
  
  try {
    let calculatedValue = 0
    
    // Validate commission_rate within project's allowed range
    if (project.value) {
      const min = project.value.commission_rate_min != null ? Number(project.value.commission_rate_min) : 0
      const max = project.value.commission_rate_max != null ? Number(project.value.commission_rate_max) : 100
      if (editCommissionDraft.commission_rate != null) {
        if (editCommissionDraft.commission_rate < min) editCommissionDraft.commission_rate = min
        if (editCommissionDraft.commission_rate > max) editCommissionDraft.commission_rate = max
      }
    }

    // Calculate value based on contract_amount and commission_rate (never set manually)
    if (editCommissionDraft.contract_amount != null && editCommissionDraft.commission_rate != null) {
      calculatedValue = Number(editCommissionDraft.contract_amount || 0) * (Number(editCommissionDraft.commission_rate || 0) / 100)
    } else if (editCommissionDraft.contract_amount != null) {
      // If only contract_amount, calculate using ref_percentage when status changes to confirmed
      const currentCommission = commissions.value.find(c => c.id === editCommissionDraft.id)
      if (currentCommission && editCommissionDraft.status === 'confirmed') {
        const refInfo = userRefInfo.value[currentCommission.user_id]
        const refPercentage = refInfo?.ref_percentage || 0
        calculatedValue = Number(editCommissionDraft.contract_amount || 0) * (refPercentage / 100)
      }
    }
    
    const updateData: Record<string, any> = {
      client_name: editCommissionDraft.client_name || null,
      description: editCommissionDraft.description || null,
      contract_amount: editCommissionDraft.contract_amount || null,
      commission_rate: editCommissionDraft.commission_rate || null,
      status: editCommissionDraft.status,
      original_value: editCommissionDraft.contract_amount || null,
    }
    
    // Only update value if calculated (never set manually)
    // For confirmed/paid status, if value was already calculated, keep it; otherwise calculate
    if (calculatedValue > 0) {
      updateData.value = calculatedValue
    } else if (editCommissionDraft.status === 'confirmed' || editCommissionDraft.status === 'paid') {
      // For confirmed/paid, if no calculation possible, try to calculate from existing data
      const currentCommission = commissions.value.find(c => c.id === editCommissionDraft.id)
      if (currentCommission) {
        if (currentCommission.contract_amount != null && currentCommission.commission_rate != null) {
          updateData.value = Number(currentCommission.contract_amount || 0) * (Number(currentCommission.commission_rate || 0) / 100)
        } else if (currentCommission.contract_amount != null || currentCommission.original_value != null) {
          const refInfo = userRefInfo.value[currentCommission.user_id]
          const refPercentage = refInfo?.ref_percentage || 0
          const originalValue = currentCommission.contract_amount != null ? Number(currentCommission.contract_amount || 0) : (currentCommission.original_value != null ? Number(currentCommission.original_value || 0) : 0)
          if (originalValue > 0) {
            updateData.value = originalValue * (refPercentage / 100)
          }
        }
      }
    }
    
    const { error } = await (supabase as any)
      .from('commissions')
      .update(updateData)
      .eq('id', editCommissionDraft.id)
    
    if (error) throw error
    
    await fetchCommissions()
    isEditCommissionOpen.value = false
    
    const toast = useToast()
    toast.add({
      color: 'green',
      title: t('common.save'),
      description: t('messages.success'),
    })
  } catch (error: any) {
    const toast = useToast()
    toast.add({
      color: 'red',
      title: t('messages.failedToUpdate'),
      description: getErrorMessage(error),
    })
  }
}
</script>

<template>
  <div class="container mx-auto">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <NuxtLink class="text-sm text-gray-500 dark:text-white hover:underline" to="/admin/projects">← {{ $t('common.back') }}</NuxtLink>
            <h2 class="font-semibold">{{ $t('admin.projectDetailTitle', { name: project?.name || projectId }) }}</h2>
          </div>
          <CommissionFilters
            v-model="dateFilters"
            :show-year="true"
            :show-month="true"
            layout="header"
            :show-labels="true"
          />
        </div>
      </template>

      <div v-if="isLoadingPage" class="flex items-center justify-center py-12">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-gray-400" />
        <span class="ml-3 text-gray-500">{{ $t('common.loading') || 'Loading...' }}</span>
      </div>

      <div v-else class="grid grid-cols-1 gap-6">
        <!-- Policy Section -->
        <AdminProjectsPolicyCard
          :policy="project?.policy"
          :is-project-admin="isProjectAdmin"
          @edit="openEditPolicy"
        />

        <!-- Commission Rate Range Section -->
        <AdminProjectsCommissionRateRangeCard
          :commission-rate-min="project?.commission_rate_min"
          :commission-rate-max="project?.commission_rate_max"
          :is-project-admin="isProjectAdmin"
          @edit="openEditCommissionRateRange"
        />

        <!-- Project Owners Section -->
        <AdminProjectsOwnersCard
          :admins-in-project="adminsInProject"
          :all-admins="allAdmins"
          :current-admin-id="currentAdminId"
          :is-global-admin="isGlobalAdminValue"
          :can-manage-project="canManageProjectValue"
          @add="isAddAdminOpen = true"
          @remove="removeAdminWrapper"
        />

        <!-- Users Section -->
        <AdminProjectsUsersCard
          :users-table-data="usersTableData"
          :all-users="allUsers"
          :join-requests="joinRequests"
          :commissions-by-user="commissionsByUser"
          :total-commission-by-user="totalCommissionByUser"
          :project="project"
          :user-ref-info="userRefInfo"
          :expanded-users="expandedUsers"
          :is-project-admin="isProjectAdmin"
          :is-global-admin="isGlobalAdminValue"
          :can-manage-project="canManageProjectValue"
          @add="isAddUserOpen = true"
          @edit-ref="openEditRef"
          @remove="removeUserWrapper"
          @edit-request="openEditRequest"
          @approve-request="approveJoinRequest"
          @reject-request="rejectJoinRequest"
          @toggle-expand="toggleExpand"
          @edit-commission="openEditCommission"
          @confirm-commission="confirmCommission"
        />
      </div>

      <AdminProjectsAddMemberModal
        v-model="isAddUserOpen"
        :title="$t('projects.addUserToProject')"
        :label="$t('projects.selectUser')"
        :placeholder="$t('projects.selectUser')"
        :options="availableUserOptions"
        v-model:selected-value="manageState.addUser"
        :existing-items="usersInProject"
        :disabled="!isProjectAdmin"
        :disabled-title="!isProjectAdmin ? $t('admin.onlyProjectAdminsCanAddUsers') : ''"
        @add="handleAddUserWrapper"
        @cancel="manageState.addUser = undefined"
      />

      <AdminProjectsAddMemberModal
        v-model="isAddAdminOpen"
        :title="$t('projects.addProjectOwnerToProject')"
        :label="$t('projects.selectProjectOwner')"
        :placeholder="$t('projects.selectProjectOwner')"
        :options="availableAdminOptions"
        v-model:selected-value="manageState.addAdmin"
        :existing-items="adminsInProject"
        :disabled="!project || (!isGlobalAdminValue && !canManageProjectValue)"
        :disabled-title="(!isGlobalAdminValue && !canManageProjectValue) ? $t('admin.onlyProjectAdminsCanAddAdmins') : ''"
        @add="handleAddAdminWrapper"
        @cancel="manageState.addAdmin = undefined"
      />
      

      <AdminProjectsEditReferralPercentageModal
        v-model="isEditRefOpen"
        :user-id="editRefUserId"
        :initial-value="editRefUserId ? (userRefInfo[editRefUserId]?.ref_percentage ?? null) : null"
        :project-id="projectId"
        :commission-rate-min="project?.commission_rate_min"
        :commission-rate-max="project?.commission_rate_max"
        :is-project-admin="isProjectAdmin"
        @saved="handleEditRefSaved"
      />

      <AdminProjectsEditJoinRequestModal
        v-model="isEditRequestOpen"
        :request-id="editRequestId"
        :initial-ref-percentage="editRequestId ? (joinRequests.find(r => r.id === editRequestId)?.ref_percentage || 10) : null"
        :project-id="projectId"
        :commission-rate-min="project?.commission_rate_min"
        :commission-rate-max="project?.commission_rate_max"
        :is-project-admin="isProjectAdmin"
        @saved="handleEditRequestSaved"
      />

      <AdminProjectsEditPolicyModal
        v-model="isEditPolicyOpen"
        :initial-policy="project?.policy"
        :project-id="projectId"
        :is-project-admin="isProjectAdmin"
        @saved="handleEditPolicySaved"
      />

      <AdminProjectsEditCommissionRateRangeModal
        v-model="isEditCommissionRateRangeOpen"
        :initial-commission-rate-min="project?.commission_rate_min"
        :initial-commission-rate-max="project?.commission_rate_max"
        :project-id="projectId"
        :is-project-admin="isProjectAdmin"
        @saved="handleEditCommissionRateRangeSaved"
      />

      <CommissionsModal
        v-model="isEditCommissionOpen"
        :title="$t('commissions.editCommission')"
        :draft="(editCommissionDraft as any)"
        :show-project="false"
        :show-status="true"
        :status-options="commissionStatusOptions"
        :show-rate="true"
        :min-rate="project?.commission_rate_min ?? 0"
        :max-rate="project?.commission_rate_max ?? 100"
        :show-calculated-hint="true"
        currency="VND"
        confirm-type="save"
        @update:draft="val => Object.assign(editCommissionDraft, val)"
        @cancel="() => { isEditCommissionOpen = false }"
        @confirm="saveCommission"
      />

      <!-- Confirm Remove User Modal -->
      <AdminConfirmDialog
        v-model="isConfirmRemoveUserOpen"
        :title="$t('projects.removeUser')"
        :message="$t('projects.removeUserConfirm')"
        :item-name="userToRemove ? (allUsers.find(u => u.id === userToRemove)?.name || allUsers.find(u => u.id === userToRemove)?.email || userToRemove) : null"
        action-type="remove"
        @confirm="confirmRemoveUser"
      />

      <!-- Confirm Remove Admin Modal -->
      <AdminConfirmDialog
        v-model="isConfirmRemoveAdminOpen"
        :title="$t('projects.removeAdmin')"
        :message="$t('projects.removeAdminConfirm')"
        :item-name="adminToRemove ? (allAdmins.find(a => a.id === adminToRemove)?.name || allAdmins.find(a => a.id === adminToRemove)?.email || adminToRemove) : null"
        action-type="remove"
        @confirm="confirmRemoveAdmin"
      />
    </UCard>
  </div>
</template>

<style scoped></style>

