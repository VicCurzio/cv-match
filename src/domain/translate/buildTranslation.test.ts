import { describe, expect, it } from 'vitest'
import type { Resume } from '@/domain/resume/resumeSchema'
import { listSegments, resolveTranslation, translationSchema, writeSegment } from '@/domain/resume/translation'
import { buildTranslation, type TranslateText } from './buildTranslation'
import { hoursDetail } from './glossary'

/**
 * A resume shaped like a real one: Argentine job titles, a bank, a system name
 * a translator would mangle, figures in the bullets.
 */
const base: Resume = {
  personal: {
    fullName: 'Laura Pérez',
    headline: 'Administrativa · Atención al cliente',
    email: 'laura.perez@example.com',
    phone: '221 555-0199',
    city: 'La Plata',
    province: 'Buenos Aires',
  },
  summary: 'Administrativa con experiencia en Banco Cooperativo y manejo de Veraz y Nosis.',
  experience: [
    {
      id: 'exp-bank',
      role: 'Auxiliar administrativa',
      company: 'Banco Cooperativo',
      startDate: '2025-02',
      endDate: '2025-11',
      bullets: ['Atendí entre 20 y 40 clientes por día en Banco Cooperativo.', 'Operé caja y abrí cuentas.'],
    },
    {
      id: 'exp-odd',
      role: 'Asistente de organización y atención al público',
      company: 'Instituto Privado',
      startDate: '2014-11',
      endDate: '2015-11',
      bullets: [],
    },
  ],
  education: [{ id: 'edu-1', title: 'Tecnicatura en Turismo', institution: 'Universidad de Belgrano', inProgress: true }],
  courses: [{ id: 'c-1', title: 'Prevención de lavado de activos', institution: 'Banco Cooperativo', endDate: '2025', inProgress: false, detail: '56,5 horas' }],
  skills: ['Excel', 'Atención al cliente', 'Trabajo bajo presión'],
  languages: [
    { id: 'l-es', name: 'Español', level: 'Nativo' },
    { id: 'l-en', name: 'Inglés', level: 'A2 - lectura y comprensión' },
  ],
}

/**
 * A stand-in for the browser's translator: it tags what it translated and keeps
 * markers and figures, like a well-behaved engine. Tests that need a badly
 * behaved one build their own.
 */
const fakeTranslate: TranslateText = async (text) => `EN(${text})`

describe('translating a resume', () => {
  it('maps job titles to the equivalent that exists in English, instead of translating them', async () => {
    const layer = await buildTranslation(base, undefined, fakeTranslate)
    const { resume } = resolveTranslation(base, layer)
    expect(resume.experience[0]?.role).toBe('Administrative Assistant')
    expect(resume.personal.headline).toBe('Administrative Assistant · Customer service')
  })

  it('translates a title it does not know, and marks it for review', async () => {
    const layer = await buildTranslation(base, undefined, fakeTranslate)
    const rows = listSegments(base, layer)
    const odd = rows.find((row) => row.path.kind === 'role' && 'id' in row.path && row.path.id === 'exp-odd')
    expect(odd?.text).toBe('EN(Asistente de organización y atención al público)')
    expect(odd?.review).toBe('title-not-in-glossary')
  })

  it('never translates the person, the companies, the institutions or known systems', async () => {
    const layer = await buildTranslation(base, undefined, fakeTranslate)
    const { resume } = resolveTranslation(base, layer)
    expect(resume.summary).toBe('EN(Administrativa con experiencia en Banco Cooperativo y manejo de Veraz y Nosis.)')
    expect(resume.experience[0]?.bullets[0]).toContain('Banco Cooperativo')
    expect(resume.skills).toContain('Excel')
    // Facts are not part of the translation at all.
    expect(resume.experience[0]?.company).toBe('Banco Cooperativo')
    expect(resume.education[0]?.institution).toBe('Universidad de Belgrano')
    expect(resume.personal.fullName).toBe('Laura Pérez')
  })

  it('keeps a degree in Spanish with its meaning beside it', async () => {
    const layer = await buildTranslation(base, undefined, fakeTranslate)
    expect(resolveTranslation(base, layer).resume.education[0]?.title).toBe(
      'Tecnicatura en Turismo (EN(Tecnicatura en Turismo))',
    )
  })

  it('maps languages, levels and course hours without the translator', async () => {
    const calls: string[] = []
    const counting: TranslateText = async (text) => {
      calls.push(text)
      return `EN(${text})`
    }
    const layer = await buildTranslation(base, undefined, counting)
    const { resume } = resolveTranslation(base, layer)
    expect(resume.languages.map((l) => [l.name, l.level])).toEqual([
      ['Spanish', 'Native'],
      ['English', 'A2, EN(lectura y comprensión)'],
    ])
    expect(resume.courses[0]?.detail).toBe('56.5 hours')
    expect(calls).not.toContain('Español')
    expect(calls).not.toContain('56,5 horas')
  })

  it('marks a translation that changed a figure', async () => {
    const sloppy: TranslateText = async (text) => text.replace('40', '45')
    const layer = await buildTranslation(base, undefined, sloppy)
    const bullet = listSegments(base, layer).find((row) => row.source.startsWith('Atendí'))
    expect(bullet?.review).toBe('numbers-changed')
  })

  it('marks a translation that lost a protected name, and does not lose the text', async () => {
    const eatsMarkers: TranslateText = async (text) => text.replace(/\[\d+\]/g, 'something')
    const layer = await buildTranslation(base, undefined, eatsMarkers)
    const summary = listSegments(base, layer).find((row) => row.path.kind === 'summary')
    expect(summary?.review).toBe('protected-term-lost')
    expect(summary?.text).toContain('Banco Cooperativo')
  })

  it('produces a layer the storage schema accepts', async () => {
    const layer = await buildTranslation(base, undefined, fakeTranslate)
    expect(translationSchema.safeParse(layer).success).toBe(true)
  })
})

