import type { Project } from '~/composables/useProjectManagement'

export type Commission = { 
  id: string
  user_id: string
  project_id: string
  client_name?: string | null
  description: string
  date: string
  status: 'requested'|'confirmed'|'paid'
  value: number
  original_value?: number | null
  currency?: string
  contract_amount?: number | null
  commission_rate?: number | null
}

export type JoinRequest = { 
  id: string
  user_id: string
  project_id: string
  message: string | null
  ref_percentage: number | null
  status: 'pending'|'approved'|'rejected'
  created_at: string
  updated_at: string | null
}

export const useProjectDetail = (projectId: Ref<string>) => {
  const supabase = useSupabaseClient()
  const { t } = useI18n()
  const { getErrorMessage } = useErrorMessage()
  const { isGlobalAdmin, canManageProject } = useAdminRole()

  // Project data
  const project = ref<Project | null>(null)
  const isLoadingPage = ref(false)

  // Role states
  const isGlobalAdminValue = ref(false)
  const canManageProjectValue = ref(false)
  const isProjectAdmin = computed(() => canManageProjectValue.value)

  // All users and admins
  const allUsers = ref<any[]>([])
  const allAdmins = ref<any[]>([])

  // Commissions and join requests
  const commissions = ref<Commission[]>([])
  const joinRequests = ref<JoinRequest[]>([])

  // Users in project
  const usersInProject = ref<string[]>([])
  const adminsInProject = ref<string[]>([])
  const userRefInfo = ref<Record<string, { ref_percentage: number, joined_at: string }>>({})

  // Date filters
  const dateFilters = reactive({
    year: new Date().getFullYear(),
    month: '',
  })

  // Computed properties
  const pendingRequests = computed(() => joinRequests.value.filter(r => r.status === 'pending'))

  const usersTableData = computed(() => {
    const result: Array<{
      user_id: string
      status: 'joined' | 'pending'
      join_request_id?: string
      message?: string | null
      ref_percentage: number
      joined_at?: string
      requested_at?: string
    }> = []
    
    // Add joined users
    for (const uid of usersInProject.value) {
      result.push({
        user_id: uid,
        status: 'joined',
        ref_percentage: userRefInfo.value[uid]?.ref_percentage || 0,
        joined_at: userRefInfo.value[uid]?.joined_at || '',
      })
    }
    
    // Add pending requests
    for (const request of pendingRequests.value) {
      if (!usersInProject.value.includes(request.user_id)) {
        result.push({
          user_id: request.user_id,
          status: 'pending',
          join_request_id: request.id,
          message: request.message,
          ref_percentage: request.ref_percentage || 10,
          requested_at: request.created_at,
        })
      }
    }
    
    return result
  })

  const filteredCommissions = computed(() => {
    const byYear = commissions.value.filter(r => (r.date || '').slice(0,4) === String(dateFilters.year))
    if (!dateFilters.month) return byYear
    return byYear.filter(r => (r.date || '').slice(0,7) === dateFilters.month)
  })

  const commissionsByUser = computed<Record<string, Commission[]>>(() => {
    const map: Record<string, Commission[]> = {}
    for (const c of filteredCommissions.value) {
      if (!map[c.user_id]) map[c.user_id] = []
      map[c.user_id].push(c)
    }
    return map
  })

  const totalCommissionByUser = computed<Record<string, { amount: number, currency: string }>>(() => {
    const totals: Record<string, { amount: number, currency: string }> = {}
    for (const c of commissions.value) {
      if (c.status === 'paid' && c.project_id === projectId.value) {
        if (!totals[c.user_id]) {
          totals[c.user_id] = { amount: 0, currency: 'VND' }
        }
        totals[c.user_id].amount += Number(c.value || 0)
      }
    }
    return totals
  })

  const availableUserOptions = computed(() => {
    const set = new Set(usersInProject.value)
    return allUsers.value
      .filter(u => !set.has(u.id))
      .map(u => ({ label: u.name || u.email, value: u.id }))
  })

  const availableAdminOptions = computed(() => {
    const set = new Set(adminsInProject.value)
    return allAdmins.value
      .filter(a => {
        if (set.has(a.id)) return false
        return a.role !== 'global_admin'
      })
      .map(a => ({ 
        label: `${a.name || a.email}${a.role ? ` (${a.role === 'project_owner' ? t('admin.projectOwner') : a.role})` : ''}`, 
        value: a.id 
      }))
  })

  const expandedUsers = ref<Set<string>>(new Set())
  const toggleExpand = (uid: string) => {
    const set = new Set(expandedUsers.value)
    if (set.has(uid)) set.delete(uid); else set.add(uid)
    expandedUsers.value = set
  }

  // Fetch functions
  const fetchProject = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, admins, commission_rate_min, commission_rate_max, policy')
      .eq('id', projectId.value)
      .single()
    
    if (error || !data) return
    
    project.value = data
    adminsInProject.value = data.admins || []
  }

  const fetchUsersInProject = async () => {
    const { data, error } = await supabase
      .from('user_project_info')
      .select('user_id, ref_percentage, created_at')
      .eq('project_id', projectId.value)
    
    if (error) return
    
    usersInProject.value = (data || []).map((r: any) => r.user_id)
    const map: Record<string, { ref_percentage: number, joined_at: string }> = {}
    for (const r of data || []) {
      map[r.user_id] = {
        ref_percentage: Number(r.ref_percentage),
        joined_at: r.created_at,
      }
    }
    userRefInfo.value = map
  }

  const fetchAllUsers = async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, email, name, created_at')
      .order('created_at', { ascending: false })
    
    if (error) return
    allUsers.value = data || []
  }

  const fetchAllAdmins = async () => {
    const { data, error } = await supabase
      .from('admins')
      .select('id, email, name, created_at, role')
      .order('created_at', { ascending: false })
    
    if (error) return
    allAdmins.value = data || []
  }

  const fetchCommissions = async () => {
    const { data, error } = await supabase
      .from('commissions')
      .select('id, user_id, project_id, client_name, description, date, status, value, original_value, currency, contract_amount, commission_rate')
      .eq('project_id', projectId.value)
      .order('date', { ascending: false })
    
    if (error) return
    
    commissions.value = (data || []).map((c: any) => ({
      id: c.id,
      user_id: c.user_id,
      project_id: c.project_id,
      client_name: c.client_name || null,
      description: c.description || '',
      date: c.date,
      status: c.status,
      value: Number(c.value),
      currency: c.currency || 'VND',
      contract_amount: c.contract_amount || null,
      commission_rate: c.commission_rate || null,
    }))
  }

  const fetchJoinRequests = async () => {
    const { data, error } = await supabase
      .from('project_join_requests')
      .select('id, user_id, project_id, message, ref_percentage, status, created_at, updated_at')
      .eq('project_id', projectId.value)
      .order('created_at', { ascending: false })
    
    if (error) return
    joinRequests.value = (data || []) as JoinRequest[]
  }

  // Join request handlers
  const approveJoinRequest = async (request: JoinRequest) => {
    if (request.status !== 'pending') return
    
    if (!isProjectAdmin.value) {
      const toast = useToast()
      toast.add({
        color: 'red',
        title: t('admin.permissionDenied'),
        description: t('admin.onlyProjectAdminsCanApproveRequests'),
      })
      return
    }
    
    const updatePayload = { status: 'approved' }
    const { error: updateError } = await (supabase as any)
      .from('project_join_requests')
      .update(updatePayload)
      .eq('id', request.id)
    
    if (updateError) return
    
    const refPercentage = request.ref_percentage || 10
    const upsertData: Record<string, any> = { 
      project_id: projectId.value, 
      user_id: request.user_id, 
      ref_percentage: refPercentage 
    }
    const { error: addError } = await (supabase as any)
      .from('user_project_info')
      .upsert(upsertData, { onConflict: 'project_id,user_id' })
    
    if (addError) return
    
    await Promise.all([fetchJoinRequests(), fetchUsersInProject()])
  }

  const rejectJoinRequest = async (request: JoinRequest) => {
    if (request.status !== 'pending') return
    
    if (!isProjectAdmin.value) {
      const toast = useToast()
      toast.add({
        color: 'red',
        title: t('admin.permissionDenied'),
        description: t('admin.onlyProjectAdminsCanRejectRequests'),
      })
      return
    }
    
    const updatePayload = { status: 'rejected' }
    const { error } = await (supabase as any)
      .from('project_join_requests')
      .update(updatePayload)
      .eq('id', request.id)
    
    if (error) return
    await fetchJoinRequests()
  }

  // Commission handlers
  const confirmCommission = async (c: Commission) => {
    if (c.status !== 'requested') return
    
    if (!isProjectAdmin.value) {
      const toast = useToast()
      toast.add({
        color: 'red',
        title: t('admin.permissionDenied'),
        description: t('admin.onlyProjectAdminsCanApproveCommissions'),
      })
      return
    }
    
    let calculatedValue = 0
    if (c.contract_amount != null && c.commission_rate != null) {
      calculatedValue = Number(c.contract_amount || 0) * (Number(c.commission_rate || 0) / 100)
    } else {
      const refInfo = userRefInfo.value[c.user_id]
      const refPercentage = refInfo?.ref_percentage || 0
      const currentOriginalValue = c.original_value != null ? Number(c.original_value || 0) : (c.contract_amount != null ? Number(c.contract_amount || 0) : 0)
      calculatedValue = currentOriginalValue * (refPercentage / 100)
    }
    
    const updatePayload: Record<string, any> = { 
      status: 'confirmed',
      value: calculatedValue,
      original_value: c.contract_amount != null ? c.contract_amount : c.original_value
    }
    
    const { error } = await (supabase as any)
      .from('commissions')
      .update(updatePayload)
      .eq('id', c.id)
    
    if (error) return
    await fetchCommissions()
  }

  // User/Admin management
  const removeUser = async (uid: string) => {
    const canRemove = isGlobalAdminValue.value || canManageProjectValue.value
    
    if (!canRemove) {
      const toast = useToast()
      toast.add({
        color: 'red',
        title: t('admin.permissionDenied'),
        description: t('admin.onlyProjectAdminsCanRemoveUsers'),
      })
      return
    }
    
    const { error } = await supabase
      .from('user_project_info')
      .delete()
      .eq('project_id', projectId.value)
      .eq('user_id', uid)
    
    if (error) {
      const toast = useToast()
      toast.add({
        color: 'red',
        title: t('messages.failedToRemove'),
        description: getErrorMessage(error),
      })
      return
    }
    
    usersInProject.value = usersInProject.value.filter(id => id !== uid)
    const set = new Set(expandedUsers.value)
    if (set.has(uid)) { set.delete(uid); expandedUsers.value = set }
    delete userRefInfo.value[uid]
    
    const toast = useToast()
    toast.add({
      color: 'green',
      title: t('messages.success'),
      description: t('messages.userRemoved'),
    })
  }

  const removeAdmin = async (uid: string, currentAdminId: string) => {
    if (uid === currentAdminId) return
    if (!project.value) return
    
    const canRemove = isGlobalAdminValue.value || canManageProjectValue.value
    
    if (!canRemove) {
      const toast = useToast()
      toast.add({
        color: 'red',
        title: t('admin.permissionDenied'),
        description: t('admin.onlyProjectAdminsCanRemoveAdmins'),
      })
      return
    }
    
    const next = (project.value.admins || []).filter(id => id !== uid)
    const { error } = await (supabase as any)
      .from('projects')
      .update({ admins: next })
      .eq('id', projectId.value)
    
    if (error) return
    
    project.value.admins = next
    adminsInProject.value = next
  }

  const handleAddUser = async (userId: string) => {
    if (!userId) return
    
    if (usersInProject.value.includes(userId)) {
      const toast = useToast()
      toast.add({
        color: 'yellow',
        title: t('messages.userAlreadyInProject'),
        description: t('messages.userAlreadyInProject'),
      })
      return
    }
    
    if (!isProjectAdmin.value) {
      const toast = useToast()
      toast.add({
        color: 'red',
        title: t('admin.permissionDenied'),
        description: t('admin.onlyProjectAdminsCanAddUsers'),
      })
      return
    }
    
    const { error } = await (supabase as any)
      .from('user_project_info')
      .upsert({ 
        project_id: projectId.value, 
        user_id: userId, 
        ref_percentage: 10 
      }, { onConflict: 'project_id,user_id' })
    
    if (error) {
      const toast = useToast()
      toast.add({
        color: 'red',
        title: t('messages.failedToAddUser'),
        description: getErrorMessage(error),
      })
      return
    }
    
    await fetchUsersInProject()
    
    const toast = useToast()
    toast.add({
      color: 'green',
      title: t('messages.success'),
      description: t('messages.userAddedToProject'),
    })
  }

  const handleAddAdmin = async (adminId: string) => {
    if (!adminId) {
      const toast = useToast()
      toast.add({
        color: 'yellow',
        title: t('messages.selectProjectOwner'),
        description: t('messages.pleaseSelectProjectOwner') || 'Please select a project owner',
      })
      return
    }
    
    if (!project.value) {
      const toast = useToast()
      toast.add({
        color: 'red',
        title: t('messages.failedToAddAdmin'),
        description: 'Project not loaded',
      })
      return
    }
    
    const canAdd = isGlobalAdminValue.value || canManageProjectValue.value
    
    if (!canAdd) {
      const toast = useToast()
      toast.add({
        color: 'red',
        title: t('admin.permissionDenied'),
        description: isGlobalAdminValue.value ? t('admin.onlyGlobalAdminsCanAddAdmins') : t('admin.onlyProjectAdminsCanAddAdmins'),
      })
      return
    }
    
    if (adminsInProject.value.includes(adminId)) {
      const toast = useToast()
      toast.add({
        color: 'yellow',
        title: t('messages.adminAlreadyInProject'),
        description: t('messages.adminAlreadyInProject'),
      })
      return
    }
    
    const adminToAdd = allAdmins.value.find(a => a.id === adminId)
    if (adminToAdd && adminToAdd.role === 'global_admin') {
      const toast = useToast()
      toast.add({
        color: 'red',
        title: t('admin.cannotAddGlobalAdmin'),
        description: t('admin.globalAdminMustBeSetManually'),
      })
      return
    }
    
    const next = Array.from(new Set([...(project.value.admins || []), adminId]))
    const { error } = await (supabase as any)
      .from('projects')
      .update({ admins: next })
      .eq('id', projectId.value)
    
    if (error) {
      const toast = useToast()
      toast.add({
        color: 'red',
        title: t('messages.failedToAddAdmin'),
        description: getErrorMessage(error),
      })
      return
    }
    
    project.value.admins = next
    adminsInProject.value = next
    
    const toast = useToast()
    toast.add({
      color: 'green',
      title: t('messages.success'),
      description: t('messages.projectOwnerAdded'),
    })
  }

  // Initialize
  const initialize = async () => {
    isLoadingPage.value = true
    isGlobalAdminValue.value = await isGlobalAdmin()
    canManageProjectValue.value = await canManageProject(projectId.value)
    
    try {
      await Promise.all([
        fetchProject(),
        fetchAllUsers(),
        fetchAllAdmins(),
        fetchUsersInProject(),
        fetchCommissions(),
        fetchJoinRequests(),
      ])
    } finally {
      isLoadingPage.value = false
    }
    
    // No need to check again, already checked at the beginning
    
    // Set default to current month/year
    const now = new Date()
    dateFilters.year = now.getFullYear()
    dateFilters.month = `${dateFilters.year}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  return {
    // State
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
    
    // Computed
    pendingRequests,
    usersTableData,
    filteredCommissions,
    commissionsByUser,
    totalCommissionByUser,
    availableUserOptions,
    availableAdminOptions,
    
    // Methods
    toggleExpand,
    fetchProject,
    fetchUsersInProject,
    fetchAllUsers,
    fetchAllAdmins,
    fetchCommissions,
    fetchJoinRequests,
    approveJoinRequest,
    rejectJoinRequest,
    confirmCommission,
    removeUser,
    removeAdmin,
    handleAddUser,
    handleAddAdmin,
    initialize,
  }
}

