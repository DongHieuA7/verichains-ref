<script setup lang="ts">
const { t } = useI18n()

definePageMeta({ middleware: ['auth', 'user-only'] })
useSeoMeta({ title: t('projects.availableProjects') })

const supabase = useSupabaseClient()
const user = useSupabaseUser()

const projects = ref<any[]>([])
const userProjects = ref<string[]>([])
const userRequests = ref<Record<string, { id: string, status: string }>>({})

// Request form
const isRequestOpen = ref(false)
const isPolicyOpen = ref(false)
const selectedProject = ref<string>('')
const selectedProjectData = ref<any>(null)
// Track if policy modal was opened from request form
const isPolicyOpenedFromRequest = ref(false)

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
  isRequestOpen.value = true
}

// Handle request submitted
const handleRequestSubmitted = async () => {
  await fetchUserRequests()
}

// Open policy modal
const openPolicyModal = (project: any) => {
  selectedProjectData.value = project
  isPolicyOpen.value = true
}

// Handle policy modal closed
const handlePolicyModalClosed = () => {
  if (isPolicyOpenedFromRequest.value) {
    // Policy modal was closed, restore request form
    isRequestOpen.value = true
    isPolicyOpenedFromRequest.value = false
  }
}

// Handle view policy from request modal
const handleViewPolicyFromRequest = () => {
  if (selectedProjectData.value) {
    isPolicyOpenedFromRequest.value = true
    openPolicyModal(selectedProjectData.value)
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
        <ProjectsCard
          v-for="project in projects"
          :key="project.id"
          :project="project"
          :is-joined="isUserInProject(project.id)"
          :has-pending-request="hasPendingRequest(project.id)"
          @request-join="openRequestModal"
          @view-policy="openPolicyModal"
              />
      </div>
    </UCard>

    <!-- Request Modal -->
    <ProjectsRequestModal
      v-model="isRequestOpen"
      :project="selectedProjectData"
      @submitted="handleRequestSubmitted"
      @view-policy="handleViewPolicyFromRequest"
          />

    <!-- Policy Modal -->
    <ProjectsPolicyModal
      v-model="isPolicyOpen"
      :project="selectedProjectData"
      @closed="handlePolicyModalClosed"
    />
  </div>
</template>

<style scoped></style>

