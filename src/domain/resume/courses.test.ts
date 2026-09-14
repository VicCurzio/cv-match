import { describe, expect, it } from 'vitest'
import { cleanAr } from '@/test/fixtures'
import { emptyResume, resumeSchema } from './resumeSchema'
import { parseCopy } from './storage'

/**
 * Courses are separate from formal education on purpose: a secondary school
 * diploma listed beside a two-day workshop makes the schooling look padded and
 * buries the training that is recent and relevant.
 */
describe('the courses section is its own thing', () => {
  it('starts empty on a new resume', () => {
    expect(emptyResume().courses).toEqual([])
  })

  it('keeps the detail field optional', () => {
    const parsed = resumeSchema.parse({
      ...cleanAr,
      courses: [{ id: 'c1', title: 'Excel avanzado', institution: 'Coursera', inProgress: false }],
    })
    expect(parsed.courses[0]?.detail).toBeUndefined()
  })

  it('rejects a malformed date like every other section', () => {
    const result = resumeSchema.safeParse({
      ...cleanAr,
      courses: [{ id: 'c1', title: 'X', institution: 'Y', endDate: '12/2024', inProgress: false }],
    })
    expect(result.success).toBe(false)
  })
})

/**
 * Nobody remembers the month of a three-hour training. Demanding `AAAA-MM`
 * pushed people to invent a month or to leave the date off, and a course with
 * no date reads as older than it is.
 */
describe('a course may carry only a year', () => {
  const withYear = (endDate: string) => ({
    ...cleanAr,
    courses: [{ id: 'c1', title: 'Cooperativismo', institution: 'Credicoop', endDate, inProgress: false }],
  })

  it('accepts the year on its own', () => {
    expect(resumeSchema.safeParse(withYear('2025')).success).toBe(true)
  })

  it('still accepts the year and the month', () => {
    expect(resumeSchema.safeParse(withYear('2025-03')).success).toBe(true)
  })

  it('rejects anything else', () => {
    for (const bad of ['25', '2025-13', '2025-3', 'marzo 2025', '2025/03']) {
      expect(resumeSchema.safeParse(withYear(bad)).success, bad).toBe(false)
    }
  })

  it('keeps the month required on a job, where it is known and it is read', () => {
    const result = resumeSchema.safeParse({
      ...cleanAr,
      experience: [{ ...cleanAr.experience[0]!, startDate: '2021' }],
    })
    expect(result.success).toBe(false)
  })
})

/**
 * The migration case, and the reason `courses` has a default instead of being
 * required: every resume already sitting in someone's browser was written
 * before this section existed. A required field would fail validation on load
 * and the resume would silently disappear.
 */
describe('a resume saved before this section existed still loads', () => {
  const older = { ...cleanAr } as Record<string, unknown>
  delete older['courses']

  it('parses, with an empty course list', () => {
    const parsed = resumeSchema.parse(older)
    expect(parsed.courses).toEqual([])
  })

  it('imports from a .json that has no courses key', () => {
    const result = parseCopy(JSON.stringify(older))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.cvs[0]?.resumes.es.courses).toEqual([])
  })

  it('does not lose anything else in the process', () => {
    const parsed = resumeSchema.parse(older)
    expect(parsed.experience).toEqual(cleanAr.experience)
    expect(parsed.education).toEqual(cleanAr.education)
  })
})

describe('language abilities', () => {
  it('a language saved before abilities existed still loads', () => {
    const saved = { ...cleanAr, languages: [{ id: 'l', name: 'Inglés', level: 'B1' }] }
    expect(resumeSchema.safeParse(saved).success).toBe(true)
  })

  it('rejects an ability the app does not know', () => {
    const saved = { ...cleanAr, languages: [{ id: 'l', name: 'Inglés', level: 'B1', abilities: ['singing'] }] }
    expect(resumeSchema.safeParse(saved).success).toBe(false)
  })
})
