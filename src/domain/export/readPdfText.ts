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

/**
 * Text is drawn with `TJ` over arrays of hex glyph codes with kerning between
 * them: `[<43> -111 <4f>] TJ`. The standard fonts use WinAnsiEncoding, which is
 * Latin-1, so decoding byte by byte gives back the real characters -- accents
 * and the enye included.
 */
function runsIn(content: string): string[] {
  const runs: string[] = []
  for (const block of content.match(/\[[^\]]*\]\s*TJ/g) ?? []) {
    const hex = (block.match(/<[0-9a-fA-F]+>/g) ?? []).map((h) => h.slice(1, -1)).join('')
    let out = ''
    for (let i = 0; i < hex.length; i += 2) {
      out += String.fromCharCode(Number.parseInt(hex.slice(i, i + 2), 16))
    }
    if (out.trim()) runs.push(out)
  }
  return runs
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

  // One content stream per page, in order.
  const pages: string[][] = []
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
    pages.push(runsIn(content))
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
