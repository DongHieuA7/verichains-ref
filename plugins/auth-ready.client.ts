export default defineNuxtPlugin(async () => {
  const supabase = useSupabaseClient()
  const ready = useState('authReady', () => false)

  // Gọi khôi phục session ngay khi app khởi động
  await supabase.auth.getSession()

  // Đợi cho tới khi Supabase báo đã có trạng thái ban đầu / ký vào
  await new Promise<void>((resolve) => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (['SIGNED_IN', 'TOKEN_REFRESHED', 'INITIAL_SESSION'].includes(event)) {
        sub.subscription.unsubscribe()
        resolve()
      }
    })
    // fallback: có khi INITIAL_SESSION không bắn → vẫn cho qua sau 400ms
    setTimeout(() => resolve(), 400)
  })

  ready.value = true
})
