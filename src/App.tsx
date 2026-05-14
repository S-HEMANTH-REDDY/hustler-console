import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { RequireAuth } from './components/RequireAuth'
import { ApplicationsPage } from './pages/ApplicationsPage'
import { AuthPage } from './pages/AuthPage'
import { BehavioralPage } from './pages/BehavioralPage'
import { DSAPage } from './pages/DSAPage'
import { SettingsPage } from './pages/SettingsPage'
import { SystemDesignPage } from './pages/SystemDesignPage'
import { TasksPage } from './pages/TasksPage'
import { TimerPage } from './pages/TimerPage'
import { TodayPage } from './pages/TodayPage'
import { useAuthStore } from './store/authStore'

export default function App() {
  // Kick off the auth bootstrap exactly once. Safe to call when Supabase
  // isn't configured \u2014 the store flips to 'disabled' synchronously.
  const init = useAuthStore((s) => s.init)
  useEffect(() => {
    void init()
  }, [init])

  return (
    <HashRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route path="/" element={<TodayPage />} />
          <Route path="/applications" element={<ApplicationsPage />} />
          <Route path="/dsa" element={<DSAPage />} />
          <Route path="/system-design" element={<SystemDesignPage />} />
          <Route path="/behavioral" element={<BehavioralPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/timer" element={<TimerPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
