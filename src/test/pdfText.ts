/**
 * Reads the actual text out of a generated PDF.
 *
 * This exists so the project's central claim can be asserted instead of
 * believed: the exported file has real, selectable text rather than a picture
 * of text. If a future change swapped the renderer for a canvas-based one, the
 * PDF would still look right and every other test would still pass -- this is
 * the one that would go red.
 *
 * Written with web standards only (`DecompressionStream`, `TextDecoder`), not
 * `node:zlib`, so it typechecks under the app's DOM-only lib and could run in a
 * browser too. Pulling Node types into the app config to satisfy one helper
 * would let app code reach for `process` and `Buffer`, which do not exist where
 * this ships.
 */

export interface PdfContents {
  bytes: number
  /** Each text run, in the order the document draws it. */
  lines: string[]
  /** Everything, joined -- convenient for `toContain` assertions. */
  text: string
  /** True when a raster image is embedded (the photo). */
  hasImage: boolean
  fonts: string[]
}

const latin1 = new TextDecoder('latin1')

async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

export async function readPdf(buffer: Uint8Array): Promise<PdfContents> {
  const latin = latin1.decode(buffer)

  // Find each stream body. The `[^d]` guard avoids matching "endstream".
  const bodies: Uint8Array[] = []
  const re = /(^|[^d])stream\r?\n/g
  let match: RegExpExecArray | null
  while ((match = re.exec(latin)) !== null) {
    const start = match.index + match[0].length
    const end = latin.indexOf('endstream', start)
    if (end === -1) break
    let stop = end
    // Trim the end-of-line that precedes "endstream", or inflate fails.
    while (stop > start && (buffer[stop - 1] === 10 || buffer[stop - 1] === 13)) stop--
    bodies.push(buffer.subarray(start, stop))
  }

  let content = ''
  for (const body of bodies) {
    // 0x78 is the zlib header; anything else here is the embedded JPEG.
    if (body[0] !== 0x78) continue
    content += latin1.decode(await inflate(body))
  }

  /*
   * Text is drawn with `TJ` over arrays of hex glyph codes with kerning between
   * them: `[<43> -111 <4f>] TJ`. The standard fonts use WinAnsiEncoding, which
   * is Latin-1, so decoding byte by byte gives back the real characters --
   * accents and the enye included.
   */
  const lines: string[] = []
  for (const block of content.match(/\[[^\]]*\]\s*TJ/g) ?? []) {
    const hex: string = (block.match(/<[0-9a-fA-F]+>/g) ?? [])
      .map((h) => h.slice(1, -1))
      .join('')
    let out = ''
    for (let i = 0; i < hex.length; i += 2) {
      out += String.fromCharCode(Number.parseInt(hex.slice(i, i + 2), 16))
    }
    if (out.trim()) lines.push(out)
  }

  const fonts: string[] = (latin.match(/\/BaseFont\s*\/[\w-]+/g) ?? []).map((f) =>
    f.replace(/\/BaseFont\s*\//, ''),
  )

  return {
    bytes: buffer.length,
    lines,
    text: lines.join(' '),
    hasImage: latin.includes('DCTDecode'),
    fonts: [...new Set(fonts)],
  }
}

/** A 1x1 JPEG, enough to stand in for a profile photo. */
export const TINY_JPEG =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q=='
