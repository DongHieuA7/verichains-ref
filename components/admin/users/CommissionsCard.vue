<script setup lang="ts">
const { t } = useI18n()

type Commission = {
  id: string
  user_id?: string
  project_id?: string | null
  client_name?: string | null
  description?: string | null
  date?: string | null
  status?: 'requested' | 'confirmed' | 'paid' | string | null
  value?: number | null
  original_value?: number | null
  currency?: string | null
  contract_amount?: number | null
  commission_rate?: number | null
}

interface Props {
  commissions: Commission[]
  filteredCommissions: Commission[]
  projectsMap: Record<string, string>
  projectRefInfo: Record<string, { ref_percentage: number }>
  totals: {
    totalVND: number
    confirmedVND: number
    paidVND: number
    requestedVND: number
  }
  selectedYear: number
  selectedMonth: string
}

interface Emits {
  (e: 'update:selectedYear', value: number): void
  (e: 'update:selectedMonth', value: string): void
  (e: 'confirm', commission: Commission): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Statistics cards configuration
const statisticsCards = computed(() => {
  return [
    {
      title: t('commissions.totalReceived'),
      icon: 'i-lucide-badge-dollar-sign',
      iconColor: 'green',
      valueVND: props.totals.paidVND,
    },
    {
      title: t('commissions.pendingCommission'),
      icon: 'i-lucide-hourglass',
      iconColor: 'orange',
      valueVND: props.totals.confirmedVND,
    },
    {
      title: t('commissions.requested'),
      icon: 'i-lucide-clock',
      iconColor: 'yellow',
      valueVND: props.totals.requestedVND,
    },
  ]
})

// Filter values for CommissionFilters
const filterValues = computed({
  get: () => ({
    year: props.selectedYear,
    month: props.selectedMonth,
  }),
  set: (val) => {
    if (val.year !== undefined) {
      const numValue = typeof val.year === 'string' && val.year !== '' ? Number(val.year) : (typeof val.year === 'number' ? val.year : new Date().getFullYear())
      if (!isNaN(numValue)) {
        emit('update:selectedYear', numValue)
      }
    }
    if (val.month !== undefined) {
      emit('update:selectedMonth', val.month)
    }
  },
})
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="font-medium">{{ $t('users.userCommissions') }}</h3>
        <CommissionFilters
          v-model="filterValues"
          :show-year="true"
          :show-month="true"
          layout="header"
        />
      </div>
    </template>

    <!-- Statistics -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <StatisticsCard
        v-for="(card, index) in statisticsCards"
        :key="index"
        :title="card.title"
        :icon="card.icon"
        :icon-color="card.iconColor"
        :value-VND="card.valueVND"
      />
    </div>

    <!-- Commissions Table -->
    <CommissionsTable
      :commissions="filteredCommissions as any"
      :show-project="true"
      :can-approve="true"
      :project-ref-info="projectRefInfo as Record<string, { ref_percentage: number }>"
      :projects-map="projectsMap"
      @approve="emit('confirm', $event)"
    />
  </UCard>
</template>

