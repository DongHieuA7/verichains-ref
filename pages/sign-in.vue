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
  
  const isLoading = ref(false)

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
  <div>
    <div class="container mx-auto">
      <div class="flex h-[100vh] w-full justify-center items-center">
        <div class="w-10/12 md:w-8/12 lg:w-4/12 xl:w-3/12">
          <UCard>
            <div class="space-y-4">
              <div class="flex justify-center">
                <img src="/favicon.png" class="h-[80px]">
              </div>
              <p class="text-lg font-bold text-center">{{ $t('signIn.signInWithGoogle') }}</p>
              <UButton 
                :loading="isLoading"
                :disabled="isLoading"
                color="red" :label="$t('signIn.continueWithGoogle')" 
                icon="i-lucide-mail" block
                @click="signInWithGoogle" />
            </div>
          </UCard>

          
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>

</style>