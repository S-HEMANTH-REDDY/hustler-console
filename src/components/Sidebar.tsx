import { NavLink } from 'react-router-dom'
import { useUiStore } from '../store/uiStore'
import { cn } from '../lib/utils'

const links = [
  { to: '/', label: 'Today', hint: 'g t' },
  { to: '/applications', label: 'Applications', hint: 'g a' },
  { to: '/dsa', label: 'DSA', hint: 'g d' },
  { to: '/system-design', label: 'System Design', hint: 'g y' },
  { to: '/behavioral', label: 'Behavioral', hint: 'g b' },
  { to: '/tasks', label: 'Tasks', hint: 'g k' },
  { to: '/settings', label: 'Settings', hint: 'g s' },
] as const

export function Sidebar() {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen)
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen)
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen)

  return (
    <>
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-56 flex-col border-r border-[#232328] transition-transform max-md:w-[min(280px,85vw)]',
          'bg-gradient-to-b from-[#0f0f12] to-[#0a0a0b]',
          'shadow-[inset_-1px_0_0_0_rgba(255,255,255,0.02)]',
          sidebarOpen ? 'translate-x-0' : 'max-md:-translate-x-full',
          'md:translate-x-0',
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-[#232328] px-4">
          <div className="flex items-baseline gap-2">
            <span
              className="bg-gradient-to-b from-zinc-50 to-zinc-300 bg-clip-text text-lg font-semibold tracking-tight text-transparent"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Hustler
            </span>
            <span className="font-mono text-[10px] text-zinc-600">v1</span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          <div className="px-2 pb-2 pt-1 font-mono text-[10px] uppercase tracking-wider text-zinc-600">
            Workspace
          </div>
          <div className="flex flex-col gap-0.5">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'group relative flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-gradient-to-r from-lime-500/15 to-transparent text-lime-200 shadow-[inset_2px_0_0_0_rgba(132,204,22,0.7)]'
                      : 'text-zinc-300 hover:bg-[#15151a] hover:text-zinc-50',
                  )
                }
              >
                <span>{l.label}</span>
                <kbd className="rounded border border-[#232328] bg-[#0a0a0b] px-1.5 py-0.5 font-mono text-[10px] text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100">
                  {l.hint}
                </kbd>
              </NavLink>
            ))}
          </div>
        </nav>
        <div className="border-t border-[#232328] p-3">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="flex w-full items-center justify-between gap-2 rounded-md border border-[#232328] bg-[#131316] px-3 py-2 text-left text-xs text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
          >
            <span>Commands…</span>
            <kbd className="rounded border border-[#2a2a30] bg-[#0a0a0b] px-1.5 py-0.5 font-mono text-[10px] text-zinc-500">
              ⌘K
            </kbd>
          </button>
          <p className="mt-2 px-1 font-mono text-[10px] leading-relaxed text-zinc-600">
            ? for help · A to log app · g+letter to jump
          </p>
        </div>
      </aside>
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
    </>
  )
}

export function MobileHeaderToggle() {
  const setOpen = useUiStore((s) => s.setSidebarOpen)
  return (
    <button
      type="button"
      className="flex h-9 w-9 items-center justify-center rounded border border-[#232328] text-zinc-300 md:hidden"
      onClick={() => setOpen(true)}
      aria-label="Open menu"
    >
      <span className="text-lg leading-none">☰</span>
    </button>
  )
}
