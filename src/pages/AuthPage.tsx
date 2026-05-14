import { type FormEvent, useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { authRedirectUrl, supabase } from '../lib/supabase'
import { cn } from '../lib/utils'
import { useAuthStore } from '../store/authStore'
import { useUiStore } from '../store/uiStore'

type Mode = 'signin' | 'signup' | 'forgot' | 'reset'

/**
 * Email/password + Google OAuth + magic password reset on a single screen.
 * Renders nothing useful if Supabase isn't configured (the gate sends
 * the user back to the app in local-only mode).
 */
export function AuthPage() {
  const status = useAuthStore((s) => s.status)
  const recoveryMode = useAuthStore((s) => s.recoveryMode)
  const setRecoveryMode = useAuthStore((s) => s.setRecoveryMode)
  const pushToast = useUiStore((s) => s.pushToast)
  const navigate = useNavigate()

  const [mode, setMode] = useState<Mode>(recoveryMode ? 'reset' : 'signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (recoveryMode) setMode('reset')
  }, [recoveryMode])

  // If Supabase isn't configured we have no auth gate at all — kick back to the app.
  if (status === 'disabled') {
    return <Navigate to="/" replace />
  }
  // If the user is already signed in (and not in recovery), there's nothing to do here.
  if (status === 'authed' && !recoveryMode) {
    return <Navigate to="/" replace />
  }
  if (!supabase) {
    return null
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    if (!supabase) return
    setPending(true)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (error) throw error
        pushToast('save', 'Welcome back')
        navigate('/', { replace: true })
      } else if (mode === 'signup') {
        if (password.length < 8) {
          throw new Error('Password must be at least 8 characters')
        }
        if (password !== confirm) {
          throw new Error('Passwords don\u2019t match')
        }
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: authRedirectUrl() },
        })
        if (error) throw error
        if (data.session) {
          pushToast('save', 'Account created')
          navigate('/', { replace: true })
        } else {
          setInfo(
            'Check your inbox to confirm your email, then come back and sign in.',
          )
        }
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          { redirectTo: authRedirectUrl() },
        )
        if (error) throw error
        setInfo('Password reset email sent. Check your inbox.')
      } else if (mode === 'reset') {
        if (password.length < 8) {
          throw new Error('Password must be at least 8 characters')
        }
        if (password !== confirm) {
          throw new Error('Passwords don\u2019t match')
        }
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
        pushToast('save', 'Password updated')
        setRecoveryMode(false)
        navigate('/', { replace: true })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setPending(false)
    }
  }

  async function onGoogle() {
    if (!supabase) return
    setError(null)
    setPending(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: authRedirectUrl(),
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      })
      if (error) throw error
      // Browser will navigate to Google; pending state will reset on return.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed')
      setPending(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1c1f27] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1
            className="bg-gradient-to-b from-zinc-50 to-zinc-300 bg-clip-text text-3xl font-semibold tracking-tight text-transparent"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Hustler
          </h1>
          <p className="mt-1 font-mono text-xs uppercase tracking-wider text-zinc-400">
            APS · DSA · Behavioral · Passion · all in one dashboard
          </p>
        </div>

        <div className="surface-glossy rounded-xl p-6 shadow-2xl">
          {mode !== 'reset' ? (
            <ModeTabs mode={mode} onChange={(m) => setMode(m)} />
          ) : (
            <h2 className="text-base font-semibold text-zinc-100">
              Set a new password
            </h2>
          )}

          {error ? (
            <p className="mt-4 rounded border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          ) : null}
          {info ? (
            <p className="mt-4 rounded border border-lime-700/40 bg-lime-500/5 px-3 py-2 text-sm text-lime-200">
              {info}
            </p>
          ) : null}

          <form onSubmit={onSubmit} className="mt-4 space-y-3">
            {mode !== 'reset' ? (
              <Field label="Email">
                <input
                  type="email"
                  required
                  autoComplete="email"
                  className="field font-mono"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
            ) : null}

            {mode !== 'forgot' ? (
              <Field
                label={mode === 'reset' ? 'New password' : 'Password'}
                trailing={
                  mode === 'signin' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setError(null)
                        setInfo(null)
                        setMode('forgot')
                      }}
                      className="font-mono text-xs text-zinc-400 hover:text-lime-300"
                    >
                      Forgot?
                    </button>
                  ) : null
                }
              >
                <input
                  type="password"
                  required
                  minLength={mode === 'signin' ? undefined : 8}
                  autoComplete={
                    mode === 'signin' ? 'current-password' : 'new-password'
                  }
                  className="field font-mono"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
            ) : null}

            {mode === 'signup' || mode === 'reset' ? (
              <Field label="Confirm password">
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="field font-mono"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </Field>
            ) : null}

            <button
              type="submit"
              disabled={pending}
              className="btn-primary mt-2 w-full rounded-md px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? 'Working\u2026' : submitLabel(mode)}
            </button>
          </form>

          {mode === 'signin' || mode === 'signup' ? (
            <>
              <Divider />
              <button
                type="button"
                onClick={() => void onGoogle()}
                disabled={pending}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-[#3d4150] bg-[#262934] px-4 py-2 text-sm font-medium text-zinc-100 transition-colors hover:border-[#4a4e5b] hover:bg-[#2c2f3a] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <GoogleIcon />
                Continue with Google
              </button>
            </>
          ) : null}

          {mode === 'forgot' ? (
            <button
              type="button"
              onClick={() => {
                setError(null)
                setInfo(null)
                setMode('signin')
              }}
              className="mt-4 w-full text-center font-mono text-xs text-zinc-400 hover:text-lime-300"
            >
              ← Back to sign in
            </button>
          ) : null}
        </div>

        <p className="mt-6 text-center font-mono text-xs text-zinc-400">
          Your data is private. We use Supabase Auth + Postgres with
          row-level security — nobody else can read your rows.
        </p>
      </div>
    </div>
  )
}

function submitLabel(mode: Mode): string {
  switch (mode) {
    case 'signin':
      return 'Sign in'
    case 'signup':
      return 'Create account'
    case 'forgot':
      return 'Send reset email'
    case 'reset':
      return 'Update password'
  }
}

function ModeTabs(props: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="flex rounded-md border border-[#3d4150] bg-[#20232c] p-1">
      {(['signin', 'signup'] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => props.onChange(m)}
          className={cn(
            'flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors',
            props.mode === m
              ? 'bg-[#2c2f3a] text-zinc-50 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]'
              : 'text-zinc-400 hover:text-zinc-200',
          )}
        >
          {m === 'signin' ? 'Sign in' : 'Sign up'}
        </button>
      ))}
    </div>
  )
}

function Field(props: {
  label: string
  children: React.ReactNode
  trailing?: React.ReactNode
}) {
  return (
    <label className="block space-y-1">
      <span className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs uppercase tracking-wider text-zinc-400">
          {props.label}
        </span>
        {props.trailing}
      </span>
      {props.children}
    </label>
  )
}

function Divider() {
  return (
    <div className="my-5 flex items-center gap-3 font-mono text-xs text-zinc-400">
      <span className="h-px flex-1 bg-[#3d4150]" />
      or
      <span className="h-px flex-1 bg-[#3d4150]" />
    </div>
  )
}

function GoogleIcon() {
  // Multi-color G mark.
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 18 18"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  )
}
