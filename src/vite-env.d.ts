/// <reference types="vite/client" />

declare module 'virtual:pwa-register' {
  export interface RegisterSWOptions {
    immediate?: boolean
    onNeedRefresh?: () => void
    onOfflineReady?: () => void
    onRegistered?: (rw: unknown) => void
    onRegisterError?: (e: unknown) => void
  }
  export function registerSW(options?: RegisterSWOptions): void
}
