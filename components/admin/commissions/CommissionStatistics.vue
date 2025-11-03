<script setup lang="ts">
const { t } = useI18n()
const { formatValue } = useCommissionFormatters()

interface Props {
  totals: {
    totalVND?: number
    confirmedVND?: number
    paidVND?: number
  }
  type?: 'totalReceived' | 'totalPaid'
}

const props = withDefaults(defineProps<Props>(), {
  type: 'totalReceived',
})

const totalsComputed = computed(() => ({
  totalVND: props.totals.totalVND || 0,
  confirmedVND: props.totals.confirmedVND || 0,
  paidVND: props.totals.paidVND || 0,
}))

const card = computed(() => {
  if (props.type === 'totalPaid') {
    return {
      iconBg: 'bg-blue-100',
      icon: 'i-lucide-check-circle',
      title: t('commissions.totalPaid'),
      value: totalsComputed.value.paidVND,
    }
  }
  return {
    iconBg: 'bg-green-100',
    icon: 'i-lucide-badge-dollar-sign',
    title: t('commissions.totalReceived'),
    value: totalsComputed.value.totalVND,
  }
})
</script>

<template>
  <UCard class="border border-gray-200 hover:shadow-md transition-shadow">
    <div class="flex items-start justify-between">
      <div class="flex-1">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 rounded-full flex items-center justify-center" :class="card.iconBg">
            <UIcon :name="card.icon" class="w-5 h-5 text-current" />
          </div>
          <span class="text-sm font-medium text-gray-600">{{ card.title }}</span>
        </div>
        <div class="space-y-1">
          <template v-if="card.value > 0">
            <div class="text-3xl font-bold text-gray-900">{{ formatValue(card.value, 'VND') }}</div>
          </template>
          <template v-else>
            <div class="text-3xl font-bold text-gray-400">—</div>
          </template>
        </div>
      </div>
    </div>
  </UCard>
</template>

