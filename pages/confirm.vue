<script setup lang="ts">
const user = useSupabaseUser()
const supabase = useSupabaseClient()

definePageMeta({
  layout: false, // No layout during redirect
  auth: false,
})

const waitForSession = async () => {
  // Nuxt Supabase module tự động xử lý callback nếu có code trong URL
  // Chỉ cần gọi getSession để trigger exchange
  await supabase.auth.getSession()

  // Đợi user được set
  if (!user.value) {
    await new Promise<void>((resolve) => {
      const { data: sub } = supabase.auth.onAuthStateChange((ev) => {
        if (ev === 'SIGNED_IN' || ev === 'TOKEN_REFRESHED' || ev === 'INITIAL_SESSION') {
          sub.subscription.unsubscribe()
          resolve()
        }
      })
      // Fallback timeout
      setTimeout(() => resolve(), 2000)
    })
  }

  // Dọn query sau khi đã xử lý
  const clean = new URL(location.href)
  clean.searchParams.delete('code')
  clean.searchParams.delete('state')
  history.replaceState({}, '', clean.toString())
}

const checkAndRedirect = async () => {

  if (!process.client) return

  await waitForSession()

  if (!user.value) return navigateTo('/sign-in', { replace: true })
  
  try {
    const { data } = await supabase
      .from('admins')
      .select('id')
      .eq('id', user.value.id)
      .maybeSingle()
    
    if (data) {
      // User is admin, redirect to admin my-projects
      return navigateTo('/admin/projects/my-projects')
    } else {
      // User is regular user, redirect to commissions
      return navigateTo('/commissions')
    }
  } catch (error) {
    // Default to commissions if error
    return navigateTo('/commissions')
  }
}

watch(user, checkAndRedirect, { immediate: true })

onMounted(() => {
  checkAndRedirect()
})
</script>

<template>
  <div class="w-full flex items-center justify-center min-h-screen">
    <div class="text-center">
      <p class="text-gray-500">Redirecting...</p>
    </div>
  </div>
</template>