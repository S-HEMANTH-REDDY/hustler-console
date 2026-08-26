import { useEffect, useState } from 'react'
import { useCloudDataMode } from '../cloud/active'
import {
  countLocalImportable,
  importBrowserDataToCloud,
} from '../components/CloudImportPrompt'
import { useSettingsRowHybrid } from '../cloud/hybridData'
import { persistSettings, resetAllDataEverywhere } from '../cloud/mutations'
import { exportBackup, importBackup } from '../db/backup'
import type { SettingsRow } from '../db/types'
import { recordBackupNow } from '../lib/insights'
import type { ThemePref } from '../lib/theme'
import { cn } from '../lib/utils'
import { useAuthStore } from '../store/authStore'
import {
  TIMER_PRESETS,
  matchPreset,
  useTimerStore,
} from '../store/timerStore'
import { useUiStore } from '../store/uiStore'

export function SettingsPage() {
  const stored = useSettingsRowHybrid()

  return (
    <div className="mx-auto max-w-xl space-y-3">
      <AppearanceSection />
      <TimerSection />
      {stored ? (
        <GoalsSection key={stored.updatedAt} settings={stored} />
      ) : (
        <section className="card p-4 text-xs text-zinc-500">Loading goals…</section>
      )}
      <AccountSection />
      <DataSection />
    </div>
  )
}

