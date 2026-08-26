import { NavLink } from 'react-router-dom'
import { useUiStore } from '../store/uiStore'
import { cn } from '../lib/utils'

const mainLinks = [
  { to: '/', label: 'Today', hint: 'g t', icon: HomeIcon },
  { to: '/focus', label: 'Focus', hint: 'g f', icon: TimerIcon },
  { to: '/tasks', label: 'Tasks', hint: 'g k', icon: CheckIcon },
  { to: '/calendar', label: 'Calendar', hint: 'g c', icon: CalendarIcon },
  { to: '/analytics', label: 'Analytics', hint: 'g n', icon: ChartIcon },
] as const

const careerLinks = [
  { to: '/applications', label: 'Applications', hint: 'g a' },
  { to: '/behavioral', label: 'Behavioral', hint: 'g b' },
  { to: '/dsa', label: 'DSA', hint: 'g d' },
  { to: '/system-design', label: 'System Design', hint: 'g y' },
  { to: '/passion', label: 'Passion', hint: 'g m' },
] as const

export function Sidebar() {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen)
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen)
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen)

  return (
    <>
      <aside
        aria-label="Main navigation"
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-edge bg-base/90 backdrop-blur-xl transition-transform max-lg:w-[min(280px,85vw)]',
          sidebarOpen ? 'translate-x-0' : 'max-lg:-translate-x-full',
          'lg:translate-x-0',
        )}
      >
        {/* Brand */}
        <div className="flex h-14 items-center gap-2.5 px-5">
          <span
            aria-hidden
            className="flex h-8 w-8 items-center justify-center rounded-xl text-sm font-bold text-lime-400"
            style={{
              fontFamily: 'var(--font-display)',
              background: 'linear-gradient(135deg, rgba(132,204,22,0.15) 0%, rgba(132,204,22,0.05) 100%)',
              boxShadow: '0 0 20px rgba(132,204,22,0.15), inset 0 0 0 1px rgba(132,204,22,0.2)',
            }}
          >
            H
          </span>
          <span
            className="text-[1.0625rem] font-semibold tracking-tight text-zinc-50"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Hustler
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          <div className="flex flex-col gap-1">
            {mainLinks.map((l) => (
              <SideLink
                key={l.to}
                to={l.to}
                label={l.label}
                hint={l.hint}
                icon={<l.icon />}
                onNavigate={() => setSidebarOpen(false)}
              />
            ))}
          </div>

          <div className="mx-3 my-4">
            <div className="hairline" />
          </div>
          <div className="mb-2 px-3 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-zinc-600">
            Career
          </div>
          <div className="flex flex-col gap-1">
            {careerLinks.map((l) => (
              <SideLink
                key={l.to}
                to={l.to}
                label={l.label}
                hint={l.hint}
                onNavigate={() => setSidebarOpen(false)}
              />
            ))}
          </div>
        </nav>

        {/* Bottom */}
        <div className="border-t border-edge px-3 py-3">
          <SideLink
            to="/settings"
            label="Settings"
            hint="g s"
            icon={<GearIcon />}
            onNavigate={() => setSidebarOpen(false)}
          />
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="mt-1 flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-zinc-500 transition-all hover:bg-surface-2 hover:text-zinc-300"
          >
            <span className="flex items-center gap-2.5">
              <SearchIcon />
              Search
            </span>
            <kbd className="rounded-lg border border-edge bg-well px-1.5 py-0.5 font-mono text-[0.625rem] text-zinc-600">
              ⌘K
            </kbd>
          </button>
        </div>
      </aside>
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
    </>
  )
}

function SideLink(props: {
  to: string
  label: string
  hint?: string
  icon?: React.ReactNode
  onNavigate: () => void
}) {
  return (
    <NavLink
      to={props.to}
      end={props.to === '/'}
      onClick={props.onNavigate}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
          isActive
            ? 'bg-gradient-to-r from-lime-500/[0.08] to-transparent text-zinc-50'
            : 'text-zinc-400 hover:bg-surface-2 hover:text-zinc-200',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span
              className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full"
              style={{
                background: 'linear-gradient(180deg, #a3e635, #84cc16)',
                boxShadow: '0 0 8px rgba(132,204,22,0.4)',
              }}
            />
          )}
          {props.icon ? (
            <span className={cn('shrink-0', isActive ? 'text-lime-400' : 'text-zinc-500 group-hover:text-zinc-400')} aria-hidden>
              {props.icon}
            </span>
          ) : (
            <span className="w-[18px] shrink-0" aria-hidden />
          )}
          <span className="flex-1">{props.label}</span>
          {props.hint ? (
            <kbd className="rounded-md border border-edge bg-well px-1.5 py-0.5 font-mono text-[0.5625rem] text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100">
              {props.hint}
            </kbd>
          ) : null}
        </>
      )}
    </NavLink>
  )
}

export function BottomNav() {
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen)
  const items = [
    { to: '/', label: 'Today', icon: HomeIcon },
    { to: '/focus', label: 'Focus', icon: TimerIcon },
    { to: '/tasks', label: 'Tasks', icon: CheckIcon },
    { to: '/calendar', label: 'Cal', icon: CalendarIcon },
  ] as const
  return (
    <nav
      aria-label="Primary"
      className="frost fixed inset-x-0 bottom-0 z-30 border-t border-edge lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-5">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.625rem] font-medium transition-colors',
                isActive ? 'text-lime-400' : 'text-zinc-500',
              )
            }
          >
            <it.icon />
            {it.label}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.625rem] font-medium text-zinc-500"
        >
          <MenuIcon />
          More
        </button>
      </div>
    </nav>
  )
}

function iconProps(): React.SVGProps<SVGSVGElement> {
  return {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  }
}

function HomeIcon() {
  return (
    <svg {...iconProps()}>
      <path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
      <path d="M9 22V12h6v10" />
    </svg>
  )
}
function TimerIcon() {
  return (
    <svg {...iconProps()}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2.5" />
      <path d="M9 2h6" />
    </svg>
  )
}
function CheckIcon() {
  return (
    <svg {...iconProps()}>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="m8.5 12 2.5 2.5 5-5" />
    </svg>
  )
}
function CalendarIcon() {
  return (
    <svg {...iconProps()}>
      <rect x="3" y="4" width="18" height="18" rx="3" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}
function ChartIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M3 3v18h18" />
      <path d="M7 15v-4M12 17V8M17 13V5" />
    </svg>
  )
}
function GearIcon() {
  return (
    <svg {...iconProps()}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.01a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.01a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z" />
    </svg>
  )
}
function SearchIcon() {
  return (
    <svg {...iconProps()} width={15} height={15}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}
function MenuIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}
