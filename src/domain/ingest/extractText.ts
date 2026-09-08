import { detectFormat } from './detectFormat'

export type ExtractResult =
  | { ok: true; text: string; lines: string[] }
  | { ok: false; message: string }

/** Below this, a PDF is almost certainly scanned pages rather than text. */
const MIN_USEFUL_CHARS = 120

/**
 * Everything happens in the browser. The file is never uploaded -- that is the
 * project's central rule, and it is why there is no server-side conversion for
 * the formats that would need one.
 *
 * The readers are loaded on demand: pdfjs and mammoth together weigh more than
 * the rest of the app, and most people never import anything.
 */
export async function extractText(file: File): Promise<ExtractResult> {
  const check = await detectFormat(file)
  if (check.refusal) return { ok: false, message: check.refusal }

  let text: string
  try {
    text = check.format === 'pdf' ? await readPdf(file) : await readDocx(file)
  } catch {
    return {
      ok: false,
      message:
        'No pudimos leer el archivo. Puede estar dañado o protegido con contraseña. Probá exportarlo de nuevo, o cargá los datos a mano.',
    }
  }

  /*
   * A resume scanned to PDF is a stack of photographs: it opens fine, looks
   * fine, and yields almost no text. Saying so beats handing back an empty form
   * with no explanation.
   */
  if (text.replace(/\s/g, '').length < MIN_USEFUL_CHARS) {
    return {
      ok: false,
      message:
        'El archivo casi no tiene texto: probablemente sea un CV escaneado, que por dentro es una imagen. Vas a tener que cargar los datos a mano.',
    }
  }

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  return { ok: true, text, lines }
}

/**
 * A gap this wide between two runs of the same row is a separator, not a space.
 *
 * At the sizes a resume uses, a word space is around three points. Fourteen is
 * the margin the Harvard template puts between two skills.
 */
const GAP_IS_A_SEPARATOR = 6

export interface RowItem {
  x: number
  width: number
  text: string
}

/**
 * Joins one visual row, turning wide horizontal gaps into a visible separator.
 *
 * A PDF row carries no idea of "columns": `Excel avanzado`, `Tango Gestión` and
 * `Cuentas corrientes`, drawn side by side as three skills, come back as three
 * runs whose only difference from three ordinary words is the distance between
 * them. Joined with a plain space they became one skill called "Excel avanzado
 * Tango Gestión Cuentas corrientes" -- found by feeding the importer a PDF this
 * app had just generated.
 *
 * The gap is the only signal the format offers, so it is the one used.
 */
export function joinRow(items: RowItem[]): string {
  let out = ''
  let previousEnd: number | null = null

  for (const item of items) {
    const gap = previousEnd === null ? 0 : item.x - previousEnd
    if (out) out += gap > GAP_IS_A_SEPARATOR ? ' · ' : ' '
    out += item.text
    previousEnd = item.x + item.width
  }

  return out.replace(/[ \t]+/g, ' ').trim()
}

async function readPdf(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  // The worker must come from this same site. Loaded from a CDN it works in
  // development and fails in production, which is the worst way to find out.
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

  const task = pdfjs.getDocument({ data: await file.arrayBuffer() })
  const doc = await task.promise
  const pages: string[] = []

  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n)
    const content = await page.getTextContent()

    /*
     * A PDF stores positions, not lines: consecutive items can sit on the same
     * visual line or on the next one. Grouping by rounded Y rebuilds the lines.
     *
     * This is also where a two-column resume comes out interleaved, because the
     * two columns share the same Y values. That is a limitation of the format,
     * not a bug to fix here -- which is exactly why the extracted result is
     * always shown for review instead of applied blindly.
     */
    const placed: { x: number; y: number; width: number; text: string }[] = []
    for (const item of content.items) {
      if (!('str' in item) || !item.str.trim()) continue
      placed.push({
        x: item.transform[4] as number,
        y: item.transform[5] as number,
        width: item.width,
        text: item.str,
      })
    }

    /*
     * Group by Y with a tolerance instead of rounding into fixed buckets.
     * Rounding splits a line whenever two runs sit a hair apart but land either
     * side of a bucket edge -- which is how a job title and its date range,
     * drawn on the same visual row, came out as two separate lines.
     */
    const TOLERANCE = 3
    placed.sort((a, b) => b.y - a.y)

    const rows: { x: number; width: number; text: string }[][] = []
    let anchor = Number.POSITIVE_INFINITY
    for (const item of placed) {
      if (Math.abs(item.y - anchor) > TOLERANCE) {
        rows.push([])
        anchor = item.y
      }
      rows[rows.length - 1]?.push(item)
    }

    pages.push(
      rows
        .map((row) => joinRow(row.sort((a, b) => a.x - b.x)))
        .filter(Boolean)
        .join('\n'),
    )
  }

  // Tearing down the loading task also stops its worker; without this every
  // import leaves one running.
  await task.destroy()
  return pages.join('\n')
}

async function readDocx(file: File): Promise<string> {
  const mammoth = await import('mammoth')
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
  return result.value
}
