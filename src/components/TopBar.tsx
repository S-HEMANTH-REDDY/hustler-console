import { format } from 'date-fns'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useIntervalTick } from '../hooks/useIntervalTick'
import { backupAgeDays } from '../lib/insights'
import { cn } from '../lib/utils'
import { useAuthStore } from '../store/authStore'
import { useUiStore } from '../store/uiStore'
import { MiniTimer } from './MiniTimer'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Today',
  '/focus': 'Focus',
  '/tasks': 'Tasks',
  '/calendar': 'Calendar',
  '/analytics': 'Analytics',
  '/applications': 'Applications',
  '/behavioral': 'Behavioral',
  '/dsa': 'DSA',
  '/system-design': 'System Design',
  '/passion': 'Passion',
  '/settings': 'Settings',
}

export function TopBar() {
  const tick = useIntervalTick(60_000)
  const location = useLocation()
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen)
  const title = PAGE_TITLES[location.pathname] ?? 'Hustler'

  const bAge = backupAgeDays()
  const backupStale = bAge !== null && bAge >= 14

  return (
    <header className="frost sticky top-0 z-20 border-b border-edge">
      <div className="flex min-h-14 items-center gap-3 px-3 sm:px-4 lg:px-6">
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold text-zinc-50">
            {title}
          </h1>
          <p className="hidden text-xs text-zinc-500 sm:block">
            {format(tick, 'EEEE, MMM d')}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <MiniTimer />
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="btn-quiet hidden items-center gap-2 px-2.5 py-1.5 text-xs md:flex"
            aria-label="Open search and commands"
          >
            <span>Search</span>
            <kbd className="rounded border border-edge bg-well px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
              ⌘K
            </kbd>
          </button>
          <ThemeToggle />
          <AuthSetupLink />
          <UserChip />
        </div>
      </div>
      {backupStale && (
        <div className="flex items-center justify-between gap-3 border-t border-edge bg-amber-500/10 px-4 py-1.5 text-xs text-amber-200">
          <span>Your last backup is {bAge} days old.</span>
          <Link
            to="/settings"
            className="rounded border border-amber-300/40 px-2 py-0.5 font-medium text-amber-100 hover:bg-amber-500/10"
          >
            Back up now
          </Link>
        </div>
      )}
    </header>
  )
}

function ThemeToggle() {
  const theme = useUiStore((s) => s.theme)
  const setTheme = useUiStore((s) => s.setTheme)
  const isLight =
    typeof document !== 'undefined' &&
    document.documentElement.dataset.theme === 'light'
  return (
    <button
      type="button"
      onClick={() => setTheme(isLight ? 'dark' : 'light')}
      className="btn-quiet flex h-9 w-9 items-center justify-center"
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      title={`Theme: ${theme}`}
    >
      {isLight ? <MoonIcon /> : <SunIcon />}
    </button>
  )
}

function AuthSetupLink() {
  const status = useAuthStore((s) => s.status)
  if (status !== 'disabled') return null
  return (
    <Link
      to="/auth"
      className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-500/15"
    >
      Sign in (setup)
    </Link>
  )
}

function UserChip() {
  const status = useAuthStore((s) => s.status)
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)
  const pushToast = useUiStore((s) => s.pushToast)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    window.addEventListener('mousedown', onDoc)
    return () => window.removeEventListener('mousedown', onDoc)
  }, [open])

  if (status !== 'authed' || !user) return null

  const email = user.email ?? 'signed in'
  const initial = (email.match(/[a-z0-9]/i)?.[0] ?? '?').toUpperCase()

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-full bg-lime-500/15 text-sm font-semibold text-lime-300 ring-1 ring-lime-500/30 transition-shadow hover:ring-lime-500/60',
        )}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${email}`}
      >
        {initial}
      </button>
      {open ? (
        <div
          role="menu"
          className="card absolute right-0 z-30 mt-2 w-60 overflow-hidden"
        >
          <div className="border-b border-edge px-3 py-2">
            <p className="text-xs text-zinc-500">Signed in as</p>
            <p className="truncate text-sm text-zinc-100">{email}</p>
          </div>
          <Link
            to="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-surface-2"
          >
            Settings
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              setOpen(false)
              await signOut()
              pushToast('info', 'Signed out')
            }}
            className="block w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-surface-2"
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  )
}

function SunIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  )
}
