import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanAr } from '@/test/fixtures'
import { defaultSettings } from './settings'
import {
  DOCUMENT_VERSION,
  FIRST_CV_ID,
  LIBRARY_VERSION,
  differsFrom,
  documentSchema,
  exportCv,
  freshCv,
  isBlankCv,
  isDocumentChange,
  librarySchema,
  loadLibrary,
  parseCopy,
  upgradeLibrary,
  type StoredCv,
  type StoredDocument,
  type StoredLibrary,
} from './storage'
import { createVersion, patchOverrides } from './versions'

const settings = { market: 'AR' as const, atsMode: false, template: 'modern' as const }

/** A minimal `localStorage`, since the rules run in node. */
function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    store: data,
    api: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
      removeItem: (key: string) => void data.delete(key),
      clear: () => data.clear(),
      key: () => null,
      length: 0,
    } as unknown as Storage,
  }
}

/** Exactly what version 1 of the app saved. */
const v1Document = {
  schemaVersion: 1,
  settings,
  activeLocale: 'es',
  resumes: { es: cleanAr },
}

const withVersion = patchOverrides(createVersion({ id: 'ver-1', company: 'Banco Columbia', role: 'Oficial' }, settings), {
  headline: 'Atención al cliente en banca',
  hiddenCourses: ['course-1'],
})

/** Exactly what version 2 saved: one resume, with its versions. */
const v2Document: StoredDocument = {
  schemaVersion: DOCUMENT_VERSION,
  settings,
  activeLocale: 'es',
  resumes: { es: cleanAr },
  versions: [{ ...withVersion, letter: { recipient: '', body: 'Trabajé en sucursal.' } }],
  activeVersionId: 'ver-1',
}

const other = { ...cleanAr, personal: { ...cleanAr.personal, fullName: 'Otra Persona' } }

const library: StoredLibrary = {
  schemaVersion: LIBRARY_VERSION,
  activeCvId: 'cv-b',
  cvs: [
    { ...freshCv('cv-a', settings), resumes: { es: cleanAr }, versions: [withVersion] },
    {
      ...freshCv('cv-b', settings),
      resumes: { es: other },
      letter: { role: 'Vendedora', company: 'Tienda', recipient: '', body: 'Me interesa.' },
    },
  ],
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('a copy read from a file is validated and added, never replacing anything', () => {
  it('reads a bare resume as one resume', () => {
    const result = parseCopy(JSON.stringify(cleanAr))
    expect(result.ok && result.cvs.map((cv) => cv.resumes.es.personal.fullName)).toEqual([
      cleanAr.personal.fullName,
    ])
  })

  it('reads a version 2 copy whole, with its versions', () => {
    const result = parseCopy(JSON.stringify(v2Document))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.cvs).toHaveLength(1)
    expect(result.cvs[0]?.versions).toEqual(v2Document.versions)
  })

  it('reads a version 1 copy', () => {
    const result = parseCopy(JSON.stringify(v1Document))
    expect(result.ok && result.cvs[0]?.resumes.es).toEqual(cleanAr)
  })

  it('keeps the English layer of a resume, in the saved library and in a copy', () => {
    const translated: StoredCv = {
      ...(library.cvs[1] as StoredCv),
      activeLocale: 'en',
      translation: {
        headline: { source: 'Administrativa', text: 'Administrative Assistant' },
        summary: { source: 'Perfil.', text: 'Profile.', review: 'numbers-changed' },
        experience: {},
        education: {},
        courses: {},
        skills: [],
        languages: {},
      },
    }
    const saved = { ...library, cvs: [translated] }
    expect(librarySchema.parse(saved)).toEqual(saved)
    const result = parseCopy(JSON.stringify(exportCv(translated)))
    expect(result.ok && result.cvs).toEqual([translated])
  })

  it('a library saved before translation existed still reads as it is', () => {
    const before = JSON.parse(JSON.stringify(library)) as StoredLibrary
    expect(before.cvs.every((cv) => cv.translation === undefined)).toBe(true)
    expect(upgradeLibrary(before)).toEqual(library)
  })

  it('reads every resume of a library copy, letters included', () => {
    const result = parseCopy(JSON.stringify(library))
    expect(result.ok && result.cvs).toEqual(library.cvs)
  })

  it('leaves out resumes with nothing in them, and says so when that is all there is', () => {
    const blank = { ...library, cvs: [freshCv('cv-x', settings)] }
    const result = parseCopy(JSON.stringify(blank))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toMatch(/ningún CV con datos/)
  })

  it('rejects text that is not json', () => {
    const result = parseCopy('no soy json')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toMatch(/json/i)
  })

  it('rejects json whose shape is not a resume', () => {
    expect(parseCopy(JSON.stringify({ hola: 'mundo' })).ok).toBe(false)
  })

  it('rejects a resume with a malformed date instead of letting it through', () => {
    const broken = { ...cleanAr, experience: [{ ...cleanAr.experience[0], startDate: '03/2021' }] }
    expect(parseCopy(JSON.stringify(broken)).ok).toBe(false)
  })

  it('a downloaded copy reads back as the same resume', () => {
    const cv = library.cvs[1] as StoredCv
    const result = parseCopy(JSON.stringify(exportCv(cv)))
    expect(result.ok && result.cvs).toEqual([cv])
  })
})

