/**
 * Composable for checking admin roles
 * 
 * Role System:
 * - Global Admin: Has entry in admins table with role='global_admin', can manage ALL projects
 * - Project Owner: Listed in projects.admins array, can manage ONLY their assigned projects
 * 
 * Usage:
 *   const { isGlobalAdmin, isProjectOwner, canManageProject } = useAdminRole()
 *   if (await isGlobalAdmin()) { ... }
 *   if (await isProjectOwner(projectId)) { ... }
 *   if (await canManageProject(projectId)) { ... }
 */
export const useAdminRole = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  /**
   * Check if current user is a global admin
   * Global admins can manage all projects and users
   */
  const isGlobalAdmin = async (): Promise<boolean> => {
    if (!user.value) return false
    
    const { data, error } = await supabase
      .rpc('is_global_admin', { user_id: user.value.id })
    
    if (error) {
      return false
    }
    
    return data || false
  }

  /**
   * Check if current user is project owner (admin) of a specific project
   * Project owners are listed in projects.admins array
   */
  const isProjectOwner = async (projectId: string): Promise<boolean> => {
    if (!user.value || !projectId) return false
    
    const { data, error } = await supabase
      .rpc('is_project_owner', { 
        user_id: user.value.id,
        project_id_param: projectId
      })
    
    if (error) {
      return false
    }
    
    return data || false
  }

  /**
   * Check if current user can manage a specific project
   * Returns true if user is either:
   * - Global admin (can manage all projects), OR
   * - Project owner of the specified project
   */
  const canManageProject = async (projectId: string): Promise<boolean> => {
    if (!user.value || !projectId) return false
    
    const { data, error } = await supabase
      .rpc('can_manage_project', { 
        user_id: user.value.id,
        project_id_param: projectId
      })
    
    if (error) {
      return false
    }
    
    return data || false
  }

  /**
   * Check if current user is in admins table (any role)
   * This is for backward compatibility
   */
  const isAdmin = async (): Promise<boolean> => {
    if (!user.value) return false
    
    const { data, error } = await supabase
      .from('admins')
      .select('id')
      .eq('id', user.value.id)
      .maybeSingle()
    
    if (error) {
      return false
    }
    
    return !!data
  }

  return {
    isGlobalAdmin,
    isProjectOwner,
    canManageProject,
    isAdmin, // backward compatibility
  }
}

