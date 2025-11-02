import { computed } from 'vue'
import { useI18n } from '#imports'

export const useDateFilters = (selectedYear: Ref<number | string>, selectedMonth: Ref<string>) => {
  const { t } = useI18n()

  const yearOptions = computed(() => {
    const current = new Date().getFullYear()
    const years: { label: string, value: number | string }[] = [
      { label: t('common.all'), value: '' }
    ]
    for (let y = current; y >= current - 4; y--) {
      years.push({ label: String(y), value: y })
    }
    return years
  })

  const monthOptions = computed(() => {
    const options: { label: string, value: string }[] = [
      { label: t('commissions.allMonths'), value: '' }
    ]
    if (selectedYear.value) {
      for (let m = 1; m <= 12; m++) {
        const value = `${selectedYear.value}-${String(m).padStart(2,'0')}`
        const label = new Date(`${selectedYear.value}-${String(m).padStart(2,'0')}-01`).toLocaleString(undefined, { month: 'long'})
        options.push({ label, value })
      }
    }
    return options
  })

  return {
    yearOptions,
    monthOptions,
  }
}

