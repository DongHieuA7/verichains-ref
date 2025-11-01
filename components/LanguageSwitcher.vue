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

const localeOptions = computed(() => {
  return locales.value.map((l: any) => ({
    code: l.code,
    name: l.name,
    label: l.name
  }))
})

const currentLocale = computed(() => {
  return locales.value.find((l: any) => l.code === locale.value) || locales.value[0]
})

const handleLocaleChange = (value: string) => {
  setLocale(value)
}
</script>
