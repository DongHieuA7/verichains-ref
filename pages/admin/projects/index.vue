<script setup lang="ts">
definePageMeta({ middleware: ['auth','admin'] })
useSeoMeta({ title: 'Admin - Projects' })

// Mock datasets
const mockUsers = [
  { id: 'u-1', email: 'alice@example.com', name: 'Alice' },
  { id: 'u-2', email: 'bob@example.com', name: 'Bob' },
  { id: 'u-3', email: 'carol@example.com', name: 'Carol' },
  { id: 'u-4', email: 'dave@example.com', name: 'Dave' },
]

type Project = { id: string, name: string, admins: string[], users: string[] }

const projects = ref<Project[]>([
  { id: 'p-1', name: 'Project Alpha', admins: ['u-1'], users: ['u-1','u-2'] },
  { id: 'p-2', name: 'Project Beta', admins: ['u-2','u-3'], users: ['u-2','u-3','u-4'] },
  { id: 'p-3', name: 'Project Gamma', admins: [], users: [] },
])

const isCreateOpen = ref(false)
const isEditOpen = ref(false)
const isManageUsersOpen = ref(false)
const isManageAdminsOpen = ref(false)

const draft = reactive<{ id?: string, name: string }>({ name: '' })
const selected = ref<Project | null>(null)

const userOptions = computed(() => mockUsers.map(u => ({ label: u.name || u.email, value: u.id })))

const columns = [
  { key: 'name', label: 'Project' },
  { key: 'usersCount', label: 'Users' },
  { key: 'adminsCount', label: 'Admins' },
  { key: 'actions', label: 'Actions' },
]

const goDetail = (id: string) => navigateTo({ name: 'admin-projects-id', params: { id } })

const tableRows = computed(() => projects.value.map(p => ({
  ...p,
  usersCount: p.users.length,
  adminsCount: p.admins.length,
})))

const openCreate = () => { draft.id = undefined; draft.name = ''; isCreateOpen.value = true }
const openEdit = (p: Project) => { draft.id = p.id; draft.name = p.name; isEditOpen.value = true }
const openManageUsers = (p: Project) => { selected.value = JSON.parse(JSON.stringify(p)); isManageUsersOpen.value = true }
const openManageAdmins = (p: Project) => { selected.value = JSON.parse(JSON.stringify(p)); isManageAdminsOpen.value = true }

const createProject = () => { const id = `p-${Date.now()}`; projects.value.unshift({ id, name: draft.name.trim(), admins: [], users: [] }); isCreateOpen.value = false }
const saveProject = () => { const idx = projects.value.findIndex(p => p.id === draft.id); if (idx !== -1) projects.value[idx].name = draft.name.trim(); isEditOpen.value = false }
const deleteProject = (p: Project) => { projects.value = projects.value.filter(x => x.id !== p.id) }

const manageState = reactive<{ addUser?: string, addAdmin?: string }>({})
const addUserToProject = () => { if (!selected.value || !manageState.addUser) return; if (!selected.value.users.includes(manageState.addUser)) selected.value.users.push(manageState.addUser); manageState.addUser = undefined }
const removeUserFromProject = (uid: string) => { if (!selected.value) return; selected.value.users = selected.value.users.filter(u => u !== uid) }
const addAdminToProject = () => { if (!selected.value || !manageState.addAdmin) return; if (!selected.value.admins.includes(manageState.addAdmin)) selected.value.admins.push(manageState.addAdmin); manageState.addAdmin = undefined }
const removeAdminFromProject = (uid: string) => { if (!selected.value) return; selected.value.admins = selected.value.admins.filter(u => u !== uid) }
const displayUser = (uid: string) => { const u = mockUsers.find(x => x.id === uid); return u ? (u.name || u.email) : uid }

const saveUsers = () => { if (!selected.value) return; const idx = projects.value.findIndex(p => p.id === selected.value!.id); if (idx !== -1) projects.value[idx].users = [...(selected.value!.users || [])]; isManageUsersOpen.value = false }
const saveAdmins = () => { if (!selected.value) return; const idx = projects.value.findIndex(p => p.id === selected.value!.id); if (idx !== -1) projects.value[idx].admins = [...(selected.value!.admins || [])]; isManageAdminsOpen.value = false }
</script>

