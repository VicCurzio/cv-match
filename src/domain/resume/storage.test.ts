import { describe, expect, it } from 'vitest'
import { cleanAr } from '@/test/fixtures'
import { parseResumeJson } from './storage'

describe('imported json is validated before it reaches app state', () => {
  it('accepts a bare resume', () => {
    const result = parseResumeJson(JSON.stringify(cleanAr))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.resume.personal.fullName).toBe(cleanAr.personal.fullName)
  })

  it('accepts a full exported document', () => {
    const document = {
      schemaVersion: 1,
      settings: { market: 'AR', atsMode: false, template: 'modern' },
      activeLocale: 'es',
      resumes: { es: cleanAr },
    }
    const result = parseResumeJson(JSON.stringify(document))
    expect(result.ok).toBe(true)
  })

  it('rejects text that is not json', () => {
    const result = parseResumeJson('no soy json')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toMatch(/json/i)
  })

  it('rejects json whose shape is not a resume', () => {
    const result = parseResumeJson(JSON.stringify({ hola: 'mundo' }))
    expect(result.ok).toBe(false)
  })

  it('rejects a resume with a malformed date instead of letting it through', () => {
    const broken = { ...cleanAr, experience: [{ ...cleanAr.experience[0], startDate: '03/2021' }] }
    const result = parseResumeJson(JSON.stringify(broken))
    expect(result.ok).toBe(false)
  })
})
