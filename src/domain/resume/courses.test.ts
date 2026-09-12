import { describe, expect, it } from 'vitest'
import { cleanAr } from '@/test/fixtures'
import { emptyResume, resumeSchema } from './resumeSchema'
import { parseResumeJson } from './storage'

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
    const result = parseResumeJson(JSON.stringify(older))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.resume.courses).toEqual([])
  })

  it('does not lose anything else in the process', () => {
    const parsed = resumeSchema.parse(older)
    expect(parsed.experience).toEqual(cleanAr.experience)
    expect(parsed.education).toEqual(cleanAr.education)
  })
})
