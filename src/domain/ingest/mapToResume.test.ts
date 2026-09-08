import { describe, expect, it } from 'vitest'
import { mapToResume } from './mapToResume'

/** A one-column resume as the extractor would hand it over, line by line. */
const extracted = [
  'Ana Gómez Ruiz',
  'Gestión administrativa · Atención al cliente',
  'La Plata, Buenos Aires | 221 555-0100 | anagomez1992@example.com',
  'linkedin.com/in/ana-gomez-ruiz',
  'PERFIL PROFESIONAL',
  'Profesional administrativa con seis años de experiencia en atención al cliente y gestión documental.',
  'EXPERIENCIA LABORAL',
  'Administrativa comercial - Distribuidora del Este',
  'marzo 2021 - actualidad',
  '- Encargada de la atención al cliente en mostrador.',
  '- Responsable del archivo de expedientes.',
  'EDUCACIÓN',
  'Bachiller en Economía y Administración',
  'Escuela Secundaria N.º 12',
  'HABILIDADES',
  'Atención al cliente · Facturación · Excel',
  'IDIOMAS',
  'Español (Nativo)',
  'Inglés (Intermedio)',
]

describe('mapToResume finds the fields worth finding', () => {
  const draft = mapToResume(extracted)

  it('picks up the name and the headline', () => {
    expect(draft.fullName).toBe('Ana Gómez Ruiz')
    expect(draft.headline).toBe('Gestión administrativa · Atención al cliente')
  })

  it('picks up the contact details wherever they sit', () => {
    expect(draft.email).toBe('anagomez1992@example.com')
    expect(draft.phone).toContain('555-0100')
    expect(draft.linkedin).toBe('linkedin.com/in/ana-gomez-ruiz')
  })

  it('routes each block to its section', () => {
    expect(draft.summary).toContain('seis años de experiencia')
    expect(draft.experienceText).toContain('Distribuidora del Este')
    expect(draft.educationText).toContain('Bachiller')
    expect(draft.languagesText).toContain('Inglés')
  })

  it('splits skills written on one line', () => {
    expect(draft.skills).toEqual(['Atención al cliente', 'Facturación', 'Excel'])
  })
})

describe('it recognises the headings people actually write', () => {
  it('matches without accents, in any case, and in English', () => {
    for (const heading of ['EXPERIENCIA', 'Experiencia Laboral', 'experiencia profesional', 'WORK EXPERIENCE']) {
      const draft = mapToResume(['Ana Gómez Ruiz', heading, 'Cajera en Supermercado Sur'])
      expect(draft.experienceText, `heading "${heading}" was not recognised`).toContain(
        'Supermercado Sur',
      )
    }
  })

  it('does not mistake a long sentence for a heading', () => {
    const draft = mapToResume([
      'Ana Gómez Ruiz',
      'Mi experiencia laboral incluye seis años en atención al cliente y ventas',
    ])
    expect(draft.experienceText).toBe('')
  })
})

/**
 * The rule that keeps the importer honest: guesswork is allowed, losing the
 * person's text is not.
 */
describe('nothing is dropped in silence', () => {
  it('keeps unplaced lines in leftovers', () => {
    const draft = mapToResume([
      'Ana Gómez Ruiz',
      'Gestión administrativa',
      'Disponibilidad para viajar y turnos rotativos',
      'Referencias a pedido',
    ])
    expect(draft.leftovers).toContain('Disponibilidad para viajar y turnos rotativos')
    expect(draft.leftovers).toContain('Referencias a pedido')
  })

  it('does not put the name or the headline in leftovers', () => {
    const draft = mapToResume(extracted)
    expect(draft.leftovers).not.toContain('Ana Gómez Ruiz')
  })
})

/**
 * What it returns as a phone has to be a phone. A wrong number is worse than no
 * number: the person applies and waits for a call that cannot arrive.
 */
describe('the phone it finds is a phone', () => {
  it('does not read a pair of years as a phone number', () => {
    const draft = mapToResume([
      'Ana Gómez Ruiz',
      'EXPERIENCIA LABORAL',
      'Administrativa comercial 2018 2021',
    ])
    expect(draft.phone).toBe('')
  })

  it('prefers the line that announces one', () => {
    const draft = mapToResume([
      'Ana Gómez Ruiz',
      'Administrativa comercial 2018 2021',
      'Tel: 221 555-0100',
    ])
    expect(draft.phone).toContain('555-0100')
  })
})

/** Printing the name in capitals is the most common way a resume opens. */
describe('it reads a name written in capitals', () => {
  it('takes an all-caps line as the name', () => {
    const draft = mapToResume(['ANA GÓMEZ RUIZ', 'Administrativa comercial'])
    expect(draft.fullName).toBe('ANA GÓMEZ RUIZ')
  })

  it('keeps the particles of a longer name together', () => {
    const draft = mapToResume(['Ana de la Torre Gómez', 'Administrativa comercial'])
    expect(draft.fullName).toBe('Ana de la Torre Gómez')
  })

  it('does not mistake the document title for the name', () => {
    const draft = mapToResume(['CURRICULUM VITAE', 'Ana Gómez Ruiz'])
    expect(draft.fullName).toBe('Ana Gómez Ruiz')
  })
})

describe('it degrades without crashing', () => {
  it('handles an empty document', () => {
    const draft = mapToResume([])
    expect(draft.fullName).toBe('')
    expect(draft.leftovers).toEqual([])
  })

  it('handles a document with no recognisable name', () => {
    const draft = mapToResume(['curriculum vitae 2026', 'tel 221 555 0100'])
    expect(draft.fullName).toBe('')
    expect(draft.phone).toContain('555')
  })
})
