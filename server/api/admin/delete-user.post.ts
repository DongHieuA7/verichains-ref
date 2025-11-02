import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  // Check authentication - get token from headers
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized. Missing or invalid Authorization header.' })
  }

  const token = authHeader.replace('Bearer ', '')

  // Get runtime config
  const config = useRuntimeConfig(event)

  // Get Supabase URL and Anon Key
  const supabaseUrl = 
    config.public?.supabaseUrl ||
    config.supabaseUrl ||
    process.env.SUPABASE_URL ||
    process.env.NUXT_PUBLIC_SUPABASE_URL

  const anonKey = 
    config.public?.supabaseAnonKey ||
    config.public?.supabaseKey ||
    config.supabaseAnonKey ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NUXT_PUBLIC_SUPABASE_KEY

  if (!supabaseUrl || !anonKey) {
    throw createError({ statusCode: 500, statusMessage: 'Supabase config missing. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.' })
  }

  // Verify user is authenticated and is an admin
  const client = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  })

  const { data: { user }, error: userError } = await client.auth.getUser()

  if (userError || !user) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid token' })
  }

  // Check if user is admin
  const { data: adminData, error: adminError } = await client
    .from('admins')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (adminError || !adminData) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden. Only admins can delete users.' })
  }

  const body = await readBody<{ userId: string }>(event)

  if (!body?.userId) {
    throw createError({ statusCode: 400, statusMessage: 'User ID is required' })
  }

  const serviceKey = 
    (config as any).supabaseServiceRoleKey || 
    process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceKey) {
    throw createError({ statusCode: 500, statusMessage: 'Supabase service config missing. Please set SUPABASE_SERVICE_ROLE_KEY environment variable.' })
  }

  const adminClient = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

  // Delete user from auth.users (this will cascade delete user_profiles and related data)
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(body.userId)

  if (deleteError) {
    throw createError({ statusCode: 500, statusMessage: deleteError.message || 'Failed to delete user' })
  }

  return { ok: true }
})

