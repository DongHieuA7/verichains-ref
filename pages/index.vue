<script setup lang="ts">
  definePageMeta({
    middleware: 'guest'
  })

  useSeoMeta({
    title: 'Nuxt Supabase Starter - Supercharged Your Project',
  })

  const toast = useToast()

  const navItems = [
    { label: 'My Commissions', icon: 'i-lucide-badge-dollar-sign', to: '/commissions' },
  ]

  const packageInstall = 'npx nuxt-supabase-starter my-app'

  onMounted(() => {
    navigateTo('/commissions')
  })

  // Mock summary for demo
  const mockSummary = [
    { project: 'Project Alpha', approved: 3500, claimed: 2600 },
    { project: 'Project Beta', approved: 4200, claimed: 3800 },
    { project: 'Project Gamma', approved: 1800, claimed: 900 },
  ]
  const projectCount = computed(() => mockSummary.length)
  const totalApproved = computed(() => mockSummary.reduce((s, x) => s + x.approved, 0))
  const totalClaimed = computed(() => mockSummary.reduce((s, x) => s + x.claimed, 0))

  const copyText = () => {
    navigator.clipboard.writeText(packageInstall);
    toast.add({
      color: "green",
      title: 'Copied to clipboard!',
      icon: "i-lucide-check-circle"
    })
  }
</script>
<template>
  <div class="min-h-[50vh] flex items-center justify-center">
    <div class="text-sm text-gray-500">Redirecting to Commissions...</div>
  </div>
</template>


<style scoped>

</style>