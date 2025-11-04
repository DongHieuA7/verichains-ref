<script setup lang="ts">
const { t } = useI18n()

definePageMeta({ middleware: ['auth', 'user-only'] })
useSeoMeta({ title: t('profile.myProfile') })

// Mock user profile data (replace with Supabase later)
const profile = reactive({
  id: 'u-1',
  name: 'John Doe',
  email: 'john@example.com',
  company: 'Acme Inc.',
  descript: 'Business development',
  ref_code: 'REF12345',
})

const baseUrl = ref('')
const refLink = computed(() => baseUrl.value ? `${baseUrl.value}/?ref=${profile.ref_code}` : `/?ref=${profile.ref_code}`)

onMounted(() => {
  if (typeof window !== 'undefined') {
    baseUrl.value = window.location.origin
  }
})

const toast = useToast()

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
  profile.company = draft.company
  profile.descript = draft.descript
  isEditOpen.value = false
  toast.add({ color: 'green', title: $t('profile.profileUpdated'), icon: 'i-lucide-check-circle' })
}
</script>

<template>
  <div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <UCard class="md:col-span-1">
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="font-semibold">{{ $t('profile.myProfile') }}</h2>
            <UButton size="xs" color="gray" variant="outline" class="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700" @click="openEdit">{{ $t('common.edit') }}</UButton>
          </div>
        </template>
        <div class="flex items-center gap-4">
          <div class="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
            {{ profile.name.split(' ').map(p => p[0]).slice(0,2).join('') }}
          </div>
          <div class="min-w-0">
            <div class="font-medium truncate">{{ profile.name }}</div>
            <div class="text-sm text-gray-500 truncate">{{ profile.email }}</div>
          </div>
        </div>
          <div class="mt-4 space-y-2 text-sm">
          <div><span class="text-gray-500">{{ $t('profile.company') }}:</span> <span class="font-medium">{{ profile.company }}</span></div>
          <div><span class="text-gray-500">{{ $t('profile.about') }}:</span> <span class="font-medium break-words">{{ profile.descript }}</span></div>
          <div>
            <span class="text-gray-500">{{ $t('profile.referralCode') }}:</span>
            <UBadge color="primary" variant="soft" :label="profile.ref_code" />
          </div>
        </div>
      </UCard>

      <UCard class="md:col-span-2">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-semibold">{{ $t('profile.referral') }}</h3>
            <div class="flex gap-2">
              <UButton color="gray" variant="soft" @click="copyRef">{{ $t('profile.copyLink') }}</UButton>
              <UButton color="primary" @click="shareRef">{{ $t('profile.share') }}</UButton>
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
          <UInput v-model="draft.company" @keyup.enter="saveProfile" />
        </UFormGroup>
        <UFormGroup :label="$t('profile.aboutDescription')">
          <UTextarea v-model="draft.descript" rows="4" />
        </UFormGroup>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2 mt-2">
          <UButton color="gray" variant="soft" @click="isEditOpen = false">{{ $t('common.cancel') }}</UButton>
          <UButton color="primary" @click="saveProfile" :disabled="!draft.company">{{ $t('common.save') }}</UButton>
        </div>
      </template>
    </UCard>
  </UModal>
</template>

<style scoped></style>

