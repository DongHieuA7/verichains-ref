<script setup lang="ts">
const { t } = useI18n()
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const { getErrorMessage } = useErrorMessage()
const { isGlobalAdmin, canManageProject } = useAdminRole()

type Project = { 
  id: string
  name: string
  admins: string[]
}

interface Props {
  modelValue: boolean
  project: Project | null
  allUsers: Array<{ id: string; name?: string | null; email: string }>
  isGlobalAdmin: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'updated'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const projectUsers = ref<string[]>([])
const manageState = reactive<{ addUser?: string }>({})

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const availableUserOptionsForManage = computed(() => {
  const set = new Set(projectUsers.value)
  return props.allUsers
    .filter(u => !set.has(u.id))
    .map(u => ({ label: u.name || u.email, value: u.id }))
})

const displayUser = (uid: string) => { 
  const u = props.allUsers.find(x => x.id === uid)
  return u ? (u.name || u.email) : uid 
}

const fetchProjectUsers = async (projectId: string) => {
  const { data } = await supabase
    .from('user_project_info')
    .select('user_id')
    .eq('project_id', projectId)
  projectUsers.value = (data || []).map((r: any) => r.user_id)
}

watch(() => props.project, async (project) => {
  if (project && isOpen.value) {
    await fetchProjectUsers(project.id)
  }
}, { immediate: true })

watch(isOpen, async (open) => {
  if (open && props.project) {
    await fetchProjectUsers(props.project.id)
  }
})

const addUserToProject = async () => { 
  if (!props.project || !manageState.addUser) return
  
  const canManage = await canManageProject(props.project.id)
  if (!canManage) {
    const toast = useToast()
    toast.add({
      color: 'red',
      title: t('admin.permissionDenied'),
      description: props.isGlobalAdmin ? t('admin.onlyGlobalAdminsCanAddUsers') : t('admin.onlyProjectAdminsCanAddUsers'),
    })
    return
  }
  
  if (projectUsers.value.includes(manageState.addUser)) {
    const toast = useToast()
    toast.add({
      color: 'yellow',
      title: t('messages.userAlreadyInProject'),
      description: t('messages.userAlreadyInProject'),
    })
    return
  }
  
  const { error } = await supabase
    .from('user_project_info')
    .upsert({ 
      project_id: props.project.id, 
      user_id: manageState.addUser, 
      ref_percentage: 10 
    }, { onConflict: 'project_id,user_id' })
  
  if (error) {
    const toast = useToast()
    toast.add({
      color: 'red',
      title: t('messages.failedToAddUser'),
      description: getErrorMessage(error),
    })
    return
  }
  
  manageState.addUser = undefined
  await fetchProjectUsers(props.project.id)
  emit('updated')
}

const removeUserFromProject = async (uid: string) => { 
  if (!props.project) return
  
  const canManage = await canManageProject(props.project.id)
  if (!canManage) {
    const toast = useToast()
    toast.add({
      color: 'red',
      title: t('admin.permissionDenied'),
      description: t('admin.onlyProjectAdminsCanRemoveUsers'),
    })
    return
  }
  
  const { error } = await supabase
    .from('user_project_info')
    .delete()
    .eq('project_id', props.project.id)
    .eq('user_id', uid)
  
  if (error) {
    const toast = useToast()
    toast.add({
      color: 'red',
      title: t('messages.failedToRemove'),
      description: getErrorMessage(error),
    })
    return
  }
  
  projectUsers.value = projectUsers.value.filter(id => id !== uid)
  emit('updated')
}

const saveUsers = () => { 
  isOpen.value = false 
}
</script>

<template>
  <UModal v-model="isOpen">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="font-semibold">{{ $t('projects.manageUsers') }}</h3>
          <div class="flex items-center gap-2">
            <USelect 
              v-model="manageState.addUser" 
              :options="availableUserOptionsForManage" 
              :placeholder="$t('projects.selectUser')"
              class="w-48"
            />
            <UButton 
              color="primary" 
              @click="addUserToProject" 
              :disabled="!manageState.addUser || projectUsers.includes(manageState.addUser || '')"
            >
              {{ $t('common.add') }}
            </UButton>
          </div>
        </div>
      </template>
      <div class="space-y-4">
        <div v-if="projectUsers.length > 0" class="flex flex-wrap gap-2">
          <UBadge v-for="uid in projectUsers" :key="uid" color="gray">
            <span class="mr-1">{{ displayUser(uid) }}</span>
            <UButton size="2xs" color="red" variant="link" @click="removeUserFromProject(uid)">×</UButton>
          </UBadge>
        </div>
        <div v-else class="text-sm text-gray-500 text-center py-4">
          {{ $t('projects.noUsers') }}
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="gray" variant="outline" class="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700" @click="isOpen = false">{{ $t('common.cancel') }}</UButton>
          <UButton color="primary" @click="saveUsers">{{ $t('common.save') }}</UButton>
        </div>
      </template>
    </UCard>
  </UModal>
</template>

