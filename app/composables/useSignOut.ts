export function useSignOut() {
  const supabase = useSupabaseClient()

  return async function signOut(): Promise<void> {
    try {
      await $fetch('/api/_novatron/auth-event', { method: 'POST', body: { action: 'auth.logout' } })
    } catch {
      // Local sign-out must still happen when HQ audit logging is unreachable.
    } finally {
      await supabase.auth.signOut()
      await navigateTo('/login')
    }
  }
}
