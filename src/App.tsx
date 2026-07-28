import { Suspense, lazy, useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { RequireAuth } from './components/RequireAuth'
import { useAuthStore } from './store/authStore'

// Route-level code splitting: each page ships as its own chunk and is fetched
// on navigation, keeping the initial download (and first paint) small.
const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
)
const FocusPage = lazy(() =>
  import('./pages/FocusPage').then((m) => ({ default: m.FocusPage })),
)
const CalendarPage = lazy(() =>
  import('./pages/CalendarPage').then((m) => ({ default: m.CalendarPage })),
)
const AnalyticsPage = lazy(() =>
  import('./pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })),
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
const PassionPage = lazy(() =>
  import('./pages/PassionPage').then((m) => ({ default: m.PassionPage })),
)

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div
        className="flex items-center gap-2 text-xs text-zinc-500"
        role="status"
        aria-label="Loading page"
      >
        <span className="h-2 w-2 animate-pulse rounded-full bg-lime-400" />
        Loading…
      </div>
    </div>
  )
}

export default function App() {
  // Kick off the auth bootstrap exactly once. Safe to call when Supabase
  // isn't configured — the store flips to 'disabled' synchronously.
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
            <Route path="/" element={<DashboardPage />} />
            <Route path="/focus" element={<FocusPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/applications" element={<ApplicationsPage />} />
            <Route path="/dsa" element={<DSAPage />} />
            <Route path="/system-design" element={<SystemDesignPage />} />
            <Route path="/behavioral" element={<BehavioralPage />} />
            <Route path="/passion" element={<PassionPage />} />
            {/* Legacy paths */}
            <Route path="/timer" element={<Navigate to="/focus" replace />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </HashRouter>
  )
}
