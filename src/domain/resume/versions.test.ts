import { describe, expect, it } from 'vitest'
import { cleanAr } from '@/test/fixtures'
import type { Resume } from './resumeSchema'
import { defaultSettings } from './settings'
import {
  createVersion,
  orderedSkills,
  overridesSchema,
  patchOverrides,
  resolveVersion,
  toggleHidden,
  versionSchema,
  type Version,
} from './versions'

function versionFor(patch: Parameters<typeof patchOverrides>[1] = {}): Version {
  const version = createVersion(
    { id: 'ver-1', company: 'Banco Columbia', role: 'Oficial de atención' },
    defaultSettings(),
  )
  return patchOverrides(version, patch)
}

describe('base plus layer is the resume that gets exported', () => {
  it('without a version, the base is returned as it is', () => {
    expect(resolveVersion(cleanAr, null)).toBe(cleanAr)
  })

  it('a fresh version says exactly what the base says', () => {
    expect(resolveVersion(cleanAr, versionFor())).toEqual(cleanAr)
  })

  it('applies the headline and the summary the version rewrote', () => {
    const resolved = resolveVersion(
      cleanAr,
      versionFor({ headline: 'Atención al cliente en banca', summary: 'Otro perfil.' }),
    )
    expect(resolved.personal.headline).toBe('Atención al cliente en banca')
    expect(resolved.summary).toBe('Otro perfil.')
    // Everything else in `personal` still comes from the base.
    expect(resolved.personal.email).toBe(cleanAr.personal.email)
  })

  it('hides the items the version hid, and only those', () => {
    const resolved = resolveVersion(
      cleanAr,
      versionFor({ hiddenCourses: ['course-1'], hiddenEducation: [] }),
    )
    expect(resolved.courses).toEqual([])
    expect(resolved.education).toEqual(cleanAr.education)
  })

  it('reorders and hides skills', () => {
    const resolved = resolveVersion(
      cleanAr,
      versionFor({
        skillOrder: ['Conciliaciones', 'Excel avanzado', 'Tango Gestión', 'Cuentas corrientes'],
        hiddenSkills: ['Tango Gestión'],
      }),
    )
    expect(resolved.skills).toEqual(['Conciliaciones', 'Excel avanzado', 'Cuentas corrientes'])
  })

  it('"volver al CV base" removes the field from the layer', () => {
    const version = patchOverrides(versionFor({ summary: 'Otro perfil.' }), { summary: undefined })
    expect('summary' in version.overrides).toBe(false)
    expect(resolveVersion(cleanAr, version).summary).toBe(cleanAr.summary)
  })
})

/**
 * The reason the version is a layer and not a copy (ADR 0006): the facts live
 * once. These are the cases where the base changes underneath a version that
 * already exists, and every one of them has to fail towards showing.
 */
describe('a change in the base reaches every version', () => {
  const version = versionFor({
    headline: 'Atención al cliente en banca',
    skillOrder: ['Conciliaciones', 'Excel avanzado', 'Tango Gestión', 'Cuentas corrientes'],
    hiddenExperience: ['exp-gone'],
  })

  it('a corrected name shows up in the version', () => {
    const fixed: Resume = { ...cleanAr, personal: { ...cleanAr.personal, fullName: 'Ana Gomez Ruiz' } }
    expect(resolveVersion(fixed, version).personal.fullName).toBe('Ana Gomez Ruiz')
  })

  it('a job added to the base appears in the version: hiding is never the default', () => {
    const job = { ...cleanAr.experience[0]!, id: 'exp-new', company: 'Nueva SA' }
    const grown: Resume = { ...cleanAr, experience: [...cleanAr.experience, job] }
    expect(resolveVersion(grown, version).experience.map((item) => item.id)).toContain('exp-new')
  })

  it('a hidden id that no longer exists in the base is ignored', () => {
    expect(resolveVersion(cleanAr, version).experience).toEqual(cleanAr.experience)
  })

  it('a skill added to the base comes in at the end of the version order', () => {
    const grown: Resume = { ...cleanAr, skills: [...cleanAr.skills, 'Tesorería'] }
    expect(resolveVersion(grown, version).skills.at(-1)).toBe('Tesorería')
  })

  it('a skill renamed in the base is not lost, it reappears at the end', () => {
    const renamed: Resume = {
      ...cleanAr,
      skills: cleanAr.skills.map((skill) => (skill === 'Excel avanzado' ? 'Excel' : skill)),
    }
    const skills = resolveVersion(renamed, version).skills
    expect(skills).toContain('Excel')
    expect(skills).not.toContain('Excel avanzado')
    expect(skills).toHaveLength(cleanAr.skills.length)
  })

  it('blank lines left by the textarea are not skills', () => {
    expect(orderedSkills(['Excel', '', '  ', 'Word'], undefined)).toEqual(['Excel', 'Word'])
  })
})

/**
 * The product rule tested on the schema rather than on a screen. If the layer
 * has no key for a fact, no interface written later can store one.
 */
describe('a version has nowhere to store a different fact', () => {
  it.each([
    ['a job title', { role: 'Gerenta' }],
    ['the experience list', { experience: [] }],
    ['a contact detail', { email: 'otra@example.com' }],
    ['the personal block', { personal: { fullName: 'Otra persona' } }],
  ])('rejects %s in the layer', (_, fact) => {
    expect(overridesSchema.safeParse({ ...fact }).success).toBe(false)
  })

  it('rejects a whole resume smuggled into the version', () => {
    const version = { ...versionFor(), resume: cleanAr }
    expect(versionSchema.safeParse(version).success).toBe(false)
  })

  it('accepts the fields that only change how the resume is told', () => {
    const layer = {
      headline: 'x',
      summary: 'y',
      skillOrder: ['Excel'],
      hiddenSkills: [],
      hiddenExperience: ['exp-1'],
      hiddenEducation: [],
      hiddenCourses: [],
    }
    expect(overridesSchema.safeParse(layer).success).toBe(true)
  })
})

describe('creating and toggling', () => {
  it('trims what the person typed and leaves an empty posting out', () => {
    const version = createVersion(
      { id: 'v', company: '  Banco Columbia ', role: ' Oficial ', posting: '   ' },
      defaultSettings(),
    )
    expect(version.company).toBe('Banco Columbia')
    expect(version.role).toBe('Oficial')
    expect('posting' in version).toBe(false)
  })

  it('copies the settings instead of sharing them', () => {
    const settings = defaultSettings()
    const version = createVersion({ id: 'v', company: 'A', role: 'B' }, settings)
    settings.atsMode = true
    expect(version.settings.atsMode).toBe(false)
  })

  it('shows and hides an item without duplicating ids', () => {
    expect(toggleHidden(['a'], 'a', false)).toEqual(['a'])
    expect(toggleHidden(['a', 'b'], 'a', true)).toEqual(['b'])
  })
})
