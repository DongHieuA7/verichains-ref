<template>
  <USelectMenu
    :model-value="locale"
    :options="localeOptions"
    @update:model-value="handleLocaleChange"
    class="w-36"
    value-attribute="code"
  >
    <template #label>
      <span class="flex items-center gap-2 whitespace-nowrap">
        <UIcon name="i-lucide-globe" />
        <span class="truncate">{{ currentLocale.name }}</span>
      </span>
    </template>
    <template #option="{ option }">
      <span class="flex items-center gap-2">
        <UIcon name="i-lucide-globe" />
        <span>{{ option.name }}</span>
      </span>
    </template>
  </USelectMenu>
</template>

<script setup lang="ts">
const { locale, locales, setLocale } = useI18n()

// Type guard to check if locale is an object
const isLocaleObject = (l: any): l is { code: string; name: string } => {
  return typeof l === 'object' && l !== null && 'code' in l && 'name' in l
}

const localeOptions = computed(() => {
  return locales.value
    .filter(isLocaleObject)
    .map((l) => ({
      code: l.code,
      name: l.name,
      label: l.name
    }))
})

const currentLocale = computed((): { code: string; name: string } => {
  const found = locales.value.find((l: any) => isLocaleObject(l) && l.code === locale.value)
  if (found && isLocaleObject(found)) {
    return found
  }
  const first = locales.value.find(isLocaleObject)
  return first && isLocaleObject(first) ? first : { code: locale.value, name: locale.value }
})

const handleLocaleChange = (value: string) => {
  setLocale(value)
}
</script>
