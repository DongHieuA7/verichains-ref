import type { SupabaseClient } from '@supabase/supabase-js'

export type Project = { 
  id: string
  name: string
  admins: string[]
  commission_rate_min?: number | null
  commission_rate_max?: number | null
  policy?: string | null
}

export const useProjectManagement = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const currentAdminId = computed(() => user.value?.id || '')
  const { isGlobalAdmin, canManageProject } = useAdminRole()
  const { getErrorMessage } = useErrorMessage()

  // Check if current user can manage a project (Global Admin or Project Owner)
  const canManageProjectSync = (project: Project | null, projectPermissions?: Record<string, boolean>): boolean => {
    if (!project || !currentAdminId.value) return false
    // Use cached permission if available
    if (projectPermissions && projectPermissions[project.id] !== undefined) {
      return projectPermissions[project.id]
    }
    // Fallback: check if in admins array (for Project Owner)
    return (project.admins || []).includes(currentAdminId.value)
  }

  // Backward compatibility - check if user is project owner (not global admin)
  const isProjectAdmin = (project: Project | null, isGlobalAdminValue: boolean): boolean => {
    if (!project || !currentAdminId.value) return false
    // If global admin, return true
    if (isGlobalAdminValue) return true
    // Otherwise check if in admins array
    return (project.admins || []).includes(currentAdminId.value)
  }

  // Display user name/email
  const displayUser = (uid: string, allUsers: Array<{ id: string; name?: string | null; email: string }>) => {
    const u = allUsers.find(x => x.id === uid)
    return u ? (u.name || u.email) : uid
  }

  // Display admin name/email
  const displayAdmin = (uid: string, allAdmins: Array<{ id: string; name?: string | null; email: string }>) => {
    const a = allAdmins.find(x => x.id === uid)
    return a ? (a.name || a.email) : uid
  }

  // Fetch project users
  const fetchProjectUsers = async (projectId: string): Promise<string[]> => {
    const { data } = await supabase
      .from('user_project_info')
      .select('user_id')
      .eq('project_id', projectId)
    return (data || []).map((r: any) => r.user_id)
  }

  // Refresh user counts
  const refreshCounts = async (): Promise<Record<string, number>> => {
    const { data } = await supabase.from('user_project_info').select('project_id, user_id')
    const counts: Record<string, number> = {}
    ;(data || []).forEach(r => { counts[r.project_id] = (counts[r.project_id] || 0) + 1 })
    return counts
  }

  return {
    currentAdminId,
    isGlobalAdmin,
    canManageProject,
    canManageProjectSync,
    isProjectAdmin,
    displayUser,
    displayAdmin,
    fetchProjectUsers,
    refreshCounts,
    getErrorMessage,
  }
}

