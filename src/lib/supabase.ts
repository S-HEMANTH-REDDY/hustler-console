import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase client wired up only when both `VITE_SUPABASE_URL` and
 * `VITE_SUPABASE_ANON_KEY` are present. When they're missing the app stays
 * in single-user local-only mode (Dexie only, no auth gate). This lets us
 * ship multi-user features incrementally without breaking the existing
 * personal-use deployment.
 */

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured: boolean = Boolean(
  url && anonKey && url.length > 0 && anonKey.length > 0,
)

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storageKey: 'hustler.supabase.auth.v1',
      },
    })
  : null

/**
 * Best-effort redirect target for OAuth callbacks. We strip the hash because
 * `HashRouter` will reattach the fragment after Supabase finishes the PKCE
 * code exchange. Falls back to the deployed origin when called from SSR.
 */
export function authRedirectUrl(): string {
  if (typeof window === 'undefined') return ''
  const { origin, pathname } = window.location
  // Keep the basename if the site is hosted under `/hustler-console/`.
  return `${origin}${pathname.replace(/index\.html$/, '')}`
}
