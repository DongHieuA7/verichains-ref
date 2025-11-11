<script setup lang="ts">
const { t } = useI18n()
const supabase = useSupabaseClient()
const { getErrorMessage } = useErrorMessage()
const { currentAdminId } = useAdminRole()

interface OwnerOption {
  label: string
  value: string
}

interface UserOption {
  label: string
  value: string
}

interface Props {
  modelValue: boolean
  availableOwnerOptions: OwnerOption[]
  userOptions: UserOption[]
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'created'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const draft = reactive<{ 
  name: string
  selectedUsers: string[]
  selectedOwners: string[]
  commission_rate_min?: number | null
  commission_rate_max?: number | null
  policy?: string | null
}>({ 
  name: '', 
  selectedUsers: [],
  selectedOwners: [],
  commission_rate_min: null,
  commission_rate_max: null,
  policy: null
})

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const isLoading = ref(false)

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    // Reset form when modal opens
    draft.name = ''
    draft.selectedUsers = []
    draft.selectedOwners = []
    draft.commission_rate_min = null
    draft.commission_rate_max = null
    draft.policy = null
  }
})

const createProject = async () => {
  if (!currentAdminId.value) {
    const toast = useToast()
    toast.add({
      color: 'red',
      title: t('messages.userMustBeLoggedIn'),
      description: 'You must be logged in as admin to create a project',
    })
    return
  }
  
  isLoading.value = true
  
  try {
    // Add selected owners to project, or use current admin as default
    // Ensure selectedOwners is array of strings (user IDs)
    let admins: string[] = []
    if (draft.selectedOwners.length > 0) {
      // Extract values if they are objects, otherwise use as is
      admins = draft.selectedOwners.map(owner => 
        typeof owner === 'string' ? owner : (owner as any)?.value || owner
      ).filter((id): id is string => typeof id === 'string' && id.length > 0)
    }
    
    // If no valid owners selected, use current admin as default
    if (admins.length === 0) {
      admins = [currentAdminId.value]
    }
    
    const { data, error } = await supabase
      .from('projects')
      .insert({ 
        name: draft.name.trim(), 
        admins,
        commission_rate_min: draft.commission_rate_min || null,
        commission_rate_max: draft.commission_rate_max || null,
        policy: draft.policy || null
      })
      .select('id')
      .single()
    
    if (error) {
      const toast = useToast()
      toast.add({
        color: 'red',
        title: t('messages.failedToCreateProject'),
        description: getErrorMessage(error),
      })
      return
    }
    
    if (data) {
      // Add selected users to project if any
      if (draft.selectedUsers.length > 0) {
        // Ensure selectedUsers is array of strings (user IDs)
        const userIds = draft.selectedUsers.map(user => 
          typeof user === 'string' ? user : (user as any)?.value || user
        ).filter((id): id is string => typeof id === 'string' && id.length > 0)
        
        const userInserts = userIds.map(uid => ({
          project_id: data.id,
          user_id: uid,
          ref_percentage: 10
        }))
        
        const { error: usersError } = await supabase
          .from('user_project_info')
          .insert(userInserts)
        
        if (usersError) {
          // Non-fatal error, continue
        }
      }
      
      // Emit created event to parent to refresh data
      emit('created')
      
      // Close modal
      isOpen.value = false
      
      const toast = useToast()
      toast.add({
        color: 'green',
        title: t('messages.success'),
        description: t('projects.newProject') + ' ' + t('common.created'),
      })
    }
  } catch (error: any) {
    const toast = useToast()
    toast.add({
      color: 'red',
      title: t('messages.failedToCreateProject'),
      description: getErrorMessage(error),
    })
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <Modal v-model="isOpen" :title="$t('projects.newProject')" width="sm:max-w-2xl">
    <div class="max-h-[calc(100vh-250px)] overflow-y-auto pb-4 space-y-6" style="padding-left: 0.25rem; padding-right: 0.25rem;">
      <UFormGroup :label="$t('projects.projectName')">
        <UInput v-model="draft.name" @keyup.enter="createProject" :disabled="isLoading" />
      </UFormGroup>
      <div class="grid grid-cols-2 gap-4">
        <UFormGroup :label="$t('projects.commissionRateMin')">
          <UInput 
            v-model.number="draft.commission_rate_min" 
            type="number" 
            step="0.01" 
            min="0" 
            max="100"
            :placeholder="$t('projects.commissionRateMinPlaceholder')"
            :disabled="isLoading"
          />
        </UFormGroup>
        <UFormGroup :label="$t('projects.commissionRateMax')">
          <UInput 
            v-model.number="draft.commission_rate_max" 
            type="number" 
            step="0.01" 
            min="0" 
            max="100"
            :placeholder="$t('projects.commissionRateMaxPlaceholder')"
            :disabled="isLoading"
          />
        </UFormGroup>
      </div>
      <UFormGroup :label="$t('projects.policy')">
        <UTextarea 
          v-model="draft.policy" 
          :rows="4"
          :placeholder="$t('projects.policyPlaceholder')"
          :ui="{ base: 'resize-none' }"
          :disabled="isLoading"
        />
      </UFormGroup>
      <UFormGroup :label="$t('projects.projectOwners')">
        <USelectMenu 
          v-model="draft.selectedOwners" 
          :options="availableOwnerOptions" 
          :placeholder="$t('projects.selectOwners')"
          multiple
          searchable
          value-attribute="value"
          :ui="{ 
            width: 'w-full',
            option: { container: 'max-h-60 overflow-y-auto overflow-x-hidden' },
            popper: { placement: 'bottom-start', strategy: 'fixed' }
          }"
          class="w-full"
          :disabled="isLoading"
        />
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ $t('projects.selectOwnersNote') }}</p>
      </UFormGroup>
      <UFormGroup :label="$t('projects.addUsers')">
        <USelectMenu 
          v-model="draft.selectedUsers" 
          :options="userOptions" 
          :placeholder="$t('projects.selectUsersToAdd')"
          multiple
          searchable
          value-attribute="value"
          :ui="{ 
            width: 'w-full',
            option: { container: 'max-h-60 overflow-y-auto overflow-x-hidden' },
            popper: { placement: 'bottom-start', strategy: 'fixed' }
          }"
          class="w-full"
          :disabled="isLoading"
        />
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ $t('projects.usersNote') }}</p>
      </UFormGroup>
    </div>
    <template #footer>
      <div class="flex justify-end gap-2">
        <ActionButton type="cancel" @click="isOpen = false" :disabled="isLoading" />
        <ActionButton type="create" :disabled="!draft.name.trim() || isLoading" @click="createProject" />
      </div>
    </template>
  </Modal>
</template>

