<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useSeoMeta({ title: 'My Profile' })

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
    toast.add({ color: 'green', title: 'Referral link copied', icon: 'i-lucide-check-circle' })
  } catch {
    toast.add({ color: 'red', title: 'Copy failed', icon: 'i-lucide-x-circle' })
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
  toast.add({ color: 'green', title: 'Profile updated', icon: 'i-lucide-check-circle' })
}
</script>

<template>
  <div class="container mx-auto py-6">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <UCard class="md:col-span-1">
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="font-semibold">My Profile</h2>
            <UButton size="xs" color="gray" variant="soft" @click="openEdit">Edit</UButton>
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
          <div><span class="text-gray-500">Company:</span> <span class="font-medium">{{ profile.company }}</span></div>
          <div><span class="text-gray-500">About:</span> <span class="font-medium break-words">{{ profile.descript }}</span></div>
          <div>
            <span class="text-gray-500">Referral Code:</span>
            <UBadge color="primary" variant="soft" :label="profile.ref_code" />
          </div>
        </div>
      </UCard>

      <UCard class="md:col-span-2">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-semibold">Referral</h3>
            <div class="flex gap-2">
              <UButton color="gray" variant="soft" @click="copyRef">Copy Link</UButton>
              <UButton color="primary" @click="shareRef">Share</UButton>
            </div>
          </div>
        </template>
         <div class="space-y-4">
          <UFormGroup label="Referral Link">
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
        <h3 class="font-semibold">Edit My Profile</h3>
      </template>
      <UForm id="edit-profile-form" @submit.prevent="saveProfile">
        <UFormGroup label="Company">
          <UInput v-model="draft.company" />
        </UFormGroup>
        <UFormGroup class="mt-2" label="About / Description">
          <UTextarea v-model="draft.descript" rows="4" />
        </UFormGroup>
      </UForm>
      <template #footer>
        <div class="flex justify-end gap-2 mt-2">
          <UButton color="gray" variant="soft" @click="isEditOpen = false">Cancel</UButton>
          <UButton form="edit-profile-form" type="submit" color="primary" :disabled="!draft.company">Save</UButton>
        </div>
      </template>
    </UCard>
  </UModal>
</template>

<style scoped></style>

