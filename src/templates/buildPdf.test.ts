import { describe, expect, it } from 'vitest'
import { AR_PROFILE, INTL_PROFILE } from '@/domain/market/marketProfile'
import { administrativeAr } from '@/test/fixtures'
import { TINY_JPEG, readPdf } from '@/test/pdfText'
import { buildPdf } from './buildPdf'

/** The fixture's photo is a placeholder string; the renderer needs real bytes. */
const withPhoto = {
  ...administrativeAr,
  personal: { ...administrativeAr.personal, photo: TINY_JPEG },
}

async function render(options: Parameters<typeof buildPdf>[1]) {
  const blob = await buildPdf(withPhoto, options)
  return await readPdf(new Uint8Array(await blob.arrayBuffer()))
}

/**
 * The claim the whole product rests on (ADR 0001). Without this test, a change
 * to a canvas-based renderer would still produce a PDF that looks right, and
 * every other test in the suite would still pass.
 */
describe('the exported PDF contains real text, not a picture of text', () => {
  it('draws selectable text with the standard PDF fonts', async () => {
    const pdf = await render({ profile: AR_PROFILE, atsMode: false, template: 'harvard' })

    expect(pdf.lines.length).toBeGreaterThan(20)
    expect(pdf.fonts.every((f) => /Helvetica|Times/.test(f))).toBe(true)
  })

  it('keeps Spanish accents, the enye and the opening marks intact', async () => {
    const pdf = await render({ profile: AR_PROFILE, atsMode: false, template: 'harvard' })

    expect(pdf.text).toContain('Ana Gómez Ruiz')
    expect(pdf.text).toContain('EDUCACIÓN')
    expect(pdf.text).toContain('atención al cliente')
    expect(pdf.text).toContain('Español')
  })

  it('uses the section headings an automated reader expects', async () => {
    const pdf = await render({ profile: AR_PROFILE, atsMode: true, template: 'harvard' })

    for (const heading of ['PERFIL PROFESIONAL', 'EXPERIENCIA LABORAL', 'EDUCACIÓN', 'HABILIDADES', 'IDIOMAS']) {
      expect(pdf.lines).toContain(heading)
    }
  })
})

/**
 * Caught in the browser on day one: react-pdf hyphenates with an English
 * dictionary and split the email across two lines as `anagomez1992@exam-` /
 * `ple.com`. Whoever copies that gets a broken address, on the one field that
 * has to work.
 */
describe('no word is ever hyphenated across lines', () => {
  it('keeps the email address in one piece', async () => {
    const pdf = await render({ profile: AR_PROFILE, atsMode: false, template: 'modern' })

    expect(pdf.text).toContain('anagomez1992@example.com')
    expect(pdf.lines.some((l) => l.includes('exam-'))).toBe(false)
  })

  it('does not break long Spanish words either', async () => {
    const pdf = await render({ profile: AR_PROFILE, atsMode: false, template: 'modern' })

    // A trailing hyphen on a run that is not the bullet mark means a split word.
    const broken = pdf.lines.filter((l) => /\w-$/.test(l.trim()))
    expect(broken).toEqual([])
  })
})

/**
 * The market rule, verified on the artifact itself rather than on the state
 * that produced it. This is what makes "the photo is not exported" a fact about
 * the file instead of a promise about the code.
 */
describe('the market profile decides what reaches the file', () => {
  it('embeds the photo for Argentina', async () => {
    const pdf = await render({ profile: AR_PROFILE, atsMode: false, template: 'modern' })
    expect(pdf.hasImage).toBe(true)
  })

  it('never embeds the photo for the international market', async () => {
    const pdf = await render({ profile: INTL_PROFILE, atsMode: false, template: 'modern' })
    expect(pdf.hasImage).toBe(false)
  })

  it('never embeds the photo in ATS mode, even where the market allows it', async () => {
    const pdf = await render({ profile: AR_PROFILE, atsMode: true, template: 'modern' })
    expect(pdf.hasImage).toBe(false)
  })

  it('keeps the document number out of an international export', async () => {
    const pdf = await render({ profile: INTL_PROFILE, atsMode: false, template: 'harvard' })
    expect(pdf.text).not.toContain('35.123.456')
  })
})

describe('ATS mode forces the single-column template', () => {
  it('renders Harvard even when Modern is selected', async () => {
    const ats = await render({ profile: AR_PROFILE, atsMode: true, template: 'modern' })
    const harvard = await render({ profile: AR_PROFILE, atsMode: true, template: 'harvard' })

    // The sidebar headings only exist in the Modern template.
    expect(ats.lines).not.toContain('CONTACTO')
    expect(ats.lines).toEqual(harvard.lines)
  })
})