function AppearanceSection() {
  const theme = useUiStore((s) => s.theme)
  const setTheme = useUiStore((s) => s.setTheme)
  const options: { id: ThemePref; label: string }[] = [
    { id: 'light', label: 'Light' },
    { id: 'dark', label: 'Dark' },
    { id: 'system', label: 'System' },
  ]
  return (
    <section className="card p-4">
      <h2 className="text-sm font-semibold text-zinc-200">Appearance</h2>
      <div role="radiogroup" aria-label="Theme" className="mt-2.5 grid grid-cols-3 gap-1.5">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={theme === o.id}
            onClick={() => setTheme(o.id)}
            className={cn(
              'min-h-9 rounded-lg border text-xs font-medium transition-colors',
              theme === o.id
                ? 'border-lime-400/40 bg-lime-500/10 text-lime-400'
                : 'border-edge bg-surface text-zinc-400 hover:border-edge-strong',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </section>
  )
}

function TimerSection() {
  const p = useTimerStore((s) => s.pomodoro)
  const pomoApplyPreset = useTimerStore((s) => s.pomoApplyPreset)
  const active = matchPreset(p)
  return (
    <section className="card p-4">
      <h2 className="text-sm font-semibold text-zinc-200">Focus timer</h2>
      <p className="mt-1 text-[0.6875rem] text-zinc-500">
        {p.focusMin}m focus · {p.shortBreakMin}m break · {p.longBreakMin}m long break after {p.longEvery} sessions.
      </p>
      <div className="mt-2.5 grid grid-cols-3 gap-1.5">
        {TIMER_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => pomoApplyPreset(preset.id)}
            aria-pressed={active === preset.id}
            className={cn(
              'rounded-lg border px-2 py-1.5 text-center transition-colors',
              active === preset.id
                ? 'border-lime-400/40 bg-lime-500/10'
                : 'border-edge bg-surface hover:border-edge-strong',
            )}
          >
            <span className={cn('block text-xs font-medium', active === preset.id ? 'text-lime-400' : 'text-zinc-300')}>
              {preset.label}
            </span>
            <span className="block font-mono text-[0.625rem] text-zinc-500">{preset.hint}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

function GoalsSection(props: { settings: SettingsRow }) {
  const [draft, setDraft] = useState<SettingsRow>(props.settings)
  const pushToast = useUiStore((s) => s.pushToast)

  function handleSave() {
    if (draft.dailyMin > draft.dailyMax) {
      pushToast('info', 'Minimum cannot exceed maximum')
      return
    }
    void (async () => {
      await persistSettings({ ...draft, id: 'default', updatedAt: Date.now() })
      pushToast('save', 'Settings saved')
    })()
  }

  return (
    <section className="card p-4">
      <h2 className="text-sm font-semibold text-zinc-200">Application goal</h2>
      <p className="mt-1 text-[0.6875rem] text-zinc-500">Daily target for job applications.</p>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <label className="space-y-1">
          <span className="text-[0.6875rem] text-zinc-500">Daily minimum</span>
          <input type="number" min={1} className="field font-mono" value={draft.dailyMin} onChange={(e) => setDraft({ ...draft, dailyMin: Number(e.target.value) || 1 })} />
        </label>
        <label className="space-y-1">
          <span className="text-[0.6875rem] text-zinc-500">Daily maximum</span>
          <input type="number" min={1} className="field font-mono" value={draft.dailyMax} onChange={(e) => setDraft({ ...draft, dailyMax: Number(e.target.value) || 1 })} />
        </label>
        <label className="space-y-1">
          <span className="text-[0.6875rem] text-zinc-500">Day starts</span>
          <input type="time" className="field font-mono" value={draft.windowStart} onChange={(e) => setDraft({ ...draft, windowStart: e.target.value })} />
        </label>
        <label className="space-y-1">
          <span className="text-[0.6875rem] text-zinc-500">Day ends</span>
          <input type="time" className="field font-mono" value={draft.windowEnd} onChange={(e) => setDraft({ ...draft, windowEnd: e.target.value })} />
        </label>
      </div>
      <button type="button" onClick={handleSave} className="btn-primary mt-3 w-full rounded-lg py-2 text-sm">Save</button>
    </section>
  )
}

function AccountSection() {
  const status = useAuthStore((s) => s.status)
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)
  const cloud = useCloudDataMode()
  const pushToast = useUiStore((s) => s.pushToast)
  const [localApps, setLocalApps] = useState(0)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!cloud) { setLocalApps(0); return }
    void countLocalImportable().then((c) => setLocalApps(c.apps))
  }, [cloud])

  if (status !== 'authed' || !user) return null

  return (
    <section className="card p-4">
      <h2 className="text-sm font-semibold text-zinc-200">Account</h2>
      <div className="mt-2.5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm text-zinc-300">{user.email}</p>
          <p className="text-[0.6875rem] text-zinc-500">Data syncs to your account.</p>
        </div>
        <button
          type="button"
          className="btn-quiet shrink-0 px-3 py-1.5 text-xs"
          onClick={async () => { await signOut(); pushToast('info', 'Signed out') }}
        >
          Sign out
        </button>
      </div>
      {localApps > 0 ? (
        <div className="mt-3 rounded-lg border border-amber-400/30 bg-amber-500/5 p-3">
          <p className="text-xs text-amber-200">
            This browser has {localApps} application{localApps === 1 ? '' : 's'} not in your cloud account.
          </p>
          <button
            type="button"
            disabled={busy}
            className="btn-primary mt-2 rounded-lg px-3 py-1.5 text-xs"
            onClick={async () => {
              setBusy(true)
              try {
                await importBrowserDataToCloud()
                pushToast('import', 'Browser data imported')
                window.location.reload()
              } catch (e) {
                pushToast('info', e instanceof Error ? e.message : 'Import failed')
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy ? 'Importing…' : 'Import browser data to account'}
          </button>
        </div>
      ) : null}
    </section>
  )
}

function DataSection() {
  const pushToast = useUiStore((s) => s.pushToast)

  async function onExport() {
    const data = await exportBackup()
    const json = JSON.stringify(data, null, 2)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    a.download = `hustler-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    recordBackupNow()
    pushToast('save', 'Backup exported')
  }

  async function onImportFile(f: File) {
    const text = await f.text()
    const parsed = JSON.parse(text) as unknown
    const ok = window.confirm('Import will overwrite current data. Continue?')
    if (!ok) return
    await importBackup(parsed, 'replace')
    pushToast('import', 'Backup imported')
  }

  async function onReset() {
    const ok = window.confirm('Delete ALL data? This cannot be undone.')
    if (!ok) return
    await resetAllDataEverywhere()
    pushToast('reset', 'Storage cleared')
  }

  return (
    <section className="card p-4">
      <h2 className="text-sm font-semibold text-zinc-200">Data</h2>
      <p className="mt-1 text-[0.6875rem] text-zinc-500">Export a JSON backup or restore one.</p>
      <div className="mt-2.5 flex flex-col gap-1.5 sm:flex-row">
        <button type="button" className="btn-quiet px-3 py-1.5 text-xs" onClick={() => void onExport()}>Export backup</button>
        <label className="btn-quiet cursor-pointer px-3 py-1.5 text-center text-xs">
          Import backup
          <input type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void onImportFile(f) }} />
        </label>
        <button
          type="button"
          className="ml-auto rounded-lg border border-red-400/30 px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-500/10"
          onClick={() => void onReset()}
        >
          Reset all data…
        </button>
      </div>
    </section>
  )
}
