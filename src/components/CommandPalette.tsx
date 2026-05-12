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
      {
        id: 'nav-today',
        group: 'Navigate',
        label: 'Today',
        shortcut: 'g t',
        run: () => navigate('/'),
      },
      {
        id: 'nav-apps',
        group: 'Navigate',
        label: 'Applications',
        shortcut: 'g a',
        run: () => navigate('/applications'),
      },
      {
        id: 'nav-dsa',
        group: 'Navigate',
        label: 'DSA',
        shortcut: 'g d',
        run: () => navigate('/dsa'),
      },
      {
        id: 'nav-sd',
        group: 'Navigate',
        label: 'System Design',
        shortcut: 'g y',
        run: () => navigate('/system-design'),
      },
      {
        id: 'nav-beh',
        group: 'Navigate',
        label: 'Behavioral',
        shortcut: 'g b',
        run: () => navigate('/behavioral'),
      },
      {
        id: 'nav-tasks',
        group: 'Navigate',
        label: 'Tasks',
        shortcut: 'g k',
        run: () => navigate('/tasks'),
      },
      {
        id: 'nav-settings',
        group: 'Navigate',
        label: 'Settings',
        shortcut: 'g s',
        run: () => navigate('/settings'),
      },
      {
        id: 'act-log-app',
        group: 'Actions',
        label: 'Log application',
        shortcut: 'A',
        run: () => navigate('/applications#quick-log'),
      },
      {
        id: 'act-log-dsa',
        group: 'Actions',
        label: 'Log DSA problem',
        shortcut: 'D',
        run: () => navigate('/dsa'),
      },
      {
        id: 'act-log-sd',
        group: 'Actions',
        label: 'Log System Design problem',
        shortcut: 'Y',
        run: () => navigate('/system-design'),
      },
      {
        id: 'act-add-task',
        group: 'Actions',
        label: 'Add task',
        shortcut: 'K',
        run: () => navigate('/tasks'),
      },
      {
        id: 'act-export',
        group: 'Actions',
        label: 'Export backup (JSON)',
        run: async () => {
          const data = await exportBackup()
          const json = JSON.stringify(data, null, 2)
          const a = document.createElement('a')
          a.href = URL.createObjectURL(
            new Blob([json], { type: 'application/json' }),
          )
          a.download = `execution-backup-${new Date().toISOString().slice(0, 10)}.json`
          a.click()
          URL.revokeObjectURL(a.href)
          recordBackupNow()
          pushToast('save', 'Backup exported')
        },
      },
      {
        id: 'help-shortcuts',
        group: 'Help',
        label: 'Keyboard shortcuts: g+t/a/d/b/k/s · ⌘K · ?',
        run: () => {},
      },
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
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor((c) => Math.min(filtered.length - 1, c + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor((c) => Math.max(0, c - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const it = filtered[safeCursor]
      if (it) run(it)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    }
  }

  const grouped: { name: string; items: { item: CmdItem; idx: number }[] }[] =
    []
  filtered.forEach((it, idx) => {
    let g = grouped.find((g) => g.name === it.group)
    if (!g) {
      g = { name: it.group, items: [] }
      grouped.push(g)
    }
    g.items.push({ item: it, idx })
  })

  return (
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-label="Command palette"
        className="w-full max-w-lg overflow-hidden rounded-lg border border-[#2a2a30] bg-[#101013] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type a command or search…"
          className="w-full border-b border-[#232328] bg-transparent px-4 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
        />
        <div className="max-h-[60vh] overflow-y-auto py-1">
          {grouped.map((group) => (
            <div key={group.name} className="py-1">
              <div className="px-4 pb-1 pt-2 font-mono text-[10px] uppercase tracking-wider text-zinc-600">
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
                      'flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm',
                      active
                        ? 'bg-[#1c1c20] text-zinc-100'
                        : 'text-zinc-400 hover:bg-[#15151a]',
                    )}
                  >
                    <span className="truncate">{item.label}</span>
                    {item.shortcut ? (
                      <kbd className="rounded border border-[#232328] bg-[#0a0a0b] px-1.5 py-0.5 font-mono text-[10px] text-zinc-500">
                        {item.shortcut}
                      </kbd>
                    ) : null}
                  </button>
                )
              })}
            </div>
          ))}
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-zinc-600">
              No results
            </div>
          ) : null}
        </div>
        <div className="flex items-center justify-between border-t border-[#232328] bg-[#0d0d10] px-3 py-2 font-mono text-[10px] text-zinc-600">
          <span>↑↓ navigate · ↵ run · Esc close</span>
          <span>⌘K · /</span>
        </div>
      </div>
    </div>
  )
}