/**
 * The reason the translation is a layer: the Spanish resume stays the source of
 * truth, and the English one follows it.
 */
describe('the English resume follows the Spanish one', () => {
  it('a corrected date or company reaches the English resume with nothing re-translated', async () => {
    const layer = await buildTranslation(base, undefined, fakeTranslate)
    const corrected: Resume = {
      ...base,
      experience: base.experience.map((item, i) => (i === 0 ? { ...item, endDate: '2026-08', company: 'Banco Cooperativo Ltdo.' } : item)),
    }
    const { resume, pending } = resolveTranslation(corrected, layer)
    expect(resume.experience[0]?.endDate).toBe('2026-08')
    expect(resume.experience[0]?.company).toBe('Banco Cooperativo Ltdo.')
    expect(pending).toEqual([])
  })

  it('a Spanish text changed after translating shows in Spanish and is listed, never the stale English', async () => {
    const layer = await buildTranslation(base, undefined, fakeTranslate)
    const edited: Resume = { ...base, summary: 'Otro perfil, escrito después.' }
    const { resume, pending } = resolveTranslation(edited, layer)
    expect(resume.summary).toBe('Otro perfil, escrito después.')
    expect(pending.map((row) => [row.path.kind, row.state])).toEqual([['summary', 'changed']])
  })

  it('translating again only sends what changed, and keeps edits made by hand', async () => {
    const first = await buildTranslation(base, undefined, fakeTranslate)
    const edited = writeSegment(base, first, { kind: 'headline' }, { source: base.personal.headline, text: 'Customer Service Pro' })
    const changed: Resume = { ...base, summary: 'Otro perfil.' }

    const calls: string[] = []
    const again = await buildTranslation(changed, edited, async (text) => {
      calls.push(text)
      return `EN(${text})`
    })
    expect(calls).toEqual(['Otro perfil.'])
    const { resume, pending } = resolveTranslation(changed, again)
    expect(resume.personal.headline).toBe('Customer Service Pro')
    expect(resume.summary).toBe('EN(Otro perfil.)')
    expect(pending).toEqual([])
  })

  it('a bullet removed in Spanish does not leave its translation behind when rewritten', async () => {
    const layer = await buildTranslation(base, undefined, fakeTranslate)
    const fewer: Resume = {
      ...base,
      experience: base.experience.map((item, i) => (i === 0 ? { ...item, bullets: ['Operé caja y abrí cuentas.'] } : item)),
    }
    const rewritten = writeSegment(fewer, layer, { kind: 'bullet', id: 'exp-bank' }, { source: 'Operé caja y abrí cuentas.', text: 'Handled the cash desk.' })
    expect(rewritten.experience['exp-bank']?.bullets.map((s) => s.source)).toEqual(['Operé caja y abrí cuentas.'])
  })

  it('with no layer at all, everything is pending and the resume is the Spanish one', () => {
    const { resume, pending } = resolveTranslation(base, undefined)
    expect(resume).toEqual(base)
    expect(pending.every((row) => row.state === 'missing')).toBe(true)
    expect(pending.length).toBeGreaterThan(10)
  })
})

describe('what the English editor shows', () => {
  it('an English text erased by hand is not a translation: the Spanish prints until it is written again', () => {
    const erased = writeSegment(base, undefined, { kind: 'summary' }, { source: base.summary, text: '  ' })
    const summaryRow = listSegments(base, erased).find((row) => row.path.kind === 'summary')
    expect(summaryRow?.state).toBe('missing')
    expect(resolveTranslation(base, erased).resume.summary).toBe(base.summary)
  })

  it('a text whose Spanish changed offers its old English to fix, without printing it', () => {
    const layer = writeSegment(base, undefined, { kind: 'summary' }, { source: base.summary, text: 'Old English.' })
    const changed: Resume = { ...base, summary: 'Un perfil nuevo.' }
    const summaryRow = listSegments(changed, layer).find((row) => row.path.kind === 'summary')
    expect(summaryRow).toMatchObject({ state: 'changed', text: null, previous: 'Old English.' })
    expect(resolveTranslation(changed, layer).resume.summary).toBe('Un perfil nuevo.')
  })
})

describe('course hours', () => {
  it.each([
    ['56,5 horas', '56.5 hours'],
    ['14 horas', '14 hours'],
    ['1 hora', '1 hour'],
    ['40 hs', '40 hours'],
  ])('%s becomes %s', (spanish, english) => {
    expect(hoursDetail(spanish)).toBe(english)
  })

  it('leaves anything else to the translator', () => {
    expect(hoursDetail('Certificado N.º 1234')).toBeNull()
  })
})
