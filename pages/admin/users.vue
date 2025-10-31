<script setup lang="ts">
definePageMeta({ middleware: ['auth','admin'] })

useSeoMeta({ title: 'Admin - Users' })

// Mock data instead of API (temporary)
const isLoading = ref(false)
const users = ref<any[]>([])
const mockUsers = ref<any[]>([
  { id: 'u-1', email: 'alice@example.com', name: 'Alice', ref_code: 'ALC123', created_at: new Date().toISOString() },
  { id: 'u-2', email: 'bob@example.com', name: 'Bob', ref_code: 'BOB456', created_at: new Date(Date.now()-86400000).toISOString() },
])

const form = reactive({
  email: '',
  name: '',
  makeAdmin: false,
})

const isInviteOpen = ref(false)

const fetchUsers = async () => {
  users.value = [...mockUsers.value]
}

onMounted(fetchUsers)

const invite = async () => {
  try {
    isLoading.value = true
    const id = `u-${Date.now()}`
    mockUsers.value.unshift({ id, email: form.email, name: form.name, ref_code: (form.name || 'USER').slice(0,3).toUpperCase()+Math.floor(Math.random()*900+100), created_at: new Date().toISOString() })
    await fetchUsers()
    form.email = ''
    form.name = ''
    form.makeAdmin = false
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
          <h2 class="font-semibold">Manage Users</h2>
          <UButton color="primary" @click="isInviteOpen = true">Invite User</UButton>
        </div>
      </template>

      <div class="grid grid-cols-1 gap-6">
        <div>
          <h3 class="mb-2 font-medium">Existing Users</h3>
          <UTable :rows="users" :columns="[
            { key: 'email', label: 'Email' },
            { key: 'name', label: 'Name' },
            { key: 'ref_code', label: 'Ref Code' },
            { key: 'created_at', label: 'Created' },
          ]" />
        </div>
      </div>
    </UCard>

    <UModal v-model="isInviteOpen">
      <UCard>
        <template #header>
          <h3 class="font-semibold">Invite User</h3>
        </template>
        <UForm id="invite-user-form" @submit.prevent="invite">
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
            <UButton form="invite-user-form" type="submit" color="primary" :loading="isLoading" :disabled="isLoading || !form.email">Invite</UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<style scoped></style>




