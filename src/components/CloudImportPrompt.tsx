import { useEffect, useState } from 'react'
import { useCloudDataMode } from '../cloud/active'
import { importLocalDexieIntoSupabase } from '../cloud/importLocalDexie'
import { countApplicationsForUser } from '../cloud/repository'
import { bumpCloudSync } from '../cloud/syncBus'
import { useAuthStore } from '../store/authStore'
import { useUiStore } from '../store/uiStore'
import { db } from '../db/database'

function sessionSkipKey(userId: string): string {
  return `hustler.importPromptSessionSkip.${userId}`
}

export async function countLocalImportable(): Promise<{
  apps: number
  ideas: number
  dsa: number
  total: number
}> {
  const [apps, ideas, dsa] = await Promise.all([
    db.applications.count(),
    db.passionIdeas.count(),
    db.dsaProblems.count(),
  ])
  return { apps, ideas, dsa, total: apps + ideas + dsa }
}

/** Shared import used by the modal, banner, and Settings. */
export async function importBrowserDataToCloud(): Promise<void> {
  await importLocalDexieIntoSupabase()
  bumpCloudSync()
}

/**
 * Modal when the signed-in account has no applications yet but this browser
 * still has IndexedDB data. Skip is session-only so the banner can still offer
 * import later (permanent dismiss was hiding the only path back to old data).
 */
export function CloudImportPrompt() {
  const cloud = useCloudDataMode()
  const user = useAuthStore((s) => s.user)
  const pushToast = useUiStore((s) => s.pushToast)
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [localApps, setLocalApps] = useState(0)
  const userId = user?.id

  useEffect(() => {
    if (!cloud || !userId) return

    if (sessionStorage.getItem(sessionSkipKey(userId)) === '1') {
      setVisible(false)
      return
    }

    let cancelled = false
    async function run() {
      try {
        const remoteCount = await countApplicationsForUser()
        if (cancelled || remoteCount > 0) {
          if (!cancelled) setVisible(false)
          return
        }
        const local = await countLocalImportable()
        if (!cancelled && local.total > 0) {
          setLocalApps(local.apps)
          setVisible(true)
        }
      } catch {
        /* ignore */
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [cloud, userId])

  if (!visible || !user?.id) return null
  const accountId = user.id

  async function onImport() {
    setBusy(true)
    try {
      await importBrowserDataToCloud()
      pushToast('import', 'Browser data copied to your account')
      setVisible(false)
      window.location.reload()
    } catch (e) {
      pushToast(
        'info',
        e instanceof Error ? e.message : 'Import failed — try again',
      )
    } finally {
      setBusy(false)
    }
  }

  function onSkip() {
    try {
      sessionStorage.setItem(sessionSkipKey(accountId), '1')
    } catch {
      /* ignore */
    }
    setVisible(false)
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="card max-w-md p-5 shadow-xl sm:p-6">
        <h2 className="text-lg font-semibold text-zinc-100">
          Your applications are still on this device
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          You're signed in, so Hustler shows your <em>cloud</em> account — which
          is empty. This browser still has{' '}
          <span className="font-semibold text-zinc-200">
            {localApps > 0 ? `${localApps} application${localApps === 1 ? '' : 's'}` : 'local data'}
          </span>
          . Import it into your account to see it again.
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="btn-quiet px-3 py-2 text-sm"
            disabled={busy}
            onClick={() => onSkip()}
          >
            Not now
          </button>
          <button
            type="button"
            disabled={busy}
            className="btn-primary rounded-xl px-4 py-2 text-sm"
            onClick={() => void onImport()}
          >
            {busy ? 'Importing…' : 'Import applications'}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Persistent banner when cloud is empty but local IndexedDB still has apps. */
export function LocalDataImportBanner() {
  const cloud = useCloudDataMode()
  const user = useAuthStore((s) => s.user)
  const pushToast = useUiStore((s) => s.pushToast)
  const [localApps, setLocalApps] = useState(0)
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!cloud || !user?.id) {
      setShow(false)
      return
    }
    let cancelled = false
    async function run() {
      try {
        const remoteCount = await countApplicationsForUser()
        if (cancelled) return
        if (remoteCount > 0) {
          setShow(false)
          return
        }
        const local = await countLocalImportable()
        if (!cancelled && local.apps > 0) {
          setLocalApps(local.apps)
          setShow(true)
        } else if (!cancelled) {
          setShow(false)
        }
      } catch {
        /* ignore */
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [cloud, user?.id])

  if (!show) return null

  async function onImport() {
    setBusy(true)
    try {
      await importBrowserDataToCloud()
      pushToast('import', 'Applications imported')
      setShow(false)
      window.location.reload()
    } catch (e) {
      pushToast(
        'info',
        e instanceof Error ? e.message : 'Import failed — try again',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-amber-100">
        <span className="font-semibold">{localApps} application{localApps === 1 ? '' : 's'}</span>{' '}
        from this browser aren’t in your cloud account yet.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => void onImport()}
        className="btn-primary shrink-0 rounded-xl px-4 py-2 text-sm"
      >
        {busy ? 'Importing…' : 'Import now'}
      </button>
    </div>
  )
}
