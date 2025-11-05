<script setup lang="ts">
const { t } = useI18n()

definePageMeta({ middleware: ['auth', 'user-only'] })
useSeoMeta({ title: t('profile.myProfile') })

const supabase = useSupabaseClient()
const user = useSupabaseUser()

// User profile data
const profile = reactive({
  id: '',
  name: '',
  email: '',
  company: '',
  descript: '',
  ref_code: '',
})

const isLoading = ref(false)
const isSaving = ref(false)
const baseUrl = ref('')
const refLink = computed(() => baseUrl.value ? `${baseUrl.value}/?ref=${profile.ref_code}` : `/?ref=${profile.ref_code}`)

const toast = useToast()

// Fetch user profile from Supabase
const fetchProfile = async () => {
  if (!user.value) return
  
  isLoading.value = true
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, email, name, company, descript, ref_code')
      .eq('id', user.value.id)
      .maybeSingle()
    
    if (error) {
      toast.add({ color: 'red', title: $t('common.error') || 'Error', description: error.message, icon: 'i-lucide-x-circle' })
      return
    }
    
    if (data) {
      profile.id = data.id || ''
      profile.email = data.email || user.value.email || ''
      profile.name = data.name || user.value.user_metadata?.name || user.value.email?.split('@')[0] || ''
      profile.company = data.company || ''
      profile.descript = data.descript || ''
      profile.ref_code = data.ref_code || ''
    } else {
      // Profile doesn't exist, create one
      await createProfile()
    }
  } catch (error: any) {
    toast.add({ color: 'red', title: $t('common.error') || 'Error', description: error.message, icon: 'i-lucide-x-circle' })
  } finally {
    isLoading.value = false
  }
}

// Create profile if it doesn't exist
const createProfile = async () => {
  if (!user.value) return
  
  try {
    // Use server API endpoint to create profile (bypasses RLS)
    const { data: session } = await supabase.auth.getSession()
    if (!session?.session?.access_token) {
      toast.add({ color: 'red', title: $t('common.error') || 'Error', description: 'No session found', icon: 'i-lucide-x-circle' })
      return
    }

    const response = await $fetch('/api/profile/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.session.access_token}`
      }
    })

    if (response) {
      profile.id = response.id || ''
      profile.email = response.email || ''
      profile.name = response.name || ''
      profile.company = response.company || ''
      profile.descript = response.descript || ''
      profile.ref_code = response.ref_code || ''
    }
  } catch (error: any) {
    console.error('Error creating profile:', error)
    toast.add({ color: 'red', title: $t('common.error') || 'Error', description: error.message || 'Failed to create profile', icon: 'i-lucide-x-circle' })
  }
}

const copyRef = async () => {
  try {
    await navigator.clipboard.writeText(refLink.value)
    toast.add({ color: 'green', title: $t('profile.referralLinkCopied'), icon: 'i-lucide-check-circle' })
  } catch {
    toast.add({ color: 'red', title: $t('profile.copyFailed'), icon: 'i-lucide-x-circle' })
  }
}

const shareRef = async () => {
  const text = `Join via my referral: ${refLink.value}`
  if ((navigator as any).share) {
    try {
      await (navigator as any).share({ title: 'My referral link', text, url: refLink.value })
    } catch (_) {}
  } else {
    await copyRef()
  }
}

const isEditOpen = ref(false)
const draft = reactive({ company: '', descript: '' })

const openEdit = () => {
  draft.company = profile.company
  draft.descript = profile.descript
  isEditOpen.value = true
}

const saveProfile = async () => {
  if (!user.value) return
  
  isSaving.value = true
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({
        company: draft.company,
        descript: draft.descript,
      })
      .eq('id', user.value.id)
    
    if (error) {
      toast.add({ color: 'red', title: $t('common.error') || 'Error', description: error.message, icon: 'i-lucide-x-circle' })
      return
    }
    
    profile.company = draft.company
    profile.descript = draft.descript
    isEditOpen.value = false
    toast.add({ color: 'green', title: $t('profile.profileUpdated'), icon: 'i-lucide-check-circle' })
  } catch (error: any) {
    toast.add({ color: 'red', title: $t('common.error') || 'Error', description: error.message, icon: 'i-lucide-x-circle' })
  } finally {
    isSaving.value = false
  }
}

