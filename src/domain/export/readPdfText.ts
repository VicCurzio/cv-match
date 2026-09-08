/**
 * Reads the text a generated PDF actually draws, page by page.
 *
 * Two jobs. In the tests it asserts the project's central claim -- that the
 * exported file carries real, selectable text and not a picture of text. In the
 * app it gives the analysis engine the REAL page count and how full the last
 * page is, instead of a line-count guess that was off by a factor of seven on
 * the first real resume it met.
 *
 * Web standards only (`DecompressionStream`, `TextDecoder`), so it runs in the
 * browser and under Vitest without pulling Node types into the app.
 */

export interface PdfContents {
  bytes: number
  /** Text runs grouped by page, in draw order. */
  pages: string[][]
  /** Every run, flattened. */
  lines: string[]
  text: string
  /**
   * Runs drawn outside the paper, below the bottom edge.
   *
   * Being IN the file and being ON the page are different things, and only the
   * second one gets printed or read. A block the layout engine was told it may
   * not split keeps drawing past the end of the sheet: the text is in the
   * content stream, so any check that only looks at the extracted text passes,
   * and the person sends a resume with half their jobs invisible.
   */
  offPage: string[]
  /** True when a raster image is embedded (the photo). */
  hasImage: boolean
  fonts: string[]
}

const latin1 = new TextDecoder('latin1')

