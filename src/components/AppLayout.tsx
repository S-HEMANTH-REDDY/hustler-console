import { Outlet } from 'react-router-dom'
import { CommandPalette } from './CommandPalette'
import { CloudImportPrompt } from './CloudImportPrompt'
import { Sidebar } from './Sidebar'
import { ToastHost } from './ToastHost'
import { TopBar } from './TopBar'
import { useGlobalHotkeys } from '../hooks/useGlobalHotkeys'

export function AppLayout() {
  useGlobalHotkeys()
  return (
    <div className="flex min-h-full">
      <Sidebar />
      {/* min-w-0 is essential so wide tables / textareas trigger horizontal
          scroll inside this column instead of pushing the whole layout wider
          than the viewport (which was making split-screen views overflow). */}
      <div className="flex min-h-full min-w-0 flex-1 flex-col lg:pl-56">
        <TopBar />
        <main className="min-h-0 min-w-0 flex-1 p-3 sm:p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
      <ToastHost />
      <CommandPalette />
      <CloudImportPrompt />
    </div>
  )
}
