import { create } from 'zustand'

export type ToastKind = 'save' | 'delete' | 'import' | 'reset' | 'info'

export interface ToastItem {
  id: string
  kind: ToastKind
  message: string
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
}))