onMounted(async () => {
  if (typeof window !== 'undefined') {
    baseUrl.value = window.location.origin
  }
  await fetchProfile()
})
</script>

<template>
  <div>
    <div v-if="isLoading && !profile.id" class="flex items-center justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-gray-400" />
      <span class="ml-3 text-gray-500">{{ $t('common.loading') || 'Loading...' }}</span>
    </div>
    
    <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <UCard class="md:col-span-1">
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="font-semibold">{{ $t('profile.myProfile') }}</h2>
            <UButton size="xs" color="gray" variant="outline" class="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700" @click="openEdit" :disabled="isLoading">{{ $t('common.edit') }}</UButton>
          </div>
        </template>
        <div class="flex items-center gap-4">
          <div class="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
            {{ profile.name.split(' ').map(p => p[0]).slice(0,2).join('') || 'U' }}
          </div>
          <div class="min-w-0">
            <div class="font-medium truncate text-gray-900 dark:text-white">{{ profile.name || $t('common.loading') || 'Loading...' }}</div>
            <div class="text-sm text-gray-500 dark:text-gray-400 truncate">{{ profile.email || '' }}</div>
          </div>
        </div>
          <div class="mt-4 space-y-2 text-sm">
          <div><span class="text-gray-500 dark:text-gray-400">{{ $t('profile.company') }}:</span> <span class="font-medium text-gray-900 dark:text-white">{{ profile.company || '-' }}</span></div>
          <div><span class="text-gray-500 dark:text-gray-400">{{ $t('profile.about') }}:</span> <span class="font-medium break-words text-gray-900 dark:text-white">{{ profile.descript || '-' }}</span></div>
          <div>
            <span class="text-gray-500 dark:text-gray-400">{{ $t('profile.referralCode') }}:</span>
            <UBadge v-if="profile.ref_code" color="primary" variant="soft" :label="profile.ref_code" />
            <span v-else class="text-gray-400">{{ $t('common.loading') || 'Loading...' }}</span>
          </div>
        </div>
      </UCard>

      <UCard class="md:col-span-2">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-semibold">{{ $t('profile.referral') }}</h3>
            <div class="flex gap-2">
              <UButton color="gray"
                       variant="outline"
                       class="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700"
                       @click="copyRef"
                       :disabled="!profile.ref_code">{{ $t('profile.copyLink') }}</UButton>
              <UButton color="primary" @click="shareRef" :disabled="!profile.ref_code">{{ $t('profile.share') }}</UButton>
            </div>
          </div>
        </template>
         <div class="space-y-4">
          <UFormGroup :label="$t('profile.referralLink')">
            <UInput :model-value="refLink" readonly />
          </UFormGroup>
           <!-- Company/About moved to My Profile card -->
        </div>
      </UCard>
    </div>
  </div>
  <UModal v-model="isEditOpen">
    <UCard>
      <template #header>
        <h3 class="font-semibold">{{ $t('profile.editMyProfile') }}</h3>
      </template>
      <div class="space-y-4">
        <UFormGroup :label="$t('profile.company')">
          <UInput v-model="draft.company" @keyup.enter="saveProfile" :disabled="isSaving" />
        </UFormGroup>
        <UFormGroup :label="$t('profile.aboutDescription')">
          <UTextarea v-model="draft.descript" rows="4" :disabled="isSaving" />
        </UFormGroup>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2 mt-2">
          <UButton color="gray" variant="outline" class="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700" @click="isEditOpen = false" :disabled="isSaving">{{ $t('common.cancel') }}</UButton>
          <UButton color="primary" @click="saveProfile" :disabled="!draft.company || isSaving" :loading="isSaving">{{ $t('common.save') }}</UButton>
        </div>
      </template>
    </UCard>
  </UModal>
</template>

<style scoped></style>

