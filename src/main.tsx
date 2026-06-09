import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ensureDefaults } from './db/database'
import './index.css'
import App from './App.tsx'

void ensureDefaults()

// We no longer ship a service worker. Proactively unregister any worker a
// previous build may have installed so returning visitors don't get stuck on
// a stale cached version of the app.
if ('serviceWorker' in navigator) {
  void navigator.serviceWorker
    .getRegistrations()
    .then((regs) => regs.forEach((r) => void r.unregister()))
    .catch(() => undefined)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
