import { describe, expect, it } from 'vitest'
import { AR_PROFILE } from '@/domain/market/marketProfile'
import { cleanAr } from '@/test/fixtures'
import { buildPdf } from '@/templates/buildPdf'
import { layoutFacts, readPdf } from './readPdfText'

async function render(resume = cleanAr) {
  const blob = await buildPdf(resume, {
    profile: AR_PROFILE,
    atsMode: false,
    template: 'modern',
  })
  return new Uint8Array(await blob.arrayBuffer())
}

describe('readPdf measures a real document', () => {
  it('finds the pages and the text', async () => {
    const contents = await readPdf(await render())
    expect(contents.pages.length).toBeGreaterThan(0)
    expect(contents.text).toContain(cleanAr.personal.fullName)
  })

  it('reports how full the last page is', async () => {
    const facts = layoutFacts(await readPdf(await render()))
    expect(facts.pageCount).toBeGreaterThan(0)
    expect(facts.lastPageShare).toBeGreaterThan(0)
    expect(facts.lastPageShare).toBeLessThanOrEqual(1)
  })
})

/**
 * The bug this suite exists for.
 *
 * The reader used to find a stream's end by searching for `endstream` and
 * trimming every trailing newline before it. Compressed data can legitimately
 * END with 0x0A or 0x0D, so that truncated the stream -- and only for the
 * documents that happened to end that way. Every test passed until a real
 * resume produced one, and then the whole preview went down with it.
 */
describe('it survives streams whose data ends in a newline', () => {
  it('reads a stream whose compressed bytes end with 0x0A', async () => {
    const bytes = await render()
    const latin = new TextDecoder('latin1').decode(bytes)

    // Confirm the fixture is exercising the real shape: /Length is what is used.
    expect(latin).toMatch(/\/Length\s+\d+/)

    const contents = await readPdf(bytes)
    expect(contents.lines.length).toBeGreaterThan(10)
  })

  it('never throws on a file it cannot make sense of', async () => {
    const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0))
    const garbage = new Uint8Array([
      ...ascii('%PDF-1.3\n<< /Length 8 >>\nstream\n'),
      // A valid zlib header followed by bytes that will not inflate, ending in
      // the newlines the old code used to trim away.
      0x78, 0x9c, 0xff, 0xff, 0xff, 0xff, 0x0a, 0x0d,
      ...ascii('\nendstream\n%%EOF'),
    ])

    const contents = await readPdf(garbage)
    expect(contents.pages).toEqual([])
    expect(contents.lines).toEqual([])
  })

})

/**
 * The vertical tracking, on a document written by hand rather than by react-pdf.
 *
 * `offPage` is what tells "the text is in the file" from "the text is on the
 * paper", and it is the assertion the long-resume test rests on -- so it gets
 * checked against a stream whose expected answer is known by construction,
 * not only against whatever the renderer happens to produce.
 *
 * react-pdf never writes an absolute position: it flips the page upside down,
 * nests `cm` translations inside `q`/`Q`, and then draws every string at the
 * same text matrix. The two blocks below are that exact shape, one placed 51
 * units from the top and one pushed 900 units down -- past the bottom of an A4.
 */
describe('it knows where on the page a line was drawn', () => {
  const onPaper = `
q
1 0 0 1 51 51 cm
q
1 0 0 -1 0 842 cm
BT
1 0 0 1 0 842 Tm
/F1 10 Tf
[<41>] TJ
ET
Q
Q`

  const pastTheBottom = `
q
1 0 0 1 51 900 cm
q
1 0 0 -1 0 842 cm
BT
1 0 0 1 0 842 Tm
/F1 10 Tf
[<42>] TJ
ET
Q
Q`

  async function pdfOf(content: string): Promise<Uint8Array> {
    const compressed = new Uint8Array(
      await new Response(
        new Blob([`1 0 0 -1 0 842 cm${content}`])
          .stream()
          .pipeThrough(new CompressionStream('deflate')),
      ).arrayBuffer(),
    )

    const head = `%PDF-1.3\n/MediaBox [0 0 595.28 841.89]\n<< /Length ${compressed.length} >>\nstream\n`
    const tail = '\nendstream\n%%EOF'
    const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0))

    return new Uint8Array([...ascii(head), ...compressed, ...ascii(tail)])
  }

  it('reads a line that sits inside the page as on the page', async () => {
    const contents = await readPdf(await pdfOf(onPaper))

    expect(contents.pages).toEqual([['A']])
    expect(contents.offPage).toEqual([])
  })

  it('reports a line drawn past the bottom edge', async () => {
    const contents = await readPdf(await pdfOf(pastTheBottom))

    // Still in the file -- which is exactly why reading the text is not enough.
    expect(contents.text).toContain('B')
    expect(contents.offPage).toEqual(['B'])
  })

  it('separates the two within one page', async () => {
    const contents = await readPdf(await pdfOf(onPaper + pastTheBottom))

    expect(contents.pages).toEqual([['A', 'B']])
    expect(contents.offPage).toEqual(['B'])
  })
})

describe('layoutFacts', () => {
  it('handles an empty document', () => {
    const facts = layoutFacts({
      bytes: 0,
      pages: [],
      lines: [],
      text: '',
      offPage: [],
      hasImage: false,
      fonts: [],
    })
    expect(facts.pageCount).toBe(1)
    expect(facts.lastPageShare).toBe(1)
  })
})