async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream('deflate'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

export interface TextRun {
  text: string
  /** Baseline height in PDF units, measured from the bottom edge of the paper. */
  y: number
}

/**
 * `q`, `Q`, a translation matrix, or a text-drawing operator. One pass over the
 * content stream reads all four.
 */
const NUMBER = String.raw`-?\d*\.?\d+`
const TOKEN = new RegExp(
  String.raw`\bq\b|\bQ\b|(${NUMBER})\s+(${NUMBER})\s+(${NUMBER})\s+(${NUMBER})\s+(${NUMBER})\s+(${NUMBER})\s+(cm|Tm)|(\[[^\]]*\])\s*TJ`,
  'g',
)

function decodeHex(block: string): string {
  const hex = (block.match(/<[0-9a-fA-F]+>/g) ?? []).map((h) => h.slice(1, -1)).join('')
  let out = ''
  for (let i = 0; i < hex.length; i += 2) {
    out += String.fromCharCode(Number.parseInt(hex.slice(i, i + 2), 16))
  }
  return out
}

/**
 * Text is drawn with `TJ` over arrays of hex glyph codes with kerning between
 * them: `[<43> -111 <4f>] TJ`. The standard fonts use WinAnsiEncoding, which is
 * Latin-1, so decoding byte by byte gives back the real characters -- accents
 * and the enye included.
 *
 * Where each run lands takes a little more work: react-pdf never writes an
 * absolute position, it nests `cm` translations inside `q`/`Q` pairs and then
 * draws every string at the same text matrix. So the height of a run is the
 * accumulated translation of the graphics stack at the moment it is drawn --
 * which means tracking that stack is the only way to know whether a line is on
 * the paper at all.
 */
function runsIn(content: string): TextRun[] {
  const runs: TextRun[] = []

  // Vertical offset and vertical direction of the current transform.
  let ctm = { ty: 0, sy: 1 }
  const stack: { ty: number; sy: number }[] = []
  let textOffset = 0

  for (const match of content.matchAll(TOKEN)) {
    if (match[0] === 'q') {
      stack.push({ ...ctm })
      continue
    }
    if (match[0] === 'Q') {
      ctm = stack.pop() ?? ctm
      continue
    }

    if (match[7] === 'cm') {
      const d = Number(match[4])
      const f = Number(match[6])
      ctm = { ty: ctm.ty + f * ctm.sy, sy: ctm.sy * d }
      continue
    }
    if (match[7] === 'Tm') {
      textOffset = Number(match[6])
      continue
    }

    const block = match[8]
    if (!block) continue
    const text = decodeHex(block)
    if (text.trim()) runs.push({ text, y: ctm.ty + textOffset * ctm.sy })
  }

  return runs
}

/** A4 unless the document says otherwise. */
const DEFAULT_PAGE_HEIGHT = 841.89

function pageHeightOf(latin: string): number {
  const box = /\/MediaBox\s*\[\s*[\d.-]+\s+[\d.-]+\s+[\d.-]+\s+([\d.]+)/.exec(latin)
  return box?.[1] ? Number(box[1]) : DEFAULT_PAGE_HEIGHT
}

/**
 * The bytes of every stream in the file.
 *
 * The length comes from the stream's own `/Length` entry, never from scanning
 * for `endstream` and trimming what looks like a trailing newline. Compressed
 * data can legitimately END with 0x0A or 0x0D, and trimming those truncates the
 * stream -- which fails only for the documents that happen to end that way, so
 * it passes every test until a real resume hits it.
 */
function streamBodies(buffer: Uint8Array, latin: string): Uint8Array[] {
  const bodies: Uint8Array[] = []
  const re = /(^|[^d])stream\r?\n/g
  let match: RegExpExecArray | null

  while ((match = re.exec(latin)) !== null) {
    const start = match.index + match[0].length

    // `/Length 1828` sits in the dictionary just above the keyword.
    const dict = latin.slice(Math.max(0, match.index - 300), match.index)
    const declared = /\/Length\s+(\d+)(?![^]*\/Length\s+\d+)/.exec(dict)

    if (declared?.[1]) {
      const length = Number(declared[1])
      if (length > 0 && start + length <= buffer.length) {
        bodies.push(buffer.subarray(start, start + length))
        continue
      }
    }

    // No usable /Length (an indirect reference, say): fall back to the keyword,
    // trimming at most the single EOL the spec puts before it.
    const end = latin.indexOf('endstream', start)
    if (end === -1) break
    let stop = end
    if (buffer[stop - 1] === 10) stop--
    if (buffer[stop - 1] === 13) stop--
    bodies.push(buffer.subarray(start, stop))
  }

  return bodies
}

export async function readPdf(buffer: Uint8Array): Promise<PdfContents> {
  const latin = latin1.decode(buffer)
  const pageHeight = pageHeightOf(latin)

  // One content stream per page, in order.
  const pages: string[][] = []
  const offPage: string[] = []
  for (const body of streamBodies(buffer, latin)) {
    // 0x78 is the zlib header; anything else here is the embedded JPEG.
    if (body[0] !== 0x78) continue

    /*
     * A stream that will not inflate is skipped rather than thrown. This reader
     * measures a document; it is not the document. Refusing to produce a page
     * count is acceptable, taking the preview down with it is not.
     */
    let content: string
    try {
      content = latin1.decode(await inflate(body))
    } catch {
      continue
    }

    if (!content.includes('TJ')) continue

    const runs = runsIn(content)
    pages.push(runs.map((run) => run.text))
    // A baseline below zero, or above the top edge, is off the sheet entirely.
    offPage.push(...runs.filter((run) => run.y < 0 || run.y > pageHeight).map((run) => run.text))
  }

  const lines = pages.flat()
  const fonts: string[] = (latin.match(/\/BaseFont\s*\/[\w-]+/g) ?? []).map((f) =>
    f.replace(/\/BaseFont\s*\//, ''),
  )

  return {
    bytes: buffer.length,
    pages,
    lines,
    text: lines.join(' '),
    offPage,
    hasImage: latin.includes('DCTDecode'),
    fonts: [...new Set(fonts)],
  }
}

export interface LayoutFacts {
  pageCount: number
  /** Share of the document's text runs that sit on the last page, 0 to 1. */
  lastPageShare: number
}

export function layoutFacts(contents: PdfContents): LayoutFacts {
  const pageCount = Math.max(1, contents.pages.length)
  const total = contents.lines.length
  const last = contents.pages.at(-1)?.length ?? 0
  return { pageCount, lastPageShare: total === 0 ? 1 : last / total }
}
