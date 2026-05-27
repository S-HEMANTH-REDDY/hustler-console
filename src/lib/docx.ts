// Use the prebuilt browser bundle so Vite doesn't try to resolve
// Node-only deps like `path-is-absolute` or `@xmldom/xmldom`.
import mammoth from 'mammoth/mammoth.browser'

/** Return true if the file looks like a Word `.docx` document. */
export function isDocxFile(
  fileType: string | undefined | null,
  fileName: string,
): boolean {
  if ((fileType ?? '').includes('wordprocessingml')) return true
  return /\.docx$/i.test(fileName)
}

/** Return true if the file is the *legacy* `.doc` binary format (not previewable). */
export function isLegacyDocFile(
  fileType: string | undefined | null,
  fileName: string,
): boolean {
  if ((fileType ?? '') === 'application/msword') return true
  return /\.doc$/i.test(fileName) && !/\.docx$/i.test(fileName)
}

/**
 * Convert a `.docx` Blob to a sanitized-ish HTML fragment using mammoth.
 * Images are inlined as data URIs so the result renders without any extra
 * network or storage. Throws if the file isn't a valid `.docx`.
 */
export async function docxBlobToHtml(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer()
  const result = await mammoth.convertToHtml({ arrayBuffer })
  return result.value || ''
}
