export default defineNuxtRouteMiddleware(async (to) => {
  // Route public thì bỏ qua guard
  if (to.meta?.auth === false) return

  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  // Không redirect trên SSR — để client khôi phục session
  if (process.server) return

  // Tránh chạy chồng
  const lock = useState('authGuardLock', () => false)
  if (lock.value) return
  lock.value = true

  try {
    // 1) Lấy session hiện có (nhanh)
    const { data } = await supabase.auth.getSession()
    if (data.session && user.value) return

    // 2) Nếu chưa có, đợi INITIAL_SESSION / SIGNED_IN / TOKEN_REFRESHED
    await new Promise<void>((resolve) => {
      let done = false
      const finish = () => { if (!done) { done = true; resolve() } }
      const { data: sub } = supabase.auth.onAuthStateChange((ev) => {
        if (['INITIAL_SESSION', 'SIGNED_IN', 'TOKEN_REFRESHED'].includes(ev)) {
          sub.subscription.unsubscribe()
          finish()
        }
      })
      // fallback trong trường hợp event không bắn
      setTimeout(finish, 500)
    })

    // 3) Quyết định sau khi đã khôi phục
    if (!user.value) {
      return navigateTo('/sign-in', { replace: true })
    }
  } finally {
    lock.value = false
  }
})





