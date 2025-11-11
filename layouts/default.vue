<script setup lang="ts">
const user = useSupabaseUser()
const supabase = useSupabaseClient()
const colorMode = useColorMode()

const { t } = useI18n()

// User navigation items
const userNavItems = computed(() => [
  { label: t('nav.myProfile'), icon: 'i-lucide-user', to: '/profile' },
  { label: t('nav.projects'), icon: 'i-lucide-folder', to: '/projects' },
  { label: t('nav.myCommissions'), icon: 'i-lucide-badge-dollar-sign', to: '/commissions' },
])

// Admin navigation items
const adminNavItems = computed(() => [
  { label: t('nav.adminProjects'), icon: 'i-lucide-folder-cog', to: '/admin/projects' },
  { label: t('nav.myProjects'), icon: 'i-lucide-folder', to: '/admin/projects/my-projects' },
  { label: t('nav.adminAdmins'), icon: 'i-lucide-shield', to: '/admin/admins' },
  { label: t('nav.adminUsers'), icon: 'i-lucide-user-cog', to: '/admin/users' },
])

// Check if user is admin
const isAdmin = ref(false)
const adminRole = ref<string | null>(null)
const isProjectOwner = ref(false)
const { isGlobalAdmin } = useAdminRole()

const checkAdminStatus = async () => {
  if (!user.value) {
    isAdmin.value = false
    adminRole.value = null
    isProjectOwner.value = false
    return
  }

  // Use RPC to check global admin status (more efficient)
  const isGlobal = await isGlobalAdmin()
  if (isGlobal) {
    isAdmin.value = true
    adminRole.value = 'global_admin'
    isProjectOwner.value = false
    return
  }

  // If not global admin, check if in admins table with role
  const { data, error } = await supabase
    .from('admins')
    .select('id, role')
    .eq('id', user.value.id)
    .maybeSingle()

  isAdmin.value = !error && !!data
  adminRole.value = data?.role || null
  
  // Check if user is project owner (either role='project_owner' or has projects)
  if (isAdmin.value && adminRole.value !== 'global_admin') {
    // Check if user is in any project's admins array
    const { data: projectsData } = await supabase
      .from('projects')
      .select('admins')
    
    if (projectsData) {
      isProjectOwner.value = projectsData.some((p: any) => {
        const admins = (p.admins || []) as string[]
        return Array.isArray(admins) && admins.includes(user.value!.id)
      }) || adminRole.value === 'project_owner'
    } else {
      isProjectOwner.value = adminRole.value === 'project_owner'
    }
  } else {
    isProjectOwner.value = false
  }
}

// Computed navItems based on role
// If admin, show admin items filtered by role; if user, show user items
const navItems = computed(() => {
  if (isAdmin.value) {
    // Filter admin nav items based on role
    const filtered = adminNavItems.value.filter(item => {
      // Admin Projects - only for global_admin
      if (item.to === '/admin/projects') {
        return adminRole.value === 'global_admin'
      }
      // My Projects - only for project_owner
      if (item.to === '/admin/projects/my-projects') {
        return isProjectOwner.value
      }
      // Other admin items (admins, users) - show for all admins
      return true
    })
    return filtered
  }
  return [...userNavItems.value]
})

// Watch user changes and check admin status
watch(user, () => {
  checkAdminStatus()
}, { immediate: true })

const signOut = async () => {
  try {
    await supabase.auth.signOut()
    return navigateTo('/sign-in')
  } catch {}
}
</script>
<template>
  <div>

    <CookieConsent></CookieConsent>

    <div class="mx-auto px-4 sm:px-6 lg:px-8 min-h-screen">
      <div class="grid grid-cols-12 gap-6 pt-6 pb-10">
        <aside v-if="user" class="hidden md:block md:col-span-3 lg:col-span-3">
          <UCard>
            <template #header>
              <div class="flex items-center gap-2">
                <img src="/favicon.png" class="w-8 h-8 block dark:hidden" alt="Logo" />
                <img src="/white-logo.png" class="w-8 h-8 hidden dark:block" alt="Logo" />
                <h3 class="font-semibold">Verichains Referral</h3>
              </div>
            </template>
            <div class="mb-3 flex items-center justify-between">
              <div class="text-sm truncate max-w-[70%]">{{ $t('common.welcome') }}, <strong>{{ user.email }}</strong></div>
              <UButton color="red" size="xs" variant="soft" @click="signOut">{{ $t('common.logout') }}</UButton>
            </div>
            <div class="mb-3">
              <LanguageSwitcher />
            </div>
            <UVerticalNavigation :links="navItems" />
          </UCard>
        </aside>

        <main class="col-span-12 md:col-span-9 lg:col-span-9">
          <slot></slot>
        </main>
      </div>
    </div>
  </div>
</template>