/**
 * The failure that costs the resume. A saved document that cannot be read used
 * to be indistinguishable from an empty browser: the app started blank and the
 * autosave replaced the original within half a second, with nothing on screen.
 */
describe('an unreadable saved document is not treated as an empty one', () => {
  it('reads a good library back', () => {
    vi.stubGlobal('localStorage', fakeStorage({ 'cv-match:document': JSON.stringify(library) }).api)
    const result = loadLibrary()
    expect(result.status === 'ok' && result.library).toEqual(library)
  })

  it('reports an empty browser as empty', () => {
    vi.stubGlobal('localStorage', fakeStorage().api)
    expect(loadLibrary().status).toBe('empty')
  })

  it('hands back text that is not json instead of discarding it', () => {
    vi.stubGlobal('localStorage', fakeStorage({ 'cv-match:document': 'esto no es json' }).api)
    const result = loadLibrary()
    expect(result.status).toBe('unreadable')
    if (result.status === 'unreadable') expect(result.raw).toBe('esto no es json')
  })

  it('hands back a document whose shape no longer validates', () => {
    const fromTheFuture = JSON.stringify({ ...library, schemaVersion: 99 })
    vi.stubGlobal('localStorage', fakeStorage({ 'cv-match:document': fromTheFuture }).api)
    expect(loadLibrary().status).toBe('unreadable')
  })

  it('puts the unreadable text aside before the autosave can overwrite it', () => {
    const { api, store } = fakeStorage({ 'cv-match:document': 'esto no es json' })
    vi.stubGlobal('localStorage', api)
    loadLibrary()
    expect(store.get('cv-match:unreadable')).toBe('esto no es json')
  })
})

/**
 * Feature 0014 raised the saved shape to version 3. `schemaVersion` is a
 * literal, so every document written before that day stops validating the
 * moment the number changes -- and a document that does not validate is set
 * aside as unreadable and overwritten by the autosave. That is every existing
 * user's resume, lost on one deploy. Both older shapes are tested.
 */
describe('everything saved by an older version still loads', () => {
  it('a version 2 document becomes a library of one, versions and selection kept', () => {
    vi.stubGlobal('localStorage', fakeStorage({ 'cv-match:document': JSON.stringify(v2Document) }).api)
    const result = loadLibrary()
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') return
    expect(result.library.schemaVersion).toBe(LIBRARY_VERSION)
    expect(result.library.activeCvId).toBe(FIRST_CV_ID)
    expect(result.library.cvs).toHaveLength(1)
    expect(result.library.cvs[0]?.versions).toEqual(v2Document.versions)
    expect(result.library.cvs[0]?.activeVersionId).toBe('ver-1')
  })

  it('a version 1 document loads whole, as a resume with no versions', () => {
    vi.stubGlobal('localStorage', fakeStorage({ 'cv-match:document': JSON.stringify(v1Document) }).api)
    const result = loadLibrary()
    expect(result.status === 'ok' && result.library.cvs[0]?.resumes.es).toEqual(cleanAr)
    expect(result.status === 'ok' && result.library.cvs[0]?.versions).toEqual([])
  })

  /*
   * The controls that check themselves. The tests above would also pass if the
   * current schema simply still accepted the old shapes. These show it does
   * not -- so it is the upgrade that does the work, and removing it fails.
   */
  it('the current schema alone rejects both older documents', () => {
    expect(librarySchema.safeParse(v2Document).success).toBe(false)
    expect(librarySchema.safeParse(v1Document).success).toBe(false)
    expect(documentSchema.safeParse(v1Document).success).toBe(false)
  })
})

