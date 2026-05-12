import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db, ensureDefaults } from '../db/database'
import { exportBackup, importBackup, resetAllData } from '../db/backup'
import { SCHEMA_VERSION, type SettingsRow } from '../db/types'
import { recordBackupNow } from '../lib/insights'
import { useUiStore } from '../store/uiStore'

export function SettingsPage() {
  const stored = useLiveQuery(() => ensureDefaults(), [])

  if (!stored) {
    return <div className="text-sm text-zinc-400">Loading settings…</div>
  }

  return <SettingsEditor key={stored.updatedAt} settings={stored} />
}

function SettingsEditor(props: { settings: SettingsRow }) {
  const [draft, setDraft] = useState<SettingsRow>(props.settings)
  const pushToast = useUiStore((s) => s.pushToast)

  function handleSave() {
    if (draft.dailyMin > draft.dailyMax) {
      pushToast('info', 'Minimum cannot exceed maximum')
      return
    }
    void (async () => {
      await db.settings.put({
        ...draft,
        id: 'default',
        updatedAt: Date.now(),
      })
      pushToast('save', 'Settings saved')
    })()
  }

  async function onExport() {
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
  }

  async function onImportFile(f: File) {
    const text = await f.text()
    const parsed = JSON.parse(text) as unknown
    const ok = window.confirm(
      'Import will overwrite current data. Continue?',
    )
    if (!ok) return
    await importBackup(parsed, 'replace')
    pushToast('import', 'Backup imported')
  }

  async function onReset() {
    const ok = window.confirm('Delete ALL local data? This cannot be undone.')
    if (!ok) return
    await resetAllData()
    pushToast('reset', 'Storage cleared')
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <h1
          className="text-xl font-semibold text-zinc-100"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Settings
        </h1>
        <p className="text-sm text-zinc-400">Pace inputs · backup · reset</p>
      </div>

      <section className="space-y-4 rounded border border-[#3d4150] bg-[#262934] p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs text-zinc-400">Daily minimum</span>
            <input
              type="number"
              min={1}
              className="field font-mono"
              value={draft.dailyMin}
              onChange={(e) =>
                setDraft({ ...draft, dailyMin: Number(e.target.value) || 1 })
              }
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-zinc-400">Daily maximum</span>
            <input
              type="number"
              min={1}
              className="field font-mono"
              value={draft.dailyMax}
              onChange={(e) =>
                setDraft({ ...draft, dailyMax: Number(e.target.value) || 1 })
              }
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-zinc-400">Window start</span>
            <input
              type="time"
              className="field font-mono"
              value={draft.windowStart}
              onChange={(e) =>
                setDraft({ ...draft, windowStart: e.target.value })
              }
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-zinc-400">Window end</span>
            <input
              type="time"
              className="field font-mono"
              value={draft.windowEnd}
              onChange={(e) =>
                setDraft({ ...draft, windowEnd: e.target.value })
              }
            />
          </label>
        </div>
        <button
          type="button"
          onClick={handleSave}
          className="w-full rounded bg-lime-500 py-2 text-sm font-semibold text-zinc-950"
        >
          Save settings
        </button>
      </section>

      <section className="space-y-3 rounded border border-[#3d4150] bg-[#262934]/80 p-4">
        <h2 className="text-sm font-semibold text-zinc-200">Data</h2>
        <p className="text-xs text-zinc-400">
          All entities persist in IndexedDB automatically. JSON export uses
          schema version {SCHEMA_VERSION}.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className="rounded border border-[#3d4150] px-3 py-2 text-sm text-zinc-200"
            onClick={() => void onExport()}
          >
            Export JSON
          </button>
          <label className="cursor-pointer rounded border border-[#3d4150] px-3 py-2 text-center text-sm text-zinc-200 hover:bg-[#323540]">
            Import JSON
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (f) void onImportFile(f)
              }}
            />
          </label>
        </div>
        <button
          type="button"
          className="rounded border border-red-900/60 px-3 py-2 text-sm text-red-300"
          onClick={() => void onReset()}
        >
          Reset all data…
        </button>
      </section>
    </div>
  )
}
