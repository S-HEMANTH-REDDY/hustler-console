import { useEffect, useState } from 'react'
import { useCloudDataMode } from '../cloud/active'
import { importLocalDexieIntoSupabase } from '../cloud/importLocalDexie'
import { countApplicationsForUser } from '../cloud/repository'
import { useAuthStore } from '../store/authStore'
import { useUiStore } from '../store/uiStore'
import { db } from '../db/database'

function localStorageImportKey(userId: string): string {
  return `hustler.cloudImportDismissed.${userId}`
}

async function localHasImportableRows(): Promise<boolean> {
  const apps = await db.applications.count()
  const ideas = await db.passionIdeas.count()
  const dsa = await db.dsaProblems.count()
  return apps + ideas + dsa > 0
}

export function CloudImportPrompt() {
  const cloud = useCloudDataMode()
  const user = useAuthStore((s) => s.user)
  const pushToast = useUiStore((s) => s.pushToast)
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const userId = user?.id

  useEffect(() => {
    if (!cloud || !userId) return

    const dismissed = (() => {
      try {
        return localStorage.getItem(localStorageImportKey(userId)) === '1'
      } catch {
        return false
      }
    })()

    if (dismissed || sessionStorage.getItem('hustler.importPromptSessionSkip') === '1') {
      setVisible(false)
      return
    }

    let cancelled = false
    async function run() {
      try {
        const remoteCount = await countApplicationsForUser()
        if (cancelled || remoteCount > 0) return
        const local = await localHasImportableRows()
        if (!cancelled && local) setVisible(true)
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
      await importLocalDexieIntoSupabase()
      try {
        localStorage.setItem(localStorageImportKey(accountId), '1')
      } catch {
        /* ignore */
      }
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
      sessionStorage.setItem('hustler.importPromptSessionSkip', '1')
    } catch {
      /* ignore */
    }
    try {
      localStorage.setItem(localStorageImportKey(accountId), '1')
    } catch {
      /* ignore */
    }
    setVisible(false)
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="max-w-md rounded-lg border border-[#3d4150] bg-[#1c1f27] p-5 shadow-xl">
        <h2 className="text-base font-semibold text-zinc-100">
          Import local data?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          This browser still has data in{' '}
          <span className="font-mono text-zinc-300">IndexedDB</span>. Your cloud
          workspace is empty — copy everything from this device into your account
          now (resumes, applications, DSA, Passion, etc.).{' '}
          <span className="text-zinc-500">
            Skip if you intend to start fresh online.
          </span>
        </p>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="rounded border border-[#3d4150] px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
            disabled={busy}
            onClick={() => onSkip()}
          >
            Skip
          </button>
          <button
            type="button"
            disabled={busy}
            className="rounded bg-lime-500 px-4 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-lime-400 disabled:opacity-60"
            onClick={() => void onImport()}
          >
            {busy ? 'Importing…' : 'Import from this browser'}
          </button>
        </div>
      </div>
    </div>
  )
}
