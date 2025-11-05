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
const isPolicyOpen = ref(false)
const selectedProject = ref<string>('')
const selectedProjectData = ref<any>(null)
const requestForm = reactive({
  message: '',
})
// Track if policy modal was opened from request form
const isPolicyOpenedFromRequest = ref(false)
// Store request form data when opening policy modal
const savedRequestFormData = reactive({
  message: '',
  selectedProject: '',
  selectedProjectData: null as any,
})

// Fetch all projects
const fetchProjects = async () => {
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, created_at, commission_rate_min, commission_rate_max, policy')
    .order('name')
  
  if (error) {
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
  selectedProjectData.value = projects.value.find(p => p.id === projectId)
  requestForm.message = ''
  isRequestOpen.value = true
}

// Open policy modal
const openPolicyModal = (project: any, fromRequestForm = false) => {
  selectedProjectData.value = project
  isPolicyOpenedFromRequest.value = fromRequestForm
  if (fromRequestForm) {
    // Save current request form data
    savedRequestFormData.message = requestForm.message
    savedRequestFormData.selectedProject = selectedProject.value
    savedRequestFormData.selectedProjectData = selectedProjectData.value
    // Close request form temporarily
    isRequestOpen.value = false
  }
  isPolicyOpen.value = true
}

// Close policy modal and restore request form if needed
const closePolicyModal = () => {
  isPolicyOpen.value = false
  // The watcher will handle restoring the request form if needed
}

// Watch for policy modal closing (handles ESC key, clicking outside, etc.)
watch(isPolicyOpen, (newValue) => {
  if (!newValue && isPolicyOpenedFromRequest.value) {
    // Policy modal was closed, restore request form
    requestForm.message = savedRequestFormData.message
    selectedProject.value = savedRequestFormData.selectedProject
    selectedProjectData.value = savedRequestFormData.selectedProjectData
    isRequestOpen.value = true
    isPolicyOpenedFromRequest.value = false
  }
})

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
        ref_percentage: null, // User cannot set commission rate
        status: 'pending',
      })
    
    if (error) {
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
          
          <div class="space-y-3">
            <div class="text-sm text-gray-500 dark:text-gray-400">
              {{ $t('projects.created') }}: {{ new Date(project.created_at).toLocaleDateString('en-GB') }}
            </div>
            
            <!-- Commission Rate Range -->
            <div v-if="project.commission_rate_min != null || project.commission_rate_max != null" class="text-sm">
              <span class="font-medium text-gray-700 dark:text-gray-300">{{ $t('projects.commissionRateRange') }}:</span>
              <span class="text-gray-600 dark:text-gray-300 ml-1">
                {{ project.commission_rate_min != null ? `${project.commission_rate_min}%` : '' }}
                <span v-if="project.commission_rate_min != null && project.commission_rate_max != null"> - </span>
                {{ project.commission_rate_max != null ? `${project.commission_rate_max}%` : '' }}
              </span>
            </div>
            
            <!-- Policy -->
            <div v-if="project.policy" class="text-sm">
              <UButton 
                color="gray" 
                variant="outline" 
                size="xs"
                class="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700"
                @click="openPolicyModal(project)"
              >
                {{ $t('projects.viewPolicy') }}
              </UButton>
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
                class="bg-gray-50 dark:bg-gray-800 dark:border-gray-700"
              />
            </UFormGroup>
            
            <!-- Show Commission Rate Range (read-only) -->
            <UFormGroup v-if="selectedProjectData && (selectedProjectData.commission_rate_min != null || selectedProjectData.commission_rate_max != null)" :label="$t('projects.commissionRateRange')">
              <UInput 
                :value="`${selectedProjectData.commission_rate_min != null ? selectedProjectData.commission_rate_min : ''}${selectedProjectData.commission_rate_min != null && selectedProjectData.commission_rate_max != null ? ' - ' : ''}${selectedProjectData.commission_rate_max != null ? selectedProjectData.commission_rate_max : ''}%`"
                disabled
                class="bg-gray-50 dark:bg-gray-800 dark:border-gray-700 flex-1"
              />
            </UFormGroup>
            
            <!-- Show Policy link if exists -->
            <div v-if="selectedProjectData?.policy" class="text-sm">
              <UButton 
                color="gray" 
                variant="outline" 
                size="xs"
                @click="openPolicyModal(selectedProjectData, true)"
                class="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700"
              >
                {{ $t('projects.viewPolicy') }}
              </UButton>
            </div>
            
            <UFormGroup :label="$t('projects.message')">
              <UTextarea 
                v-model="requestForm.message" 
                :placeholder="$t('projects.whyJoin')"
                :rows="3"
              />
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ $t('projects.messageOptional') || 'Optional message explaining why you want to join this project' }}</p>
            </UFormGroup>
          </div>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="gray" variant="outline" class="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700" @click="isRequestOpen = false" :disabled="isLoading">
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

    <!-- Policy Modal -->
    <UModal v-model="isPolicyOpen">
      <UCard>
        <template #header>
          <h3 class="font-semibold">{{ $t('projects.policy') }} - {{ selectedProjectData?.name }}</h3>
        </template>
        <div class="space-y-4">
          <div class="whitespace-pre-wrap text-sm text-gray-700 dark:text-white">
            {{ selectedProjectData?.policy || $t('common.noData') }}
          </div>
        </div>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="gray" variant="outline" class="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700" @click="closePolicyModal">
              {{ $t('common.cancel') }}
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<style scoped></style>

