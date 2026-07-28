export type ThemePref = 'dark' | 'light' | 'system'

const THEME_KEY = 'hustler.theme'

export function loadThemePref(): ThemePref {
  try {
    const raw = window.localStorage.getItem(THEME_KEY)
    if (raw === 'dark' || raw === 'light' || raw === 'system') return raw
  } catch {
    // ignore
  }
  return 'dark'
}

export function saveThemePref(pref: ThemePref) {
  try {
    window.localStorage.setItem(THEME_KEY, pref)
  } catch {
    // ignore
  }
}

function resolve(pref: ThemePref): 'dark' | 'light' {
  if (pref !== 'system') return pref
  return window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark'
}

/** Set data-theme on <html>; the CSS token overrides do the rest. */
export function applyTheme(pref: ThemePref) {
  document.documentElement.dataset.theme = resolve(pref)
}

/** Re-apply on OS theme changes while pref is 'system'. */
export function watchSystemTheme(getPref: () => ThemePref): () => void {
  const mq = window.matchMedia('(prefers-color-scheme: light)')
  const onChange = () => {
    if (getPref() === 'system') applyTheme('system')
  }
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}
