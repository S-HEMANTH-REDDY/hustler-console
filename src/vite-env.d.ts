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

// Mammoth ships a browser-only bundle; declare just the shape we use.
declare module 'mammoth/mammoth.browser' {
  export interface ConvertInput {
    arrayBuffer?: ArrayBuffer
    buffer?: ArrayBuffer
  }
  export interface ConvertResult {
    value: string
    messages: Array<{ type: string; message: string }>
  }
  export function convertToHtml(
    input: ConvertInput,
    options?: Record<string, unknown>,
  ): Promise<ConvertResult>
  const mammoth: { convertToHtml: typeof convertToHtml }
  export default mammoth
}
