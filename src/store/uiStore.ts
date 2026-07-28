import { create } from 'zustand'
import {
  applyTheme,
  loadThemePref,
  saveThemePref,
  type ThemePref,
} from '../lib/theme'

export type ToastKind = 'save' | 'delete' | 'import' | 'reset' | 'info'

export interface ToastItem {
  id: string
  kind: ToastKind
  message: string
}

const ONBOARDING_KEY = 'hustler.onboarded.v1'

function loadOnboarded(): boolean {
  try {
    return window.localStorage.getItem(ONBOARDING_KEY) === '1'
  } catch {
    return true
  }
}

interface UiState {
  sidebarOpen: boolean
  setSidebarOpen: (v: boolean) => void
  paletteOpen: boolean
  setPaletteOpen: (v: boolean) => void
  togglePalette: () => void
  toasts: ToastItem[]
  pushToast: (kind: ToastKind, message: string) => void
  removeToast: (id: string) => void
  theme: ThemePref
  setTheme: (t: ThemePref) => void
  /** True once the user has completed or skipped first-run onboarding. */
  onboarded: boolean
  setOnboarded: (v: boolean) => void
  /** Focus page's distraction-free fullscreen state. */
  zenMode: boolean
  setZenMode: (v: boolean) => void
}

let toastSeq = 0

export const useUiStore = create<UiState>((set, get) => ({
  sidebarOpen: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  paletteOpen: false,
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  togglePalette: () => set({ paletteOpen: !get().paletteOpen }),
  toasts: [],
  pushToast: (kind, message) => {
    const id = `t-${++toastSeq}`
    const item: ToastItem = { id, kind, message }
    set({ toasts: [...get().toasts, item] })
    window.setTimeout(() => {
      get().removeToast(id)
    }, 2100)
  },
  removeToast: (id) =>
    set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  theme: loadThemePref(),
  setTheme: (theme) => {
    saveThemePref(theme)
    applyTheme(theme)
    set({ theme })
  },
  onboarded: loadOnboarded(),
  setOnboarded: (v) => {
    try {
      window.localStorage.setItem(ONBOARDING_KEY, v ? '1' : '0')
    } catch {
      // ignore
    }
    set({ onboarded: v })
  },
  zenMode: false,
  setZenMode: (zenMode) => set({ zenMode }),
}))
