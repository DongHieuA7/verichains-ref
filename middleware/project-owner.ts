export default defineNuxtRouteMiddleware(async () => {
  const client = useSupabaseClient()
  const user = useSupabaseUser()

  if (!user.value) {
    return navigateTo('/sign-in')
  }

  // Check if user is in admins table
  const { data: adminData, error: adminError } = await client
    .from('admins')
    .select('id, role')
    .eq('id', user.value.id)
    .maybeSingle()

  if (adminError || !adminData) {
    return navigateTo('/commissions')
  }

  // If user is global admin, redirect them away from project-owner only pages
  const { data: isGlobalAdmin } = await client
    .rpc('is_global_admin', { user_id: user.value.id } as any)

  if (isGlobalAdmin) {
    // Redirect global admin to admin projects page instead
    return navigateTo('/admin/projects')
  }

  // Check if user is project owner (has projects assigned or role is project_owner)
  const { data: projectData } = await client
    .from('projects')
    .select('admins')
  
  const isProjectOwner = projectData?.some((p: any) => 
    p.admins && Array.isArray(p.admins) && (p.admins as string[]).includes(user.value!.id)
  ) || adminData.role === 'project_owner'

  if (!isProjectOwner) {
    // User is admin but not project owner, redirect to admin projects page
    return navigateTo('/admin/projects/my-projects')
  }
})

