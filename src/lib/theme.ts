/** Visual modes, brightest to darkest, plus an OS-following option. */
export type ThemePref = 'light' | 'dim' | 'dark' | 'system'

/** The three concrete surfaces a `ThemePref` can resolve to. */
export type ResolvedTheme = 'light' | 'dim' | 'dark'

const THEME_KEY = 'hustler.theme'

/** Order used when cycling with the topbar toggle. */
export const THEME_CYCLE: ResolvedTheme[] = ['dark', 'dim', 'light']

export const THEME_LABELS: Record<ThemePref, string> = {
  light: 'Light',
  dim: 'Dim',
  dark: 'Dark',
  system: 'System',
}

function isThemePref(v: unknown): v is ThemePref {
  return v === 'light' || v === 'dim' || v === 'dark' || v === 'system'
}

export function loadThemePref(): ThemePref {
  try {
    const raw = window.localStorage.getItem(THEME_KEY)
    if (isThemePref(raw)) return raw
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

export function resolveTheme(pref: ThemePref): ResolvedTheme {
  if (pref !== 'system') return pref
  return window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark'
}

/** Set data-theme on <html>; the CSS token overrides do the rest. */
export function applyTheme(pref: ThemePref) {
  const resolved = resolveTheme(pref)
  document.documentElement.dataset.theme = resolved
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute(
      'content',
      resolved === 'light' ? '#eef0f5' : resolved === 'dim' ? '#1b1e26' : '#05060a',
    )
  }
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
