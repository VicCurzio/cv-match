import { describe, expect, it } from 'vitest'
import { cleanAr } from '@/test/fixtures'
import { BODY_PLACEHOLDER, draftLetter, isUnwritten, letterDate } from './letterModel'

const input = { role: 'Analista administrativa', company: 'Banco Credicoop' }

describe('draftLetter fills in only what the resume already says', () => {
  const letter = draftLetter(cleanAr, input)

  it('names the job and the company', () => {
    expect(letter.opening).toContain('Analista administrativa')
    expect(letter.opening).toContain('Banco Credicoop')
  })

  it('takes the current position from the resume', () => {
    expect(letter.opening).toContain(cleanAr.experience[0]!.role)
    expect(letter.opening).toContain(cleanAr.experience[0]!.company)
  })

  it('lists at most three skills, joined the Spanish way', () => {
    expect(letter.opening).toContain('Excel avanzado, Tango Gestión y Cuentas corrientes')
  })

  it('falls back to a neutral recipient', () => {
    expect(letter.recipient).toBe('Equipo de Selección')
    expect(draftLetter(cleanAr, { ...input, recipient: 'Lic. Pérez' }).recipient).toBe('Lic. Pérez')
  })

  it('is deterministic: same input, same letter', () => {
    expect(draftLetter(cleanAr, input)).toEqual(draftLetter(cleanAr, input))
  })
})

/**
 * The line this feature will not cross (ADR 0003). A paragraph that sounds
 * right but nobody wrote is worse than a blank one, because it gets sent and
 * then has to be defended in an interview.
 */
describe('it never writes the paragraph that is the writer\'s', () => {
  it('leaves the body as a marked placeholder', () => {
    expect(draftLetter(cleanAr, input).body).toBe(BODY_PLACEHOLDER)
  })

  it('recognises an unwritten letter so the export can be blocked', () => {
    const letter = draftLetter(cleanAr, input)
    expect(isUnwritten(letter)).toBe(true)
    expect(isUnwritten({ ...letter, body: '   ' })).toBe(true)
    expect(isUnwritten({ ...letter, body: 'Me interesa el puesto porque...' })).toBe(false)
  })
})

describe('it degrades without inventing', () => {
  it('handles a resume with no experience loaded', () => {
    const letter = draftLetter({ ...cleanAr, experience: [] }, input)
    expect(letter.opening).toContain('Cuento con experiencia')
    expect(letter.opening).not.toContain('undefined')
  })

  it('handles a resume with no skills loaded', () => {
    const letter = draftLetter({ ...cleanAr, skills: [] }, input)
    expect(letter.opening).not.toContain('con experiencia en .')
  })

  it('marks the job when it has not been typed yet', () => {
    expect(draftLetter(cleanAr, { role: '', company: '' }).opening).toContain('[puesto]')
  })
})

describe('letterDate writes a business date in full', () => {
  it('includes the city, the day, the month in words and the year', () => {
    expect(letterDate('La Plata', new Date(2026, 8, 7))).toBe('La Plata, 7 de septiembre de 2026')
  })

  it('drops the city when there is none', () => {
    expect(letterDate('', new Date(2026, 0, 1))).toBe('1 de enero de 2026')
  })
})
