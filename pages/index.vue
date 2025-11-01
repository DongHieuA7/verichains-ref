<script setup lang="ts">
  const user = useSupabaseUser()
  const supabase = useSupabaseClient()

  // Use auth layout (no sidebar) when not logged in
  definePageMeta({
    layout: 'auth'
  })

  useSeoMeta({
    title: 'Verichains Referral',
  })

  // Redirect logic - only redirect if user is logged in
  onMounted(async () => {
    if (user.value) {
      const { data } = await supabase
        .from('admins')
        .select('id')
        .eq('id', user.value.id)
        .maybeSingle()
      
      if (data) {
        // User is admin, redirect to admin dashboard
        return navigateTo('/admin/projects')
      } else {
        // User is regular user, redirect to commissions
        return navigateTo('/commissions')
      }
    }
    // If not logged in, show welcome page (no redirect)
  })

  // Watch for user changes (login)
  watch(user, async (newUser) => {
    if (newUser) {
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
    }
  })

  const signIn = () => {
    navigateTo('/sign-in')
  }
</script>
<template>
  <div class="min-h-[50vh] flex items-center justify-center">
    <div class="text-center space-y-6 max-w-md">
      <div>
        <div class="flex items-center justify-center gap-3 mb-4">
          <img src="/favicon.png" alt="Logo" class="w-12 h-12" />
          <h1 class="text-3xl font-bold">{{ $t('home.title') }}</h1>
        </div>
        <p class="text-gray-600">{{ $t('home.subtitle') }}</p>
      </div>
      <div class="flex justify-center gap-4">
        <UButton color="primary" size="lg" @click="signIn">
          {{ $t('home.signIn') }}
        </UButton>
      </div>
    </div>
  </div>
</template>


<style scoped>

</style>