import { describe, expect, it } from 'vitest'
import { draftLetter } from '@/domain/letter/letterModel'
import { AR_PROFILE, INTL_PROFILE } from '@/domain/market/marketProfile'
import { administrativeAr, longAr } from '@/test/fixtures'
import { TINY_JPEG, readPdf } from '@/test/pdfText'
import { buildLetterPdf, buildPdf } from './buildPdf'

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

  /**
   * A narrower check missed this one. The skills line ended `... Negociación ·-`
   * because react-pdf treats the middle dot as a break opportunity and emits a
   * hyphen there -- a hyphen after punctuation, which `\w-$` does not match.
   * The fix was to stop joining lists into one long string.
   */
  it('never ends a line with a hyphen, whatever precedes it', async () => {
    for (const template of ['harvard', 'modern'] as const) {
      const pdf = await render({ profile: AR_PROFILE, atsMode: false, template })
      const broken = pdf.lines.filter((l) => l.trim() !== '-' && /-$/.test(l.trim()))
      expect(broken, `${template} broke a line with a hyphen`).toEqual([])
    }
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

describe('the cover letter is a real document too', () => {
  const letter = {
    ...draftLetter(withPhoto, { role: 'Analista administrativa', company: 'Banco Credicoop' }),
    body: 'Me interesa el puesto porque quiero seguir creciendo en administración bancaria.',
  }

  async function renderLetter(options: Parameters<typeof buildLetterPdf>[2]) {
    const blob = await buildLetterPdf(withPhoto, letter, options)
    return await readPdf(new Uint8Array(await blob.arrayBuffer()))
  }

  it('carries selectable text, like the resume', async () => {
    const pdf = await renderLetter({ profile: AR_PROFILE, atsMode: false, template: 'modern' })

    expect(pdf.text).toContain('Banco Credicoop')
    expect(pdf.text).toContain('Analista administrativa')
    expect(pdf.text).toContain('Saludos cordiales,')
    expect(pdf.text).toContain(withPhoto.personal.fullName)
  })

  it('fits on a single page', async () => {
    const pdf = await renderLetter({ profile: AR_PROFILE, atsMode: false, template: 'modern' })
    expect(pdf.pages).toHaveLength(1)
  })

  it('never breaks a line with a hyphen', async () => {
    const pdf = await renderLetter({ profile: AR_PROFILE, atsMode: true, template: 'harvard' })
    expect(pdf.lines.filter((l) => l.trim() !== '-' && /-$/.test(l.trim()))).toEqual([])
  })

  /** It travels in the same email as the resume, so it takes the same typeface. */
  it('uses the serif heading when the resume does', async () => {
    const withHarvard = await renderLetter({
      profile: AR_PROFILE,
      atsMode: true,
      template: 'harvard',
    })
    const withModern = await renderLetter({
      profile: AR_PROFILE,
      atsMode: false,
      template: 'modern',
    })

    expect(withHarvard.fonts).toContain('Times-Bold')
    expect(withModern.fonts).not.toContain('Times-Bold')
  })

  it('never embeds the photo: a cover letter does not carry one', async () => {
    const pdf = await renderLetter({ profile: AR_PROFILE, atsMode: false, template: 'modern' })
    expect(pdf.hasImage).toBe(false)
  })
})

/**
 * The failure this suite could not see: a resume longer than one page.
 *
 * Both templates marked each section `wrap={false}`, which does not mean "keep
 * this together" so much as "this may never be split". The layout engine then
 * has nowhere to put a section taller than a page, and it does not fail: it
 * packs every line onto the one page anyway. Twenty jobs came out as 226 lines
 * printed over each other inside a single sheet in the Harvard template, and as
 * a layout that gave up entirely in the Modern one -- a run positioned at minus
 * nineteen million.
 *
 * The trap is that all of that text is still IN the file. The first version of
 * this test looked for the job titles in the extracted text and passed happily
 * on the broken template. What is missing is the paper underneath them.
 */
describe('a resume longer than one page keeps all of its content on the paper', () => {
  for (const template of ['harvard', 'modern'] as const) {
    it(`draws nothing past the bottom edge, in ${template}`, async () => {
      const blob = await buildPdf(longAr, { profile: AR_PROFILE, atsMode: false, template })
      const pdf = await readPdf(new Uint8Array(await blob.arrayBuffer()))

      expect(pdf.offPage, `${template} drew text outside the page`).toEqual([])
    })

    it(`spills onto a second page instead of overflowing the first, in ${template}`, async () => {
      const blob = await buildPdf(longAr, { profile: AR_PROFILE, atsMode: false, template })
      const pdf = await readPdf(new Uint8Array(await blob.arrayBuffer()))

      expect(pdf.pages.length).toBeGreaterThan(1)

      // Every job reaches the file, including the ones past the first page.
      for (const job of longAr.experience) {
        expect(pdf.text, `"${job.role}" did not reach the file`).toContain(job.role)
      }
      // And the section that comes after the long one is still there.
      expect(pdf.text).toContain('Universidad Nacional de La Plata')
    })
  }
})

/**
 * The same rule pushed until it cannot be satisfied on two pages at all.
 *
 * A career this long is unusual; the point is that the number of pages has to
 * follow the amount of content, however much there is. An A4 page at 10pt holds
 * around 57 lines, and the templates draw at most two runs on a line (a bullet
 * and its mark, a job title and its dates), so anything past ~120 runs on one
 * page is text printed on top of other text.
 */
describe('the page count follows the content, however long it gets', () => {
  const RUNS_AN_A4_PAGE_CAN_HOLD = 120

  const twentyJobs = {
    ...longAr,
    experience: Array.from({ length: 20 }, (_, job) => ({
      id: `exp-${job + 1}`,
      role: `Analista administrativa ${job + 1}`,
      company: `Distribuidora ${job + 1}`,
      startDate: `${1990 + job}-03`,
      endDate: `${1991 + job}-11`,
      bullets: Array.from(
        { length: 4 },
        (_, bullet) => `Gestioné ${bullet + 1}0 cuentas del puesto ${job + 1} con cierre mensual.`,
      ),
    })),
  }

  for (const template of ['harvard', 'modern'] as const) {
    it(`does not pile twenty jobs onto one sheet, in ${template}`, async () => {
      const blob = await buildPdf(twentyJobs, { profile: AR_PROFILE, atsMode: false, template })
      const pdf = await readPdf(new Uint8Array(await blob.arrayBuffer()))

      expect(pdf.offPage, `${template} drew text outside the page`).toEqual([])
      for (const [index, page] of pdf.pages.entries()) {
        expect(page.length, `${template} crammed page ${index + 1}`).toBeLessThanOrEqual(
          RUNS_AN_A4_PAGE_CAN_HOLD,
        )
      }
    })
  }
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
