import { describe, expect, it } from 'vitest'
import { administrativeAr } from '@/test/fixtures'
import { AR_PROFILE, INTL_PROFILE, applyProfile, forbiddenFields } from './marketProfile'

describe('applyProfile strips what the market forbids', () => {
  it('keeps the photo and the document number in Argentina', () => {
    const result = applyProfile(administrativeAr, AR_PROFILE, { atsMode: false })
    expect(result.personal.photo).toBeDefined()
    expect(result.personal.documentId).toBeDefined()
  })

  it('removes photo, document number and birth date abroad', () => {
    const result = applyProfile(administrativeAr, INTL_PROFILE, { atsMode: false })
    expect(result.personal.photo).toBeUndefined()
    expect(result.personal.documentId).toBeUndefined()
    expect(result.personal.birthDate).toBeUndefined()
  })

  it('removes the photo in ATS mode even where the market allows it', () => {
    const result = applyProfile(administrativeAr, AR_PROFILE, { atsMode: true })
    expect(result.personal.photo).toBeUndefined()
    // The rest of the local data stays: ATS mode is about the reader, not the country.
    expect(result.personal.documentId).toBeDefined()
  })
})

describe('the user data is never destroyed', () => {
  it('does not mutate the resume it was given', () => {
    const before = JSON.stringify(administrativeAr)
    applyProfile(administrativeAr, INTL_PROFILE, { atsMode: true })
    expect(JSON.stringify(administrativeAr)).toBe(before)
  })

  it('brings a field back when switching to a market that allows it', () => {
    const abroad = applyProfile(administrativeAr, INTL_PROFILE, { atsMode: false })
    expect(abroad.personal.photo).toBeUndefined()

    // The source of truth was untouched, so going back restores everything.
    const home = applyProfile(administrativeAr, AR_PROFILE, { atsMode: false })
    expect(home.personal.photo).toBe(administrativeAr.personal.photo)
  })
})

describe('the profile is data, not branching', () => {
  it('lists the forbidden fields from the profile object itself', () => {
    expect(forbiddenFields(AR_PROFILE)).toEqual([])
    expect(forbiddenFields(INTL_PROFILE)).toContain('photo')
  })

  it('gives every restricted field a reason to show the user', () => {
    for (const field of forbiddenFields(INTL_PROFILE)) {
      expect(INTL_PROFILE.reasons[field], `${field} has no reason`).toBeTruthy()
    }
  })
})
