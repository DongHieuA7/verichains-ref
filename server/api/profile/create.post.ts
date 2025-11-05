import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  // Check authentication - get token from headers
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const token = authHeader.replace('Bearer ', '')
  const config = useRuntimeConfig(event)
  
  // Get Supabase config
  const supabaseUrl = 
    (config as any).supabaseUrl || 
    (config as any).public?.supabaseUrl || 
    process.env.SUPABASE_URL ||
    process.env.NUXT_PUBLIC_SUPABASE_URL
  
  const anonKey = 
    (config as any).public?.supabaseAnonKey || 
    process.env.SUPABASE_ANON_KEY ||
    process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NUXT_PUBLIC_SUPABASE_KEY
  
  const serviceRoleKey = 
    (config as any).supabaseServiceRoleKey ||
    process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !anonKey) {
    throw createError({ statusCode: 500, statusMessage: 'Supabase config missing' })
  }

  // Verify user token
  const userClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  })

  const { data: { user }, error: userError } = await userClient.auth.getUser()
  if (userError || !user) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid token' })
  }

  // Use service role client to create profile (bypasses RLS)
  if (!serviceRoleKey) {
    throw createError({ statusCode: 500, statusMessage: 'Service role key missing' })
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  // Check if profile already exists
  const { data: existingProfile } = await adminClient
    .from('user_profiles')
    .select('id, email, name, company, descript, ref_code')
    .eq('id', user.id)
    .maybeSingle()

  if (existingProfile) {
    return existingProfile
  }

  // Create new profile
  const { data: newProfile, error: insertError } = await adminClient
    .from('user_profiles')
    .insert({
      id: user.id,
      email: user.email || '',
      name: user.user_metadata?.name || user.email?.split('@')[0] || '',
    })
    .select()
    .single()

  if (insertError) {
    throw createError({ statusCode: 500, statusMessage: insertError.message })
  }

  return newProfile
})

