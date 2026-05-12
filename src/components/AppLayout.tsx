import { Outlet } from 'react-router-dom'
import { CommandPalette } from './CommandPalette'
import { Sidebar } from './Sidebar'
import { ToastHost } from './ToastHost'
import { TopBar } from './TopBar'
import { useGlobalHotkeys } from '../hooks/useGlobalHotkeys'

export function AppLayout() {
  useGlobalHotkeys()
  return (
    <div className="flex min-h-full">
      <Sidebar />
      <div className="flex min-h-full flex-1 flex-col md:pl-56">
        <TopBar />
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
      <ToastHost />
      <CommandPalette />
    </div>
  )
}
