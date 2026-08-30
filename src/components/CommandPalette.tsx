import type { KeyboardEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { exportBackup } from '../db/backup'
import { recordBackupNow } from '../lib/insights'
import { cn } from '../lib/utils'
import { useUiStore } from '../store/uiStore'

interface CmdItem {
  id: string
  label: string
  group: 'Navigate' | 'Actions' | 'Help'
  shortcut?: string
  run: () => void | Promise<void>
}

export function CommandPalette() {
  const open = useUiStore((s) => s.paletteOpen)
  if (!open) return null
  return <PaletteBody />
}

function PaletteBody() {
  const setOpen = useUiStore((s) => s.setPaletteOpen)
  const pushToast = useUiStore((s) => s.pushToast)
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [cursor, setCursorRaw] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [])

  const items: CmdItem[] = useMemo(
    () => [
      { id: 'nav-dashboard', group: 'Navigate', label: 'Today', shortcut: 'g t', run: () => navigate('/') },
      { id: 'nav-focus', group: 'Navigate', label: 'Focus', shortcut: 'g f', run: () => navigate('/focus') },
      { id: 'nav-tasks', group: 'Navigate', label: 'Tasks', shortcut: 'g k', run: () => navigate('/tasks') },
      { id: 'nav-calendar', group: 'Navigate', label: 'Calendar', shortcut: 'g c', run: () => navigate('/calendar') },
      { id: 'nav-analytics', group: 'Navigate', label: 'Analytics', shortcut: 'g n', run: () => navigate('/analytics') },
      { id: 'nav-apps', group: 'Navigate', label: 'Applications', shortcut: 'g a', run: () => navigate('/applications') },
      { id: 'nav-beh', group: 'Navigate', label: 'Behavioral', shortcut: 'g b', run: () => navigate('/behavioral') },
      { id: 'nav-dsa', group: 'Navigate', label: 'DSA', shortcut: 'g d', run: () => navigate('/dsa') },
      { id: 'nav-sd', group: 'Navigate', label: 'System Design', shortcut: 'g y', run: () => navigate('/system-design') },
      { id: 'nav-passion', group: 'Navigate', label: 'Passion projects', shortcut: 'g m', run: () => navigate('/passion') },
      { id: 'nav-settings', group: 'Navigate', label: 'Settings', shortcut: 'g s', run: () => navigate('/settings') },
      { id: 'act-log-app', group: 'Actions', label: 'Log application', shortcut: 'A', run: () => navigate('/applications#quick-log') },
      { id: 'act-log-dsa', group: 'Actions', label: 'Log DSA problem', shortcut: 'D', run: () => navigate('/dsa') },
      { id: 'act-log-sd', group: 'Actions', label: 'Log System Design problem', shortcut: 'Y', run: () => navigate('/system-design') },
      { id: 'act-add-task', group: 'Actions', label: 'Add task', shortcut: 'K', run: () => navigate('/tasks') },
      {
        id: 'act-export',
        group: 'Actions',
        label: 'Export backup (JSON)',
        run: async () => {
          const data = await exportBackup()
          const json = JSON.stringify(data, null, 2)
          const a = document.createElement('a')
          a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
          a.download = `execution-backup-${new Date().toISOString().slice(0, 10)}.json`
          a.click()
          URL.revokeObjectURL(a.href)
          recordBackupNow()
          pushToast('save', 'Backup exported')
        },
      },
      { id: 'act-start-focus', group: 'Actions', label: 'Start focus session', run: () => navigate('/focus') },
      { id: 'help-shortcuts', group: 'Help', label: 'Keyboard shortcuts: g+h/f/k/c/n/a/b/d/y/m/s · ⌘K · ?', run: () => {} },
    ],
    [navigate, pushToast],
  )

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    if (!qq) return items
    return items.filter(
      (it) =>
        it.label.toLowerCase().includes(qq) ||
        (it.shortcut ?? '').toLowerCase().includes(qq) ||
        it.group.toLowerCase().includes(qq),
    )
  }, [items, q])

  const safeCursor = Math.min(cursor, Math.max(0, filtered.length - 1))

  function setCursor(updater: number | ((c: number) => number)) {
    setCursorRaw((c) => {
      const next = typeof updater === 'function' ? updater(c) : updater
      return Math.min(Math.max(0, filtered.length - 1), Math.max(0, next))
    })
  }

  function run(it: CmdItem) {
    setOpen(false)
    void it.run()
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(filtered.length - 1, c + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); const it = filtered[safeCursor]; if (it) run(it) }
    else if (e.key === 'Escape') { e.preventDefault(); setOpen(false) }
  }

  const grouped: { name: string; items: { item: CmdItem; idx: number }[] }[] = []
  filtered.forEach((it, idx) => {
    let g = grouped.find((g) => g.name === it.group)
    if (!g) { g = { name: it.group, items: [] }; grouped.push(g) }
    g.items.push({ item: it, idx })
  })

  return (
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur-md"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-label="Command palette"
        className="card-glow animate-scale-in w-full max-w-lg overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex items-center gap-3 border-b border-edge px-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className="shrink-0 text-zinc-500" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a command or search…"
            className="w-full bg-transparent py-3.5 text-base text-zinc-100 outline-none placeholder:text-zinc-500"
          />
        </div>
        <div className="max-h-[60vh] overflow-y-auto py-1.5">
          {grouped.map((group) => (
            <div key={group.name} className="py-0.5">
              <div className="px-4 pb-1.5 pt-2.5 text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-zinc-600">
                {group.name}
              </div>
              {group.items.map(({ item, idx }) => {
                const active = idx === safeCursor
                return (
                  <button
                    type="button"
                    key={item.id}
                    onMouseEnter={() => setCursor(idx)}
                    onClick={() => run(item)}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 rounded-xl mx-1.5 px-3 py-2.5 text-left text-base transition-all',
                      active
                        ? 'bg-zinc-50/[0.06] text-zinc-100'
                        : 'text-zinc-400 hover:bg-zinc-50/[0.03]',
                    )}
                    style={{ width: 'calc(100% - 12px)' }}
                  >
                    <span className="truncate">{item.label}</span>
                    {item.shortcut ? (
                      <kbd className="rounded-md border border-edge bg-well px-1.5 py-0.5 font-mono text-[0.6875rem] text-zinc-500">
                        {item.shortcut}
                      </kbd>
                    ) : null}
                  </button>
                )
              })}
            </div>
          ))}
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-zinc-500">No results</div>
          ) : null}
        </div>
        <div className="flex items-center justify-between border-t border-edge px-4 py-2 font-mono text-[0.6875rem] text-zinc-600">
          <span>↑↓ navigate · ↵ run · Esc close</span>
          <span>⌘K · /</span>
        </div>
      </div>
    </div>
  )
}
