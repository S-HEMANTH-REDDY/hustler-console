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
    <div className="mx-auto max-w-xl space-y-5 animate-fade-in">
      <AppearanceSection />
      <TimerSection />
      {stored ? (
        <GoalsSection key={stored.updatedAt} settings={stored} />
      ) : (
        <section className="card p-5 text-sm text-zinc-500">Loading goals…</section>
      )}
      <AccountSection />
      <DataSection />
    </div>
  )
}

/** Miniature window preview so each mode is recognisable before selecting. */
function ThemeSwatch({ mode }: { mode: 'light' | 'dim' | 'dark' }) {
  const palette = {
    light: { bg: '#eef0f5', card: '#ffffff', edge: '#dae0ea', ink: '#3a4353' },
    dim: { bg: '#1b1e26', card: '#262b36', edge: '#3b4351', ink: '#95a2b7' },
    dark: { bg: '#05060a', card: '#0f1118', edge: '#202634', ink: '#5c6675' },
  }[mode]
  return (
    <span
      aria-hidden="true"
      className="block h-12 w-full overflow-hidden rounded-lg border"
      style={{ background: palette.bg, borderColor: palette.edge }}
    >
      <span className="flex h-full gap-1 p-1.5">
        <span
          className="h-full w-1/4 rounded-sm"
          style={{ background: palette.card, border: `1px solid ${palette.edge}` }}
        />
        <span className="flex flex-1 flex-col gap-1">
          <span
            className="h-1.5 w-2/3 rounded-full"
            style={{ background: '#84cc16' }}
          />
          <span
            className="h-1.5 w-full rounded-full"
            style={{ background: palette.ink, opacity: 0.55 }}
          />
          <span
            className="h-1.5 w-4/5 rounded-full"
            style={{ background: palette.ink, opacity: 0.3 }}
          />
        </span>
      </span>
    </span>
  )
}

function AppearanceSection() {
  const theme = useUiStore((s) => s.theme)
  const setTheme = useUiStore((s) => s.setTheme)
  const options: {
    id: ThemePref
    label: string
    hint: string
    swatch?: 'light' | 'dim' | 'dark'
  }[] = [
    { id: 'light', label: 'Light', hint: 'Daylight', swatch: 'light' },
    { id: 'dim', label: 'Dim', hint: 'Twilight', swatch: 'dim' },
    { id: 'dark', label: 'Dark', hint: 'Void', swatch: 'dark' },
    { id: 'system', label: 'System', hint: 'Follows OS' },
  ]
  return (
    <section className="card p-5">
      <p className="section-label">Interface</p>
      <h2 className="mt-1 text-base font-semibold text-zinc-100">Appearance</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Three surfaces, from bright to void.
      </p>
      <div
        role="radiogroup"
        aria-label="Theme"
        className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4"
      >
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={theme === o.id}
            onClick={() => setTheme(o.id)}
            className={cn(
              'group rounded-xl border p-2 text-left transition-all',
              theme === o.id
                ? 'border-lime-400/50 bg-lime-500/10 shadow-[0_0_20px_-6px_rgba(132,204,22,0.35)]'
                : 'border-edge bg-surface hover:border-edge-strong hover:bg-surface-2',
            )}
          >
            {o.swatch ? (
              <ThemeSwatch mode={o.swatch} />
            ) : (
              <span
                aria-hidden="true"
                className="flex h-12 w-full items-center justify-center rounded-lg border border-edge"
                style={{
                  background:
                    'linear-gradient(105deg, #05060a 0 50%, #eef0f5 50% 100%)',
                }}
              >
                <span className="h-1.5 w-2/3 rounded-full bg-lime-500/80" />
              </span>
            )}
            <span className="mt-2 block px-0.5">
              <span
                className={cn(
                  'block text-sm font-medium',
                  theme === o.id ? 'text-lime-400' : 'text-zinc-200',
                )}
              >
                {o.label}
              </span>
              <span className="block text-[0.6875rem] text-zinc-500">
                {o.hint}
              </span>
            </span>
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
    <section className="card p-5">
      <h2 className="text-base font-semibold text-zinc-100">Focus timer</h2>
      <p className="mt-1.5 text-sm text-zinc-500">
        {p.focusMin}m focus · {p.shortBreakMin}m break · {p.longBreakMin}m long break after {p.longEvery} sessions.
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {TIMER_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => pomoApplyPreset(preset.id)}
            aria-pressed={active === preset.id}
            className={cn(
              'rounded-xl border px-3 py-2.5 text-center transition-all',
              active === preset.id
                ? 'border-lime-400/40 bg-lime-500/10 shadow-[0_0_16px_-4px_rgba(132,204,22,0.2)]'
                : 'border-edge bg-surface hover:border-edge-strong hover:bg-surface-2',
            )}
          >
            <span className={cn('block text-sm font-medium', active === preset.id ? 'text-lime-400' : 'text-zinc-300')}>
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
    <section className="card p-5">
      <h2 className="text-base font-semibold text-zinc-100">Application goal</h2>
      <p className="mt-1.5 text-sm text-zinc-500">Daily target for job applications.</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="space-y-1.5">
          <span className="text-xs text-zinc-500">Daily minimum</span>
          <input type="number" min={1} className="field font-mono" value={draft.dailyMin} onChange={(e) => setDraft({ ...draft, dailyMin: Number(e.target.value) || 1 })} />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs text-zinc-500">Daily maximum</span>
          <input type="number" min={1} className="field font-mono" value={draft.dailyMax} onChange={(e) => setDraft({ ...draft, dailyMax: Number(e.target.value) || 1 })} />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs text-zinc-500">Day starts</span>
          <input type="time" className="field font-mono" value={draft.windowStart} onChange={(e) => setDraft({ ...draft, windowStart: e.target.value })} />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs text-zinc-500">Day ends</span>
          <input type="time" className="field font-mono" value={draft.windowEnd} onChange={(e) => setDraft({ ...draft, windowEnd: e.target.value })} />
        </label>
      </div>
      <button type="button" onClick={handleSave} className="btn-primary mt-4 w-full rounded-xl py-2.5 text-sm">Save</button>
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
    <section className="card p-5">
      <h2 className="text-base font-semibold text-zinc-100">Account</h2>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm text-zinc-300">{user.email}</p>
          <p className="text-xs text-zinc-500">Data syncs to your account.</p>
        </div>
        <button
          type="button"
          className="btn-quiet shrink-0 rounded-xl px-4 py-2 text-sm"
          onClick={async () => { await signOut(); pushToast('info', 'Signed out') }}
        >
          Sign out
        </button>
      </div>
      {localApps > 0 ? (
        <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-500/5 p-4">
          <p className="text-sm text-amber-200">
            This browser has {localApps} application{localApps === 1 ? '' : 's'} not in your cloud account.
          </p>
          <button
            type="button"
            disabled={busy}
            className="btn-primary mt-3 rounded-xl px-4 py-2 text-sm"
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
    <section className="card p-5">
      <h2 className="text-base font-semibold text-zinc-100">Data</h2>
      <p className="mt-1.5 text-sm text-zinc-500">Export a JSON backup or restore one.</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button type="button" className="btn-quiet rounded-xl px-4 py-2 text-sm" onClick={() => void onExport()}>Export backup</button>
        <label className="btn-quiet cursor-pointer rounded-xl px-4 py-2 text-center text-sm">
          Import backup
          <input type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void onImportFile(f) }} />
        </label>
        <button
          type="button"
          className="ml-auto rounded-xl border border-red-400/30 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
          onClick={() => void onReset()}
        >
          Reset all data…
        </button>
      </div>
    </section>
  )
}
