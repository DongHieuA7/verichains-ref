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

// Module-level cache for isGlobalAdmin result (shared across all instances)
let isGlobalAdminCache: { userId: string | null, value: boolean | null, promise: Promise<boolean> | null } = { 
  userId: null, 
  value: null,
  promise: null
}

export const useAdminRole = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  /**
   * Get current admin/user ID
   */
  const currentAdminId = computed(() => user.value?.id || null)

  // Watch user changes and reset cache
  watch(user, () => {
    isGlobalAdminCache = { userId: null, value: null, promise: null }
  })

  /**
   * Check if current user is a global admin
   * Global admins can manage all projects and users
   */
  const isGlobalAdmin = async (): Promise<boolean> => {
    if (!user.value) {
      isGlobalAdminCache = { userId: null, value: null, promise: null }
      return false
    }
    
    // Return cached value if available and user hasn't changed
    if (isGlobalAdminCache.userId === user.value.id && isGlobalAdminCache.value !== null) {
      return isGlobalAdminCache.value
    }
    
    // If there's already a pending request for the same user, return that promise
    if (isGlobalAdminCache.userId === user.value.id && isGlobalAdminCache.promise) {
      return isGlobalAdminCache.promise
    }
    
    // Create new request
    const promise = (async () => {
      const { data, error } = await (supabase as any)
        .rpc('is_global_admin', { user_id: user.value!.id })
      
      const result = error ? false : (data || false)
      
      // Cache the result
      if (isGlobalAdminCache.userId === user.value!.id) {
        isGlobalAdminCache.value = result
        isGlobalAdminCache.promise = null
      }
      
      return result
    })()
    
    // Store the promise to prevent duplicate requests
    isGlobalAdminCache.userId = user.value.id
    isGlobalAdminCache.promise = promise
    
    return promise
  }

  /**
   * Check if current user is project owner (admin) of a specific project
   * Project owners are listed in projects.admins array
   */
  const isProjectOwner = async (projectId: string): Promise<boolean> => {
    if (!user.value || !projectId) return false
    
    const { data, error } = await (supabase as any)
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
    
    const { data, error } = await (supabase as any)
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
    currentAdminId,
    isGlobalAdmin,
    isProjectOwner,
    canManageProject,
    isAdmin, // backward compatibility
  }
}

