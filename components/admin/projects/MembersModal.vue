<script setup lang="ts">
const { t } = useI18n()
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const { getErrorMessage } = useErrorMessage()
const { canManageProject } = useAdminRole()

type Project = { 
  id: string
  name: string
  admins: string[]
}

type MemberType = 'users' | 'admins'

interface Props {
  modelValue: boolean
  project: Project | null
  memberType: MemberType
  allMembers: Array<{ id: string; name?: string | null; email: string; role?: string | null }>
  projects?: Project[]
  isGlobalAdmin: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'updated'): void
}

const props = withDefaults(defineProps<Props>(), {
  projects: () => [],
})

const emit = defineEmits<Emits>()

const projectMembers = ref<string[]>([])
const originalMembers = ref<string[]>([]) // Store original state
const manageState = reactive<{ addMember?: string }>({})
const pendingChanges = reactive<{ added: string[], removed: string[] }>({ added: [], removed: [] })

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// For users: fetch from user_project_info
// For admins: use project.admins directly
const fetchProjectMembers = async (projectId: string) => {
  if (props.memberType === 'users') {
    const { data } = await supabase
      .from('user_project_info')
      .select('user_id')
      .eq('project_id', projectId)
    projectMembers.value = (data || []).map((r: any) => r.user_id)
    originalMembers.value = [...projectMembers.value]
  } else {
    // For admins, use project.admins directly
    projectMembers.value = props.project?.admins || []
    originalMembers.value = [...projectMembers.value]
  }
  // Reset pending changes when fetching
  pendingChanges.added = []
  pendingChanges.removed = []
}

watch(() => props.project, async (project) => {
  if (project && isOpen.value) {
    await fetchProjectMembers(project.id)
  }
}, { immediate: true })

watch(isOpen, async (open) => {
  if (open && props.project) {
    await fetchProjectMembers(props.project.id)
    // Reset cache when modal opens
    canManageCache.value = null
  } else {
    // Reset cache when modal closes
    canManageCache.value = null
  }
})

watch(() => props.project, () => {
  // Reset cache when project changes
  canManageCache.value = null
})

const availableMemberOptions = computed(() => {
  if (props.memberType === 'admins') {
    if (!props.project) return []
    const set = new Set(props.project.admins || [])
    return props.allMembers
      .filter(a => {
        if (set.has(a.id)) return false
        return a.role !== 'global_admin'
      })
      .map(a => ({ 
        label: `${a.name || a.email}${a.role ? ` (${a.role === 'project_owner' ? t('admin.projectOwner') : a.role})` : ''}`, 
        value: a.id 
      }))
  } else {
    const set = new Set(projectMembers.value)
    return props.allMembers
      .filter(u => !set.has(u.id))
      .map(u => ({ label: u.name || u.email, value: u.id }))
  }
})

const displayMember = (uid: string) => { 
  const m = props.allMembers.find(x => x.id === uid)
  return m ? (m.name || m.email) : uid 
}

// Cache for canManageProject result
const canManageCache = ref<boolean | null>(null)

const addMemberToProject = () => { 
  if (!props.project || !manageState.addMember) return
  
  if (props.memberType === 'admins') {
    const adminToAdd = props.allMembers.find(a => a.id === manageState.addMember)
    if (adminToAdd && adminToAdd.role === 'global_admin') {
      const toast = useToast()
      toast.add({
        color: 'red',
        title: t('admin.cannotAddGlobalAdmin'),
        description: t('admin.globalAdminMustBeSetManually'),
      })
      return
    }
    
    const current = projectMembers.value as string[]
    if (current.includes(manageState.addMember)) {
      const toast = useToast()
      toast.add({
        color: 'yellow',
        title: t('messages.adminAlreadyInProject'),
        description: t('messages.adminAlreadyInProject'),
      })
      return
    }
    
    // Add to local state
    projectMembers.value = [...current, manageState.addMember]
    // Track change
    if (pendingChanges.removed.includes(manageState.addMember)) {
      // If was removed, just remove from removed list
      pendingChanges.removed = pendingChanges.removed.filter(id => id !== manageState.addMember)
    } else {
      // Add to added list if not in original
      if (!originalMembers.value.includes(manageState.addMember)) {
        pendingChanges.added.push(manageState.addMember)
      }
    }
  } else {
    // Users
    const current = projectMembers.value as string[]
    if (current.includes(manageState.addMember)) {
      const toast = useToast()
      toast.add({
        color: 'yellow',
        title: t('messages.userAlreadyInProject'),
        description: t('messages.userAlreadyInProject'),
      })
      return
    }
    
    // Add to local state
    projectMembers.value = [...current, manageState.addMember]
    // Track change
    if (pendingChanges.removed.includes(manageState.addMember)) {
      // If was removed, just remove from removed list
      pendingChanges.removed = pendingChanges.removed.filter(id => id !== manageState.addMember)
    } else {
      // Add to added list if not in original
      if (!originalMembers.value.includes(manageState.addMember)) {
        pendingChanges.added.push(manageState.addMember)
      }
    }
  }
  
  manageState.addMember = undefined
}

