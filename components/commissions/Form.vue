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

const draft = computed<Draft>({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

// Clamp commission_rate to [minRate, maxRate]
watch(
  () => draft.value.commission_rate,
  (rate, oldRate) => {
    if (!props.showRate) return
    if (rate == null) return
    const min = Number(props.minRate ?? 0)
    const max = Number(props.maxRate ?? 100)
    // Only clamp if the value is actually out of range and different from old value
    if (rate < min && rate !== oldRate) {
      emit('update:modelValue', { ...draft.value, commission_rate: min })
    } else if (rate > max && rate !== oldRate) {
      emit('update:modelValue', { ...draft.value, commission_rate: max })
    }
  }
)

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
      <USelect v-model="draft.project_id" :options="projectOptions" />
    </UFormGroup>

    <UFormGroup :label="$t('commissions.clientName')">
      <UInput v-model="draft.client_name" :placeholder="$t('commissions.clientNamePlaceholder')" />
    </UFormGroup>

    <UFormGroup :label="$t('common.description')">
      <UTextarea v-model="draft.description" :rows="3" />
    </UFormGroup>

    <UFormGroup :label="$t('commissions.contractAmount')">
      <UInput v-model.number="(draft as any).contract_amount" type="number" step="0.01" />
    </UFormGroup>

    <UFormGroup v-if="showRate" :label="$t('commissions.commissionRate')">
      <UInput
        v-model.number="(draft as any).commission_rate"
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
      <USelect v-model="draft.status" :options="statusOptions" />
    </UFormGroup>
  </div>
  
</template>

