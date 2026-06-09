/// <reference types="vite/client" />

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
