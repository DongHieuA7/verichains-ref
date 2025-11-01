<script setup lang="ts">
  const user = useSupabaseUser()
  const supabase = useSupabaseClient()

  useSeoMeta({
    title: 'Verichains Referral',
  })

  // Redirect logic
  onMounted(async () => {
    if (!user.value) {
      // If not logged in, redirect to login
      return navigateTo('/sign-in')
    }
    
    // If logged in, check role and redirect
    const { data } = await supabase
      .from('admins')
      .select('id')
      .eq('id', user.value.id)
      .maybeSingle()
    
    if (data) {
      // User is admin, redirect to admin projects
      return navigateTo('/admin/projects')
    } else {
      // User is regular user, redirect to commissions
      return navigateTo('/commissions')
    }
  })

  // Watch for user changes (login/logout)
  watch(user, async (newUser) => {
    if (!newUser) {
      // User logged out, redirect to login
      return navigateTo('/sign-in')
    }
    
    const { data } = await supabase
      .from('admins')
      .select('id')
      .eq('id', newUser.id)
      .maybeSingle()
    
    if (data) {
      return navigateTo('/admin/projects')
    } else {
      return navigateTo('/commissions')
    }
  })
</script>
<template>
  <div class="w-full flex items-center justify-center">
    <div class="text-center">
      <p class="text-gray-500">Redirecting...</p>
    </div>
  </div>
</template>