<template>
  <div class="container mx-auto py-6">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="font-semibold">Projects</h2>
          <UButton color="primary" @click="openCreate">New Project</UButton>
        </div>
      </template>

      <UTable :rows="tableRows" :columns="columns">
        <template #name-data="{ row }">
          <NuxtLink class="text-primary hover:underline" :to="{ name: 'admin-projects-id', params: { id: row.id } }">{{ row.name }}</NuxtLink>
        </template>
        <template #actions-data="{ row }">
          <div class="flex gap-2">
            <UButton size="xs" color="primary" variant="soft" @click="goDetail(row.id)">View</UButton>
            <UButton size="xs" color="gray" @click="openManageUsers(row)">Users</UButton>
            <UButton size="xs" color="gray" variant="soft" @click="openManageAdmins(row)">Admins</UButton>
            <UButton size="xs" color="gray" variant="soft" @click="openEdit(row)">Edit</UButton>
            <UButton size="xs" color="red" variant="soft" @click="deleteProject(row)">Delete</UButton>
          </div>
        </template>
      </UTable>
    </UCard>

    <!-- Create -->
    <UModal v-model="isCreateOpen">
      <UCard>
        <template #header>
          <h3 class="font-semibold">New Project</h3>
        </template>
        <UForm @submit.prevent="createProject">
          <UFormGroup label="Name">
            <UInput v-model="draft.name" />
          </UFormGroup>
          <template #footer>
            <div class="flex justify-end gap-2 mt-4">
              <UButton color="gray" variant="soft" @click="isCreateOpen = false">Cancel</UButton>
              <UButton type="submit" color="primary" :disabled="!draft.name.trim()">Create</UButton>
            </div>
          </template>
        </UForm>
      </UCard>
    </UModal>

    <!-- Edit -->
    <UModal v-model="isEditOpen">
      <UCard>
        <template #header>
          <h3 class="font-semibold">Edit Project</h3>
        </template>
        <UForm @submit.prevent="saveProject">
          <UFormGroup label="Name">
            <UInput v-model="draft.name" />
          </UFormGroup>
          <template #footer>
            <div class="flex justify-end gap-2 mt-4">
              <UButton color="gray" variant="soft" @click="isEditOpen = false">Cancel</UButton>
              <UButton type="submit" color="primary" :disabled="!draft.name.trim()">Save</UButton>
            </div>
          </template>
        </UForm>
      </UCard>
    </UModal>

    <!-- Manage Users -->
    <UModal v-model="isManageUsersOpen">
      <UCard>
        <template #header>
          <h3 class="font-semibold">Manage Users</h3>
        </template>
        <div>
          <div class="flex gap-2 items-center mb-3">
            <USelect v-model="(manageState as any).addUser" :options="userOptions" placeholder="Select user" />
            <UButton size="xs" color="gray" @click="addUserToProject">Add</UButton>
          </div>
          <div class="flex flex-wrap gap-2">
            <UBadge v-for="uid in (selected?.users || [])" :key="uid" color="gray">
              <span class="mr-1">{{ displayUser(uid) }}</span>
              <UButton size="2xs" color="red" variant="link" @click="removeUserFromProject(uid)">×</UButton>
            </UBadge>
          </div>
        </div>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="gray" variant="soft" @click="isManageUsersOpen = false">Cancel</UButton>
            <UButton color="primary" @click="saveUsers">Save</UButton>
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- Manage Admins -->
    <UModal v-model="isManageAdminsOpen">
      <UCard>
        <template #header>
          <h3 class="font-semibold">Manage Admins</h3>
        </template>
        <div>
          <div class="flex gap-2 items-center mb-3">
            <USelect v-model="(manageState as any).addAdmin" :options="userOptions" placeholder="Select admin" />
            <UButton size="xs" color="gray" @click="addAdminToProject">Add</UButton>
          </div>
          <div class="flex flex-wrap gap-2">
            <UBadge v-for="uid in (selected?.admins || [])" :key="uid" color="primary">
              <span class="mr-1">{{ displayUser(uid) }}</span>
              <UButton size="2xs" color="red" variant="link" @click="removeAdminFromProject(uid)">×</UButton>
            </UBadge>
          </div>
        </div>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="gray" variant="soft" @click="isManageAdminsOpen = false">Cancel</UButton>
            <UButton color="primary" @click="saveAdmins">Save</UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<style scoped></style>
