export type FileFormat = 'pdf' | 'docx' | 'doc-legacy' | 'unknown'

export interface FormatCheck {
  format: FileFormat
  /** Non-null when the file cannot be read, with the way out. */
  refusal: string | null
}

/**
 * Detect by CONTENT, not by extension.
 *
 * A resume renamed from `.doc` to `.docx` is common enough -- someone tries it
 * to make an upload work -- and if the extension were trusted, the DOCX reader
 * would receive a binary OLE file and fail with something unreadable. The magic
 * bytes never lie.
 */
export async function detectFormat(file: File): Promise<FormatCheck> {
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer())
  const starts = (...bytes: number[]) => bytes.every((b, i) => head[i] === b)

  // "%PDF"
  if (starts(0x25, 0x50, 0x44, 0x46)) return { format: 'pdf', refusal: null }

  // "PK\x03\x04" -- a zip, which is what a .docx is.
  if (starts(0x50, 0x4b, 0x03, 0x04)) return { format: 'docx', refusal: null }

  // OLE compound file: Word 97-2003 (.doc).
  if (starts(0xd0, 0xcf, 0x11, 0xe0)) {
    return {
      format: 'doc-legacy',
      refusal:
        'Ese archivo es un .doc de Word 97-2003, un formato viejo que no se puede leer en el navegador. Abrilo en Word, usá "Guardar como" y elegí .docx o PDF. Después subilo de nuevo.',
    }
  }

  return {
    format: 'unknown',
    refusal:
      'No pudimos reconocer el archivo. Subí tu CV en .pdf o .docx, que son los formatos que podemos leer.',
  }
}
