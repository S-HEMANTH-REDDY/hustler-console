import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

export function useCloudDataMode(): boolean {
  const status = useAuthStore((s) => s.status)
  return isSupabaseConfigured && status === 'authed'
}

/** For async helpers and mutations — not a React subscription. */
export function isCloudDataActiveSnapshot(): boolean {
  return (
    isSupabaseConfigured && useAuthStore.getState().status === 'authed'
  )
}

export async function getCloudUserId(): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null
  return data.user.id
}
