import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { ApplicationsPage } from './pages/ApplicationsPage'
import { BehavioralPage } from './pages/BehavioralPage'
import { DSAPage } from './pages/DSAPage'
import { SettingsPage } from './pages/SettingsPage'
import { SystemDesignPage } from './pages/SystemDesignPage'
import { TasksPage } from './pages/TasksPage'
import { TodayPage } from './pages/TodayPage'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<TodayPage />} />
          <Route path="/applications" element={<ApplicationsPage />} />
          <Route path="/dsa" element={<DSAPage />} />
          <Route path="/system-design" element={<SystemDesignPage />} />
          <Route path="/behavioral" element={<BehavioralPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