describe('a resume with nothing in it', () => {
  it('is what "Empezar uno nuevo" creates', () => {
    expect(isBlankCv(freshCv('cv', settings))).toBe(true)
  })

  it('stops being blank with a single character typed', () => {
    const cv = freshCv('cv', settings)
    expect(isBlankCv({ ...cv, resumes: { es: { ...cv.resumes.es, summary: 'A' } } })).toBe(false)
  })

  it('a version alone is content', () => {
    expect(isBlankCv({ ...freshCv('cv', settings), versions: [withVersion] })).toBe(false)
  })

  it('a letter with something written is content', () => {
    const letter = { role: '', company: '', recipient: '', body: 'Me interesa el puesto.' }
    expect(isBlankCv({ ...freshCv('cv', settings), letter })).toBe(false)
    expect(isBlankCv({ ...freshCv('cv', settings), letter: { ...letter, body: '  ' } })).toBe(true)
  })

  it('carries the start screen answers without sharing the object', () => {
    const answers = { ...settings, atsMode: true }
    const cv = freshCv('cv', answers)
    answers.atsMode = false
    expect(cv.settings.atsMode).toBe(true)
  })

  it('a new resume validates as part of a library', () => {
    const lib: StoredLibrary = { schemaVersion: LIBRARY_VERSION, activeCvId: 'cv', cvs: [freshCv('cv', defaultSettings())] }
    expect(librarySchema.safeParse(lib).success).toBe(true)
    expect(upgradeLibrary(JSON.parse(JSON.stringify(lib)))).toEqual(lib)
  })
})

describe('a change from another tab', () => {
  it('is recognised when it touches the saved library', () => {
    expect(isDocumentChange('cv-match:document')).toBe(true)
  })

  it('counts storage being cleared altogether', () => {
    expect(isDocumentChange(null)).toBe(true)
  })

  it('ignores other keys, like the set-aside unreadable copy', () => {
    expect(isDocumentChange('cv-match:unreadable')).toBe(false)
    expect(isDocumentChange('otra-app:algo')).toBe(false)
  })
})

describe('whether another tab wrote something different', () => {
  it('the same content is not a change', () => {
    expect(differsFrom(library, JSON.stringify(library))).toBe(false)
  })

  it('opening another resume, or another version, in the other tab is not a change', () => {
    const elsewhere = {
      ...library,
      activeCvId: 'cv-a',
      cvs: library.cvs.map((cv) => ({ ...cv, activeVersionId: cv.versions[0]?.id ?? null })),
    }
    expect(differsFrom(library, JSON.stringify(elsewhere))).toBe(false)
  })

  it('an edit in any resume is a change', () => {
    const edited = {
      ...library,
      cvs: library.cvs.map((cv, index) => (index === 0 ? { ...cv, resumes: { es: { ...cleanAr, summary: 'Otro.' } } } : cv)),
    }
    expect(differsFrom(library, JSON.stringify(edited))).toBe(true)
  })

  it('a resume added or deleted in the other tab is a change', () => {
    expect(differsFrom(library, JSON.stringify({ ...library, cvs: library.cvs.slice(1) }))).toBe(true)
  })

  it('cleared storage, or text that is not a library, counts as a change', () => {
    expect(differsFrom(library, null)).toBe(true)
    expect(differsFrom(library, 'no es json')).toBe(true)
    expect(differsFrom(library, JSON.stringify({ hola: 'mundo' }))).toBe(true)
  })
})
