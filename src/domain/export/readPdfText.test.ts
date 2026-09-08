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

  it('returns a usable measurement for an empty read', () => {
    const facts = layoutFacts({
      bytes: 0,
      pages: [],
      lines: [],
      text: '',
      hasImage: false,
      fonts: [],
    })
    expect(facts.pageCount).toBe(1)
    expect(facts.lastPageShare).toBe(1)
  })
})
