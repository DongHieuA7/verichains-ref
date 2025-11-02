/**
 * Extract error message from various error formats
 * Supports Supabase errors, API errors, and generic errors
 */
export const useErrorMessage = () => {
  const getErrorMessage = (error: any): string => {
    if (!error) return 'An unknown error occurred'
    
    // API error from $fetch (Nuxt/Nitro)
    if (error.data?.message) {
      return error.data.message
    }
    
    // Supabase error
    if (error.message) {
      // For Supabase, prefer details or hint if available, otherwise use message
      if (error.details) {
        return `${error.message}: ${error.details}`
      }
      if (error.hint) {
        return `${error.message} (${error.hint})`
      }
      return error.message
    }
    
    // Generic error object
    if (typeof error === 'string') {
      return error
    }
    
    // Last resort
    return error.toString?.() || 'An unknown error occurred'
  }
  
  return {
    getErrorMessage,
  }
}

