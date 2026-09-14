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
 * The English resume is the same template with English headings. Without
 * these, a translated resume went out with "EXPERIENCIA LABORAL" over English
 * text -- the first thing an English-reading recruiter sees.
 */
describe('an English resume prints the template in English', () => {
  it.each(['harvard', 'modern'] as const)('uses English headings, months and "Present" in %s', async (template) => {
    const pdf = await render({ profile: INTL_PROFILE, atsMode: false, template, locale: 'en' })

    for (const heading of ['PROFESSIONAL SUMMARY', 'WORK EXPERIENCE', 'EDUCATION', 'SKILLS', 'LANGUAGES']) {
      expect(pdf.lines).toContain(heading)
    }
    expect(pdf.text).toContain('Present')
    expect(pdf.text).not.toContain('EXPERIENCIA LABORAL')
    expect(pdf.text).not.toContain('actualidad')
  })

  it('stays in Spanish when no language is given', async () => {
    const pdf = await render({ profile: AR_PROFILE, atsMode: false, template: 'harvard' })
    expect(pdf.lines).toContain('EXPERIENCIA LABORAL')
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
describe('courses reach the file as their own section', () => {
  const withCourse = {
    ...withPhoto,
    courses: [
      {
        id: 'c1',
        title: 'Gestión de cobranzas y recupero',
        institution: 'Cámara de Comercio',
        endDate: '2024-06',
        inProgress: false,
        detail: '40 horas',
      },
    ],
  }

  for (const template of ['harvard', 'modern'] as const) {
    it(`prints the heading, the course and its detail in ${template}`, async () => {
      const blob = await buildPdf(withCourse, {
        profile: AR_PROFILE,
        atsMode: false,
        template,
      })
      const pdf = await readPdf(new Uint8Array(await blob.arrayBuffer()))

      expect(pdf.lines).toContain('CURSOS Y CERTIFICACIONES')
      expect(pdf.text).toContain('Gestión de cobranzas y recupero')
      expect(pdf.text).toContain('40 horas')
    })
  }

  it('leaves the heading out when there are no courses', async () => {
    const pdf = await render({ profile: AR_PROFILE, atsMode: false, template: 'harvard' })
    expect(pdf.lines).not.toContain('CURSOS Y CERTIFICACIONES')
  })

  it('keeps formal education separate from it', async () => {
    const blob = await buildPdf(withCourse, {
      profile: AR_PROFILE,
      atsMode: true,
      template: 'harvard',
    })
    const pdf = await readPdf(new Uint8Array(await blob.arrayBuffer()))

    expect(pdf.lines).toContain('EDUCACIÓN')
    expect(pdf.lines).toContain('CURSOS Y CERTIFICACIONES')
    expect(pdf.lines.indexOf('EDUCACIÓN')).toBeLessThan(
      pdf.lines.indexOf('CURSOS Y CERTIFICACIONES'),
    )
  })
})

/**
 * Three layout defects a real resume produced at once, all of them visible only
 * once the document was long enough to break across pages.
 */
describe('a long resume lays out correctly', () => {
  /** Six grouped courses: enough to push a section over a page boundary. */
  const many = {
    ...withPhoto,
    courses: Array.from({ length: 6 }, (_, i) => ({
      id: `c${i}`,
      title:
        'Instrumentación de préstamos, legajo de crédito, asesoramiento comercial y habilidades de venta',
      institution: 'Banco Credicoop - Gerencia de Formación Integral',
      endDate: '2025',
      inProgress: false,
      detail: '14 horas',
    })),
  }

  /**
   * Swept across lengths on purpose.
   *
   * A single fixture is a coin flip: the first version of this test passed
   * while the real resume it was written for had "CURSOS Y CERTIFICACIONES"
   * stranded at the foot of page one, because that one fixture happened not to
   * break at a heading. Walking the content length moves the page boundary
   * across every section in turn, so some size in the sweep puts a break right
   * where a heading is.
   */
  it('never leaves a section heading alone at the foot of a page', async () => {
    for (const count of [3, 4, 5, 6, 7, 8, 9, 10]) {
      const resume = {
        ...many,
        courses: many.courses.slice(0, Math.min(count, many.courses.length)),
        experience: [
          ...administrativeAr.experience,
          ...Array.from({ length: Math.max(0, count - 4) }, (_, i) => ({
            ...administrativeAr.experience[0]!,
            id: `extra-${i}`,
          })),
        ],
      }

      const blob = await buildPdf(resume, {
        profile: AR_PROFILE,
        atsMode: true,
        template: 'harvard',
      })
      const pdf = await readPdf(new Uint8Array(await blob.arrayBuffer()))

      for (const [index, page] of pdf.pages.entries()) {
        const last = page.at(-1)?.trim() ?? ''
        const isHeading = /^[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{3,}$/.test(last)
        expect(
          isHeading,
          `with ${count} items, page ${index + 1} ends on the heading "${last}"`,
        ).toBe(false)
      }
    }
  }, 30_000)

  /**
   * A margin set on a column applies once to the block, so the continuation
   * page started hard against the top edge of the sheet. Text extraction cannot
   * see it -- the words are all there, in order -- which is why the check has to
   * be about where they land, not about what they say.
   */
  it('leaves a top margin on every page, not just the first', async () => {
    const A4 = 841.89
    const MARGIN = 51 // 18 mm

    for (const template of ['harvard', 'modern'] as const) {
      const blob = await buildPdf(many, { profile: AR_PROFILE, atsMode: false, template })
      const pdf = await readPdf(new Uint8Array(await blob.arrayBuffer()))

      expect(pdf.pages.length, `${template} needs more than one page for this test`).toBeGreaterThan(1)

      for (const [index, top] of pdf.topOfPage.entries()) {
        expect(
          top,
          `${template} page ${index + 1} draws at ${top}, above the ${MARGIN}pt margin`,
        ).toBeLessThanOrEqual(A4 - MARGIN)
      }
    }
  }, 20_000)

  it('keeps a long title from running over the date beside it', async () => {
    const blob = await buildPdf(many, { profile: AR_PROFILE, atsMode: true, template: 'harvard' })
    const pdf = await readPdf(new Uint8Array(await blob.arrayBuffer()))

    // Overlap shows up as the year fused into the title's own text run.
    const fused = pdf.lines.filter((l) => /habilidades de venta\s*2025/i.test(l))
    expect(fused).toEqual([])
    expect(pdf.text).toContain('2025')
  })

  it('separates the skills with a visible mark, not just with space', async () => {
    const pdf = await render({ profile: AR_PROFILE, atsMode: true, template: 'harvard' })

    const separators = pdf.lines.filter((l) => l.trim() === '·')
    expect(separators.length).toBe(administrativeAr.skills.length - 1)
  })
})

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

describe('a qualified language level reaches the file', () => {
  const readsEnglish = {
    ...withPhoto,
    languages: [
      { id: 'es', name: 'Español', level: 'Nativo' },
      { id: 'en', name: 'Inglés', level: 'A2', abilities: ['reading' as const, 'listening' as const] },
    ],
  }

  for (const template of ['harvard', 'modern'] as const) {
    it(`prints what the person can do in ${template}, and nothing more for the unqualified one`, async () => {
      const blob = await buildPdf(readsEnglish, { profile: AR_PROFILE, atsMode: false, template })
      const pdf = await readPdf(new Uint8Array(await blob.arrayBuffer()))

      // The Modern sidebar is narrow, so the phrase can wrap: compare with the
      // line breaks folded back into single spaces.
      const text = pdf.text.replace(/\s+/g, ' ')
      expect(text).toContain('A2, lectura y comprensión oral')
      expect(text).toContain('Nativo')
      expect(text).not.toMatch(/Nativo,/)
      // Nothing of the new text is hyphenated across a line. A run that is only
      // "-" is the bullet mark, not a split word.
      const broken = pdf.lines.filter((line) => line.trim() !== '-' && /-$/.test(line.trim()))
      expect(broken).toEqual([])
    })
  }
})
