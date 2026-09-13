import { describe, expect, it } from 'vitest'
import { cleanAr } from '@/test/fixtures'
import { fileName, languageLevel } from './format'

describe('file names', () => {
  it('names the base resume after the person', () => {
    expect(fileName(cleanAr)).toBe('Ana-Gómez-Ruiz-CV.pdf')
  })

  it('adds the company for a version, so five applications are five different files', () => {
    expect(fileName(cleanAr, 'Banco Columbia')).toBe('Ana-Gómez-Ruiz-CV-Banco-Columbia.pdf')
  })

  it('names the letter the same way', () => {
    expect(fileName(cleanAr, 'Banco Columbia', 'Carta')).toBe('Ana-Gómez-Ruiz-Carta-Banco-Columbia.pdf')
  })

  it('drops characters a file system or a mail client would mangle', () => {
    expect(fileName(cleanAr, 'Pérez & Hijos S.A.')).toBe('Ana-Gómez-Ruiz-CV-Pérez-Hijos-SA.pdf')
  })
})

describe('language level', () => {
  const english = { id: 'l', name: 'Inglés', level: 'A2' }

  it('prints the level alone when nothing is qualified', () => {
    expect(languageLevel(english)).toBe('A2')
    expect(languageLevel({ ...english, abilities: [] })).toBe('A2')
  })

  it('names what the person can do when it is less than everything', () => {
    expect(languageLevel({ ...english, abilities: ['listening', 'reading'] })).toBe(
      'A2, lectura y comprensión oral',
    )
  })

  it('keeps a fixed order whatever order the boxes were ticked in', () => {
    expect(languageLevel({ ...english, abilities: ['writing', 'reading'] })).toBe('A2, lectura y escritura')
  })

  it('all four abilities say nothing the level does not, so they are left out', () => {
    expect(
      languageLevel({ ...english, abilities: ['reading', 'listening', 'speaking', 'writing'] }),
    ).toBe('A2')
  })

  it('works without a level too', () => {
    expect(languageLevel({ ...english, level: '', abilities: ['reading'] })).toBe('lectura')
  })

  /*
   * The middle dot is a line-break opportunity for react-pdf, and at the end of
   * a line it draws a stray hyphen after it. That already happened once with
   * the skills; the separator here is a comma for the same reason.
   */
  it('never uses a middle dot as a separator', () => {
    expect(languageLevel({ ...english, abilities: ['reading'] })).not.toContain('·')
  })
})
