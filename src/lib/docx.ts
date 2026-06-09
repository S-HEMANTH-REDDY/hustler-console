// mammoth is heavy (~hundreds of KB) and only needed when a user actually
// previews a .docx. Load it lazily via dynamic import so it stays out of the
// main bundle and the app's first paint is fast.
type MammothModule = {
  convertToHtml: (
    input: { arrayBuffer: ArrayBuffer },
    options?: Record<string, unknown>,
  ) => Promise<{ value: string }>
}

let mammothPromise: Promise<MammothModule> | null = null
function loadMammoth(): Promise<MammothModule> {
  if (!mammothPromise) {
    // Prebuilt browser bundle avoids Node-only deps (@xmldom/xmldom, etc.).
    mammothPromise = import('mammoth/mammoth.browser').then(
      (m) => (m.default ?? m) as MammothModule,
    )
  }
  return mammothPromise
}

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
  const mammoth = await loadMammoth()
  const result = await mammoth.convertToHtml({ arrayBuffer })
  return result.value || ''
}
