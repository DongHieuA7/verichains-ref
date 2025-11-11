<script setup lang="ts">
type Draft = {
  project_id?: string
  client_name?: string
  description?: string
  contract_amount?: number | null
  commission_rate?: number | null
  status?: string
}

interface ProjectOption { label: string; value: string }
interface StatusOption { label: string; value: string }

interface Props {
  modelValue: Draft
  showProject?: boolean
  projectOptions?: ProjectOption[]
  showStatus?: boolean
  statusOptions?: StatusOption[]
  showRate?: boolean
  minRate?: number
  maxRate?: number
  showCalculatedHint?: boolean
  currency?: string
}

const props = withDefaults(defineProps<Props>(), {
  showProject: false,
  projectOptions: () => [],
  showStatus: false,
  statusOptions: () => [],
  showRate: false,
  minRate: 0,
  maxRate: 100,
  showCalculatedHint: false,
  currency: 'VND',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: Draft): void
}>()

const updateDraft = (updates: Partial<Draft>) => {
  emit('update:modelValue', { ...props.modelValue, ...updates })
}

const draft = computed<Draft>({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

// Individual computed properties for v-model binding
const projectId = computed({
  get: () => draft.value.project_id,
  set: (val) => updateDraft({ project_id: val }),
})

const clientName = computed({
  get: () => draft.value.client_name,
  set: (val) => updateDraft({ client_name: val }),
})

const description = computed({
  get: () => draft.value.description,
  set: (val) => updateDraft({ description: val }),
})

const contractAmount = computed({
  get: () => draft.value.contract_amount,
  set: (val) => updateDraft({ contract_amount: val }),
})

const commissionRate = computed({
  get: () => draft.value.commission_rate,
  set: (val) => {
    if (val == null) {
      updateDraft({ commission_rate: val })
      return
    }
    const min = Number(props.minRate ?? 0)
    const max = Number(props.maxRate ?? 100)
    const clamped = Math.max(min, Math.min(max, Number(val)))
    updateDraft({ commission_rate: clamped })
  },
})

const status = computed({
  get: () => draft.value.status,
  set: (val) => updateDraft({ status: val }),
})

const calculatedAmount = computed(() => {
  const amount = draft.value.contract_amount
  const rate = draft.value.commission_rate
  if (amount != null && rate != null) {
    return Number(amount || 0) * (Number(rate || 0) / 100)
  }
  return 0
})

const formatValue = (val: number | null | undefined, currency: string) => {
  const n = Number(val || 0)
  try {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency }).format(n)
  } catch {
    return `${n.toLocaleString('vi-VN')} ${currency}`
  }
}
</script>

<template>
  <div class="space-y-4">
    <UFormGroup v-if="showProject" :label="$t('common.project')">
      <USelect v-model="projectId" :options="projectOptions" />
    </UFormGroup>

    <UFormGroup :label="$t('commissions.clientName')">
      <UInput v-model="clientName" :placeholder="$t('commissions.clientNamePlaceholder')" />
    </UFormGroup>

    <UFormGroup :label="$t('common.description')">
      <UTextarea v-model="description" :rows="3" />
    </UFormGroup>

    <UFormGroup :label="$t('commissions.contractAmount')">
      <UInput v-model.number="contractAmount" type="number" step="0.01" />
    </UFormGroup>

    <UFormGroup v-if="showRate" :label="$t('commissions.commissionRate')">
      <UInput
        v-model.number="commissionRate"
        type="number"
        step="0.01"
        :min="minRate"
        :max="maxRate"
        :placeholder="$t('commissions.commissionRate')"
      />
      <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {{ $t('projects.commissionRateRange') }}: {{ minRate }}%<span v-if="minRate != null && maxRate != null"> - </span>{{ maxRate }}%
      </p>
      <p v-if="showCalculatedHint" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {{ $t('commissions.commissionAmount') }}: {{ formatValue(calculatedAmount, currency) }}
      </p>
    </UFormGroup>

    <UFormGroup v-if="showStatus" :label="$t('common.status')">
      <USelect v-model="status" :options="statusOptions" />
    </UFormGroup>
  </div>
  
</template>