const removeMemberFromProject = (uid: string) => { 
  if (!props.project) return
  
  // Remove from local state
  projectMembers.value = projectMembers.value.filter(id => id !== uid)
  
  // Track change
  if (pendingChanges.added.includes(uid)) {
    // If was added, just remove from added list
    pendingChanges.added = pendingChanges.added.filter(id => id !== uid)
  } else {
    // Add to removed list if was in original
    if (originalMembers.value.includes(uid)) {
      pendingChanges.removed.push(uid)
    }
  }
}

const saveMembers = async () => {
  if (!props.project) return
  
  // Check permission
  if (canManageCache.value === null) {
    canManageCache.value = await canManageProject(props.project.id)
  }
  const canManage = canManageCache.value
  
  try {
    if (props.memberType === 'admins') {
      if (!canManage && !props.isGlobalAdmin) {
        const toast = useToast()
        toast.add({
          color: 'red',
          title: t('admin.permissionDenied'),
          description: t('admin.onlyProjectAdminsCanManageAdmins'),
        })
        return
      }
      
      // Update admins in projects table
      const p = props.projects.find(pr => pr.id === props.project!.id)
      if (!p) return
      
      const { error } = await supabase
        .from('projects')
        .update({ admins: projectMembers.value })
        .eq('id', p.id)
      
      if (error) {
        const toast = useToast()
        toast.add({
          color: 'red',
          title: t('messages.failedToUpdate'),
          description: getErrorMessage(error),
        })
        return
      }
      
      // Update local project data
      p.admins = projectMembers.value
      if (props.project) {
        props.project.admins = projectMembers.value
      }
    } else {
      // Users
      if (!canManage) {
        const toast = useToast()
        toast.add({
          color: 'red',
          title: t('admin.permissionDenied'),
          description: props.isGlobalAdmin ? t('admin.onlyGlobalAdminsCanManageUsers') : t('admin.onlyProjectAdminsCanManageUsers'),
        })
        return
      }
      
      // Remove users
      for (const userId of pendingChanges.removed) {
        const { error } = await supabase
          .from('user_project_info')
          .delete()
          .eq('project_id', props.project.id)
          .eq('user_id', userId)
        
        if (error) {
          const toast = useToast()
          toast.add({
            color: 'red',
            title: t('messages.failedToRemove'),
            description: getErrorMessage(error),
          })
          return
        }
      }
      
      // Add users
      for (const userId of pendingChanges.added) {
        const { error } = await supabase
          .from('user_project_info')
          .upsert({ 
            project_id: props.project.id, 
            user_id: userId, 
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
      }
    }
    
    // Refresh to sync with server
    await fetchProjectMembers(props.project.id)
    emit('updated')
    isOpen.value = false
  } catch (error: any) {
    const toast = useToast()
    toast.add({
      color: 'red',
      title: t('messages.failedToUpdate'),
      description: getErrorMessage(error),
    })
  }
}

const currentMembers = computed(() => {
  return projectMembers.value
})

const isAddDisabled = computed(() => {
  if (!manageState.addMember) return true
  const members = currentMembers.value as string[]
  return members.includes(manageState.addMember)
})

const modalTitle = computed(() => {
  return props.memberType === 'admins' ? t('projects.manageAdmins') : t('projects.manageUsers')
})

const selectPlaceholder = computed(() => {
  return props.memberType === 'admins' ? t('projects.selectAdmin') : t('projects.selectUser')
})

const emptyMessage = computed(() => {
  return props.memberType === 'admins' ? t('projects.noAdmins') : t('projects.noUsers')
})

const badgeColor = computed(() => {
  return props.memberType === 'admins' ? 'primary' : 'gray'
})
</script>

<template>
  <Modal v-model="isOpen">
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="font-semibold">{{ modalTitle }}</h3>
        <div class="flex items-center gap-2">
          <USelect 
            v-model="manageState.addMember" 
            :options="availableMemberOptions" 
            :placeholder="selectPlaceholder"
            class="w-48"
          />
          <ActionButton 
            type="create"
            :label="$t('common.add')"
            @click="addMemberToProject" 
            :disabled="isAddDisabled"
          />
        </div>
      </div>
    </template>
    <div v-if="currentMembers.length > 0" class="flex flex-wrap gap-2">
      <UBadge v-for="uid in currentMembers" :key="uid" :color="badgeColor">
        <span class="mr-1">{{ displayMember(uid) }}</span>
        <UButton size="2xs" color="red" variant="link" @click="removeMemberFromProject(uid)">×</UButton>
      </UBadge>
    </div>
    <div v-else class="text-sm text-gray-500 dark:text-white text-center py-4">
      {{ emptyMessage }}
    </div>
    <template #footer>
      <div class="flex justify-end gap-2">
        <ActionButton type="cancel" @click="isOpen = false" />
        <ActionButton type="save" @click="saveMembers" />
      </div>
    </template>
  </Modal>
</template>

