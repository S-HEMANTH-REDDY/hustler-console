import { Suspense, lazy, useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { RequireAuth } from './components/RequireAuth'
import { useAuthStore } from './store/authStore'

// Route-level code splitting: each page ships as its own chunk and is fetched
// on navigation, keeping the initial download (and first paint) small.
const TodayPage = lazy(() =>
  import('./pages/TodayPage').then((m) => ({ default: m.TodayPage })),
)
const ApplicationsPage = lazy(() =>
  import('./pages/ApplicationsPage').then((m) => ({
    default: m.ApplicationsPage,
  })),
)
const AuthPage = lazy(() =>
  import('./pages/AuthPage').then((m) => ({ default: m.AuthPage })),
)
const BehavioralPage = lazy(() =>
  import('./pages/BehavioralPage').then((m) => ({ default: m.BehavioralPage })),
)
const DSAPage = lazy(() =>
  import('./pages/DSAPage').then((m) => ({ default: m.DSAPage })),
)
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)
const SystemDesignPage = lazy(() =>
  import('./pages/SystemDesignPage').then((m) => ({
    default: m.SystemDesignPage,
  })),
)
const TasksPage = lazy(() =>
  import('./pages/TasksPage').then((m) => ({ default: m.TasksPage })),
)
const TimerPage = lazy(() =>
  import('./pages/TimerPage').then((m) => ({ default: m.TimerPage })),
)

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-zinc-500">
        <span className="h-2 w-2 animate-pulse rounded-full bg-lime-400" />
        Loading…
      </div>
    </div>
  )
}

export default function App() {
  // Kick off the auth bootstrap exactly once. Safe to call when Supabase
  // isn't configured \u2014 the store flips to 'disabled' synchronously.
  const init = useAuthStore((s) => s.init)
  useEffect(() => {
    void init()
  }, [init])

  return (
    <HashRouter>
      <Suspense fallback={<RouteFallback />}>
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
      </Suspense>
    </HashRouter>
  )
}
