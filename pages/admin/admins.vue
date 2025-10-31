<script setup lang="ts">
definePageMeta({ middleware: ['auth','admin'] })
useSeoMeta({ title: 'Admin - Admins' })

// Mock data instead of API (temporary)
const isLoading = ref(false)
const admins = ref<any[]>([])
const mockAdmins = ref<any[]>([
  { id: 'a-1', email: 'admin1@example.com', name: 'Admin One', created_at: new Date().toISOString() },
  { id: 'a-2', email: 'admin2@example.com', name: 'Admin Two', created_at: new Date(Date.now()-43200000).toISOString() },
])

const form = reactive({
  email: '',
  name: '',
})

const isInviteOpen = ref(false)

const fetchAdmins = async () => {
  admins.value = [...mockAdmins.value]
}

onMounted(fetchAdmins)

const inviteAdmin = async () => {
  try {
    isLoading.value = true
    const id = `a-${Date.now()}`
    mockAdmins.value.unshift({ id, email: form.email, name: form.name, created_at: new Date().toISOString() })
    await fetchAdmins()
    form.email = ''
    form.name = ''
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="container mx-auto py-6">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="font-semibold">Admins</h2>
          <UButton color="primary" @click="isInviteOpen = true">Invite Admin</UButton>
        </div>
      </template>

      <UTable :rows="admins" :columns="[
        { key: 'email', label: 'Email' },
        { key: 'name', label: 'Name' },
        { key: 'created_at', label: 'Created' },
      ]" />
    </UCard>

    <UModal v-model="isInviteOpen">
      <UCard>
        <template #header>
          <h3 class="font-semibold">Invite Admin</h3>
        </template>
        <UForm id="invite-admin-form" @submit.prevent="inviteAdmin">
          <UFormGroup label="Email">
            <UInput v-model="form.email" type="email" />
          </UFormGroup>
          <UFormGroup label="Name">
            <UInput v-model="form.name" />
          </UFormGroup>
        </UForm>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="gray" variant="soft" @click="isInviteOpen = false">Cancel</UButton>
            <UButton form="invite-admin-form" type="submit" color="primary" :loading="isLoading" :disabled="isLoading || !form.email">Invite</UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<style scoped></style>

