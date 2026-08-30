import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { CommandPalette } from './CommandPalette'
import { CloudImportPrompt } from './CloudImportPrompt'
import { Onboarding } from './Onboarding'
import { PomodoroEngine } from './PomodoroEngine'
import { BottomNav, Sidebar } from './Sidebar'
import { ToastHost } from './ToastHost'
import { TopBar } from './TopBar'
import { useGlobalHotkeys } from '../hooks/useGlobalHotkeys'
import { applyTheme, watchSystemTheme } from '../lib/theme'
import { useUiStore } from '../store/uiStore'

export function AppLayout() {
  useGlobalHotkeys()
  const zenMode = useUiStore((s) => s.zenMode)

  useEffect(() => {
    applyTheme(useUiStore.getState().theme)
    return watchSystemTheme(() => useUiStore.getState().theme)
  }, [])

  return (
    <div className="flex min-h-full">
      {!zenMode && <Sidebar />}
      <div
        className={
          zenMode
            ? 'flex min-h-full min-w-0 flex-1 flex-col'
            : 'flex min-h-full min-w-0 flex-1 flex-col lg:pl-64'
        }
      >
        {!zenMode && <TopBar />}
        <main
          className={
            zenMode
              ? 'min-h-0 min-w-0 flex-1'
              : 'min-h-0 min-w-0 flex-1 p-4 pb-20 sm:p-6 lg:p-8 lg:pb-8'
          }
        >
          <Outlet />
        </main>
      </div>
      {!zenMode && <BottomNav />}
      <PomodoroEngine />
      <ToastHost />
      <CommandPalette />
      <CloudImportPrompt />
      <Onboarding />
    </div>
  )
}
