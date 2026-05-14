import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

/**
 * Wraps protected routes. When Supabase isn't configured (env vars missing)
 * the gate is a no-op and the app behaves like the original single-user
 * local-only build. When configured, unauthenticated visitors are bounced
 * to /auth.
 */
export function RequireAuth(props: { children: ReactNode }) {
  const status = useAuthStore((s) => s.status)
  const recoveryMode = useAuthStore((s) => s.recoveryMode)
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div
        role="status"
        className="flex min-h-screen items-center justify-center bg-[#1c1f27] text-sm text-zinc-400"
      >
        Loading session…
      </div>
    )
  }

  if (status === 'disabled') {
    return <>{props.children}</>
  }

  // When we receive a password-recovery event we always send the user to
  // /auth so they can set a fresh password, even if they already have a
  // session.
  if (recoveryMode && location.pathname !== '/auth') {
    return <Navigate to="/auth" replace />
  }

  if (status === 'guest') {
    return <Navigate to="/auth" replace />
  }

  return <>{props.children}</>
}
