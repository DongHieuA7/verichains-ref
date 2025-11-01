<script setup lang="ts">
const { t } = useI18n()

definePageMeta({ middleware: ['auth', 'user-only'] })
useSeoMeta({ title: t('projects.availableProjects') })

const supabase = useSupabaseClient()
const user = useSupabaseUser()

const projects = ref<any[]>([])
const userProjects = ref<string[]>([])
const userRequests = ref<Record<string, { id: string, status: string }>>({})
const isLoading = ref(false)

// Request form
const isRequestOpen = ref(false)
const selectedProject = ref<string>('')
const requestForm = reactive({
  message: '',
  ref_percentage: 10 as number,
})

// Fetch all projects
const fetchProjects = async () => {
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, created_at')
    .order('name')
  
  if (error) {
    console.error('Error fetching projects:', error)
    return
  }
  
  projects.value = data || []
}

// Fetch user's projects
const fetchUserProjects = async () => {
  if (!user.value) return
  
  const { data, error } = await supabase
    .from('user_project_info')
    .select('project_id')
    .eq('user_id', user.value.id)
  
  if (error) {
    console.error('Error fetching user projects:', error)
    return
  }
  
  userProjects.value = (data || []).map((r: any) => r.project_id)
}

// Fetch user's join requests
const fetchUserRequests = async () => {
  if (!user.value) return
  
  const { data, error } = await supabase
    .from('project_join_requests')
    .select('id, project_id, status')
    .eq('user_id', user.value.id)
    .eq('status', 'pending')
  
  if (error) {
    console.error('Error fetching user requests:', error)
    return
  }
  
  const map: Record<string, { id: string, status: string }> = {}
  for (const r of data || []) {
    map[r.project_id] = { id: r.id, status: r.status }
  }
  userRequests.value = map
}

// Check if user is in project
const isUserInProject = (projectId: string) => {
  return userProjects.value.includes(projectId)
}

// Check if user has pending request
const hasPendingRequest = (projectId: string) => {
  return !!userRequests.value[projectId]
}

// Open request modal
const openRequestModal = (projectId: string) => {
  selectedProject.value = projectId
  requestForm.message = ''
  requestForm.ref_percentage = 10
  isRequestOpen.value = true
}

// Submit join request
const submitJoinRequest = async () => {
  if (!user.value || !selectedProject.value) return
  
  try {
    isLoading.value = true
    
    const { error } = await supabase
      .from('project_join_requests')
      .insert({
        project_id: selectedProject.value,
        user_id: user.value.id,
        message: requestForm.message || null,
        ref_percentage: requestForm.ref_percentage,
        status: 'pending',
      })
    
    if (error) {
      console.error('Error submitting join request:', error)
      throw error
    }
    
    isRequestOpen.value = false
    await fetchUserRequests()
    
    // Show success message
    const toast = useToast()
    toast.add({
      color: 'green',
      title: t('projects.requestSubmitted'),
      description: t('projects.requestSubmittedDescription'),
    })
  } catch (error) {
    console.error(error)
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  await Promise.all([
    fetchProjects(),
    fetchUserProjects(),
    fetchUserRequests(),
  ])
})
</script>

<template>
  <div>
    <UCard>
      <template #header>
        <h2 class="font-semibold">{{ $t('projects.availableProjects') }}</h2>
      </template>

      <div v-if="projects.length === 0" class="text-center py-8 text-gray-500">
        {{ $t('projects.noProjectsAvailable') }}
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <UCard v-for="project in projects" :key="project.id" class="hover:shadow-lg transition-shadow">
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-medium">{{ project.name }}</h3>
              <UBadge v-if="isUserInProject(project.id)" color="green" variant="soft">{{ $t('projects.joined') }}</UBadge>
              <UBadge v-else-if="hasPendingRequest(project.id)" color="yellow" variant="soft">{{ $t('projects.pending') }}</UBadge>
            </div>
          </template>
          
          <div class="space-y-2">
            <div class="text-sm text-gray-500">
              {{ $t('projects.created') }}: {{ new Date(project.created_at).toLocaleDateString('en-GB') }}
            </div>
            
            <div v-if="!isUserInProject(project.id) && !hasPendingRequest(project.id)" class="pt-2">
              <UButton 
                color="primary" 
                size="sm" 
                block
                @click="openRequestModal(project.id)"
              >
                {{ $t('projects.requestToJoin') }}
              </UButton>
            </div>
          </div>
        </UCard>
      </div>
    </UCard>

    <!-- Request Modal -->
    <UModal v-model="isRequestOpen">
      <UCard>
        <template #header>
          <h3 class="font-semibold">{{ $t('projects.requestToJoinProject') }}</h3>
        </template>
        <div class="space-y-4">
            <UFormGroup :label="$t('common.project')">
              <UInput 
                :value="projects.find(p => p.id === selectedProject)?.name || ''" 
                disabled 
              />
            </UFormGroup>
            <UFormGroup :label="$t('projects.message')">
              <UTextarea 
                v-model="requestForm.message" 
                :placeholder="$t('projects.whyJoin')"
                :rows="3"
              />
            </UFormGroup>
            <UFormGroup :label="$t('projects.referralPercentage')">
              <UInput 
                v-model.number="requestForm.ref_percentage" 
                type="number" 
                min="0" 
                max="100" 
                step="0.1"
              />
            </UFormGroup>
          </div>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="gray" variant="soft" @click="isRequestOpen = false" :disabled="isLoading">
              {{ $t('common.cancel') }}
            </UButton>
            <UButton 
              color="primary" 
              @click="submitJoinRequest" 
              :loading="isLoading"
              :disabled="isLoading"
            >
              {{ $t('projects.submitRequest') }}
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<style scoped></style>

