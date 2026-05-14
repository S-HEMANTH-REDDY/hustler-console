import type { Session, User } from '@supabase/supabase-js'
import { create } from 'zustand'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

/**
 * Auth lifecycle states. `disabled` means Supabase env vars are missing, so
 * the app falls back to its original single-user local-only behaviour and
 * no auth gate is enforced. `loading` is the brief window between mount and
 * the first `getSession()` call.
 */
export type AuthStatus = 'loading' | 'authed' | 'guest' | 'disabled'

interface AuthState {
  status: AuthStatus
  session: Session | null
  user: User | null
  /** Set by Supabase when it emits PASSWORD_RECOVERY so the UI can prompt for a new password. */
  recoveryMode: boolean
  init: () => Promise<void>
  signOut: () => Promise<void>
  setRecoveryMode: (v: boolean) => void
}

let initialized = false

export const useAuthStore = create<AuthState>((set) => ({
  status: isSupabaseConfigured ? 'loading' : 'disabled',
  session: null,
  user: null,
  recoveryMode: false,

  init: async () => {
    if (initialized) return
    initialized = true
    if (!supabase) {
      set({ status: 'disabled' })
      return
    }
    const { data } = await supabase.auth.getSession()
    const session = data.session
    set({
      status: session ? 'authed' : 'guest',
      session,
      user: session?.user ?? null,
    })
    supabase.auth.onAuthStateChange((event, s) => {
      const recovery = event === 'PASSWORD_RECOVERY'
      set({
        status: s ? 'authed' : 'guest',
        session: s,
        user: s?.user ?? null,
        recoveryMode: recovery,
      })
    })
  },

  signOut: async () => {
    if (!supabase) return
    await supabase.auth.signOut()
  },

  setRecoveryMode: (recoveryMode) => set({ recoveryMode }),
}))
