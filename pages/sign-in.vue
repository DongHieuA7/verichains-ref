<script setup lang="ts">
  import { BaseError, useErrorHandler } from '~/composables/use-error-handler'

  definePageMeta({
    middleware: 'guest',
    layout: 'auth'
  })

  useSeoMeta({
    title: 'Sign In - Nuxt Supabase Starter',
  })

  const { auth } = useSupabaseClient()
  const { errorHandler } = useErrorHandler()
  const colorMode = useColorMode()
  
  const isLoading = ref(false)
  
  // Initialize logo path based on current theme
  const getInitialLogo = () => {
    if (typeof window === 'undefined') return '/favicon.png'
    
    // Check if dark class exists on document
    const isDark = document.documentElement.classList.contains('dark')
    return isDark ? '/white-logo.png' : '/favicon.png'
  }

  const logoPath = ref(getInitialLogo())

  // Update logo when color mode changes
  watch(() => colorMode.value, (newValue) => {
    logoPath.value = newValue === 'dark' ? '/white-logo.png' : '/favicon.png'
  }, { immediate: true })

  // Watch preference changes
  watch(() => colorMode.preference, (newPreference) => {
    if (newPreference && newPreference !== 'system') {
      logoPath.value = newPreference === 'dark' ? '/white-logo.png' : '/favicon.png'
    } else if (newPreference === 'system') {
      logoPath.value = colorMode.value === 'dark' ? '/white-logo.png' : '/favicon.png'
    }
  }, { immediate: true })

  onMounted(() => {
    // Double-check on mount
    const isDark = document.documentElement.classList.contains('dark')
    logoPath.value = isDark ? '/white-logo.png' : '/favicon.png'
  })

  const signInWithGoogle = async () =>  {
    try {
      isLoading.value = true
      const signIn = await auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/confirm`
        }
      })
      if(signIn?.error) {
        throw new BaseError(signIn.error.status, signIn.error.message)
      }
      isLoading.value = false
    } catch (error) {
      isLoading.value = false
      errorHandler(error as BaseError)
    }
  }

  /**
   * Sign in with a provider.
   *
   * @param {string} provider - The provider to sign in with. Can be 'GITHUB' or 'GOOGLE'.
   */
  
</script>

<template>
  <div class="w-full max-w-md mx-auto">
    <div class="text-center space-y-6 mb-6">
      <div>
        <div class="flex items-center justify-center gap-3 mb-4">
          <img :src="logoPath" alt="Logo" class="w-12 h-12" />
          <h1 class="text-3xl font-bold">{{ $t('home.title') }}</h1>
        </div>
        <p class="text-gray-600 dark:text-white">{{ $t('home.subtitle') }}</p>
      </div>
    </div>
    <UCard>
      <div class="space-y-4 p-4">
        <p class="text-lg font-bold text-center">{{ $t('signIn.signInWithGoogle') }}</p>
        <UButton 
          :loading="isLoading"
          :disabled="isLoading"
          color="red" 
          :label="$t('signIn.continueWithGoogle')" 
          icon="i-lucide-mail" 
          block
          @click="signInWithGoogle" />
      </div>
    </UCard>
  </div>
</template>

<style scoped>

</style>