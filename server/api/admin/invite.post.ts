import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  // Check authentication - get token from headers
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const token = authHeader.replace('Bearer ', '')
  const config = useRuntimeConfig(event)
  
  // Get Supabase config - try multiple sources
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
  
  if (!supabaseUrl || !anonKey) {
    console.error('Supabase config missing:', { 
      hasUrl: !!supabaseUrl, 
      hasKey: !!anonKey,
      configSupabaseUrl: !!(config as any).supabaseUrl,
      configPublicUrl: !!(config as any).public?.supabaseUrl,
      envUrl: !!process.env.SUPABASE_URL,
      envKey: !!process.env.SUPABASE_ANON_KEY
    })
    throw createError({ statusCode: 500, statusMessage: 'Supabase config missing. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.' })
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  })

  const { data: { user }, error: userError } = await userClient.auth.getUser()
  if (userError || !user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  // Check if user is admin
  const { data: adminData, error: adminError } = await userClient
    .from('admins')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (adminError || !adminData) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden: Admin access required' })
  }

  const body = await readBody<{ email: string, name?: string, makeAdmin?: boolean }>(event)

  if (!body?.email) {
    throw createError({ statusCode: 400, statusMessage: 'Email is required' })
  }

  const serviceKey = 
    (config as any).supabaseServiceRoleKey || 
    process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceKey) {
    console.error('Supabase service role key missing')
    throw createError({ statusCode: 500, statusMessage: 'Supabase service config missing. Please set SUPABASE_SERVICE_ROLE_KEY environment variable.' })
  }

  const adminClient = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

  // Invite user
  const inviteRes = await adminClient.auth.admin.inviteUserByEmail(body.email)
  if (inviteRes.error) {
    throw createError({ statusCode: inviteRes.error.status || 400, statusMessage: inviteRes.error.message })
  }

  const userId = inviteRes.data.user?.id
  if (userId) {
    if (body.makeAdmin) {
      // If user is being set as admin, create admin record
      // Trigger will automatically delete user_profiles if it exists
      const { error: adminErr } = await adminClient
        .from('admins')
        .upsert({ id: userId, email: body.email, name: body.name || null }, { onConflict: 'id' })
      if (adminErr) {
        console.error(adminErr)
        throw createError({ statusCode: 500, statusMessage: 'Failed to create admin' })
      }
    } else {
      // If user is not admin, create user profile
      const { error: upsertErr } = await adminClient
        .from('user_profiles')
        .upsert({ id: userId, email: body.email, name: body.name || null }, { onConflict: 'id' })

      if (upsertErr) {
        // non-fatal
        console.error(upsertErr)
      }
    }
  }

  return { ok: true }
})




