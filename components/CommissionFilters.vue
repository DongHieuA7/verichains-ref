<script setup lang="ts">
const { t } = useI18n()

interface Option { label: string; value: string | number }

interface FilterValues {
  project?: string
  status?: string
  year?: number | string
  month?: string
}

interface Props {
  modelValue: FilterValues
  showProject?: boolean
  projectOptions?: Option[]
  showStatus?: boolean
  statusOptions?: Option[]
  showYear?: boolean
  showMonth?: boolean
  showReset?: boolean
  layout?: 'inline' | 'header'
  showLabels?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showProject: false,
  projectOptions: () => [],
  showStatus: false,
  statusOptions: () => [],
  showYear: false,
  showMonth: false,
  showReset: false,
  layout: 'inline',
  showLabels: true,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: FilterValues): void
  (e: 'reset'): void
}>()

const filters = computed<FilterValues>({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

// Create refs for useDateFilters - need to sync with filters
const yearRef = ref(props.modelValue.year ?? '')
const monthRef = ref(props.modelValue.month ?? '')

// Sync refs with props changes
watch(() => props.modelValue.year, (val) => {
  yearRef.value = val ?? ''
})

watch(() => props.modelValue.month, (val) => {
  monthRef.value = val ?? ''
})

// Sync refs changes back to filters
watch(yearRef, (val) => {
  filters.value = { ...filters.value, year: val }
})

watch(monthRef, (val) => {
  filters.value = { ...filters.value, month: val }
})

const { yearOptions, monthOptions } = useDateFilters(yearRef, monthRef)

const hasActiveFilters = computed(() => {
  return !!(filters.value.project || filters.value.status || filters.value.year || filters.value.month)
})

const handleReset = () => {
  emit('reset')
  filters.value = {
    project: undefined,
    status: undefined,
    year: undefined,
    month: undefined,
  }
  yearRef.value = ''
  monthRef.value = ''
}

const isHeaderLayout = computed(() => props.layout === 'header')
</script>

<template>
  <div v-if="isHeaderLayout" class="flex items-center gap-3">
    <span v-if="showLabels" class="text-sm text-gray-500">{{ $t('common.filter') }}</span>
    
    <USelect 
      v-if="showProject"
      v-model="filters.project" 
      :options="projectOptions" 
      :placeholder="$t('common.project')"
      class="min-w-[150px]"
    />
    
    <USelect 
      v-if="showStatus"
      v-model="filters.status" 
      :options="statusOptions" 
      :placeholder="$t('common.status')"
      class="min-w-[120px]"
    />
    
    <USelect 
      v-if="showYear"
      v-model="yearRef" 
      :options="yearOptions" 
      :placeholder="$t('common.year')"
      class="min-w-[100px]"
    />
    
    <USelect 
      v-if="showMonth"
      v-model="monthRef" 
      :options="monthOptions" 
      :placeholder="$t('common.month')"
      class="min-w-[150px]"
      :disabled="!yearRef"
    />
    
    <UButton 
      v-if="showReset && hasActiveFilters"
      color="gray" 
      variant="soft" 
      size="xs"
      @click="handleReset"
      icon="i-lucide-x"
    >
      {{ $t('common.reset') || 'Reset' }}
    </UButton>
  </div>

  <div v-else class="flex items-center gap-3 flex-wrap">
    <span v-if="showLabels" class="text-sm text-gray-500 dark:text-white font-medium">{{ $t('common.filter') }}:</span>
    
    <div v-if="showYear" class="flex items-center gap-2">
      <span v-if="showLabels" class="text-sm text-gray-600 dark:text-white">{{ $t('common.year') }}:</span>
      <USelect v-model="yearRef" :options="yearOptions" />
    </div>
    
    <div v-if="showMonth" class="flex items-center gap-2">
      <span v-if="showLabels" class="text-sm text-gray-600 dark:text-white">{{ $t('common.month') }}:</span>
      <USelect v-model="monthRef" :options="monthOptions" :disabled="!yearRef" />
    </div>
    
    <div v-if="showProject" class="flex items-center gap-2">
      <span v-if="showLabels" class="text-sm text-gray-600 dark:text-white">{{ $t('common.project') }}:</span>
      <USelect v-model="filters.project" :options="projectOptions" :placeholder="$t('common.all')" />
    </div>
    
    <div v-if="showStatus" class="flex items-center gap-2">
      <span v-if="showLabels" class="text-sm text-gray-600 dark:text-white">{{ $t('common.status') }}:</span>
      <USelect v-model="filters.status" :options="statusOptions" :placeholder="$t('common.all')" />
    </div>
    
    <UButton 
      v-if="showReset && hasActiveFilters"
      color="gray" 
      variant="soft" 
      size="xs"
      @click="handleReset"
      icon="i-lucide-x"
    >
      {{ $t('common.reset') || 'Reset' }}
    </UButton>
  </div>
</template>

