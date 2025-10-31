import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email: string, name?: string, makeAdmin?: boolean }>(event)
  const config = useRuntimeConfig(event)

  if (!body?.email) {
    throw createError({ statusCode: 400, statusMessage: 'Email is required' })
  }

  const supabaseUrl = process.env.SUPABASE_URL as string
  const serviceKey = (config as any).supabaseServiceRoleKey as string

  if (!supabaseUrl || !serviceKey) {
    throw createError({ statusCode: 500, statusMessage: 'Supabase service config missing' })
  }

  const adminClient = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

  // Invite user
  const inviteRes = await adminClient.auth.admin.inviteUserByEmail(body.email)
  if (inviteRes.error) {
    throw createError({ statusCode: inviteRes.error.status || 400, statusMessage: inviteRes.error.message })
  }

  const userId = inviteRes.data.user?.id
  if (userId) {
    // Upsert profile
    const { error: upsertErr } = await adminClient
      .from('user_profiles')
      .upsert({ id: userId, email: body.email, name: body.name || null }, { onConflict: 'id' })

    if (upsertErr) {
      // non-fatal
      console.error(upsertErr)
    }

    if (body.makeAdmin) {
      const { error: adminErr } = await adminClient
        .from('admins')
        .upsert({ id: userId, email: body.email, name: body.name || null }, { onConflict: 'id' })
      if (adminErr) {
        console.error(adminErr)
      }
    }
  }

  return { ok: true }
})




