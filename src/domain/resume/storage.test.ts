import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanAr } from '@/test/fixtures'
import { defaultSettings } from './settings'
import {
  DOCUMENT_VERSION,
  documentSchema,
  loadDocument,
  parseResumeJson,
  type StoredDocument,
} from './storage'
import { createVersion, patchOverrides } from './versions'

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

const storedDocument = {
  schemaVersion: 1,
  settings: { market: 'AR', atsMode: false, template: 'modern' },
  activeLocale: 'es',
  resumes: { es: cleanAr },
}

afterEach(() => {
  vi.unstubAllGlobals()
})

/**
 * The failure that costs the resume. A saved document that cannot be read used
 * to be indistinguishable from an empty browser: the app started blank and the
 * autosave replaced the original within half a second, with nothing on screen.
 */
describe('an unreadable saved document is not treated as an empty one', () => {
  it('reads a good document back', () => {
    const { api } = fakeStorage({ 'cv-match:document': JSON.stringify(storedDocument) })
    vi.stubGlobal('localStorage', api)

    const result = loadDocument()
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.doc.resumes.es.personal.fullName).toBe(cleanAr.personal.fullName)
    }
  })

  it('reports an empty browser as empty', () => {
    vi.stubGlobal('localStorage', fakeStorage().api)
    expect(loadDocument().status).toBe('empty')
  })

  it('hands back text that is not json instead of discarding it', () => {
    const { api } = fakeStorage({ 'cv-match:document': 'esto no es json' })
    vi.stubGlobal('localStorage', api)

    const result = loadDocument()
    expect(result.status).toBe('unreadable')
    if (result.status === 'unreadable') expect(result.raw).toBe('esto no es json')
  })

  it('hands back a document whose shape no longer validates', () => {
    const fromTheFuture = JSON.stringify({ ...storedDocument, schemaVersion: 99 })
    const { api } = fakeStorage({ 'cv-match:document': fromTheFuture })
    vi.stubGlobal('localStorage', api)

    const result = loadDocument()
    expect(result.status).toBe('unreadable')
  })

  it('puts the unreadable text aside before the autosave can overwrite it', () => {
    const { api, store } = fakeStorage({ 'cv-match:document': 'esto no es json' })
    vi.stubGlobal('localStorage', api)

    loadDocument()
    expect(store.get('cv-match:unreadable')).toBe('esto no es json')
  })
})

/**
 * Feature 0011 raised the saved shape to version 2. `schemaVersion` is a
 * literal, so every document written before that day stops validating the
 * moment the number changes -- and a document that does not validate is set
 * aside as unreadable and overwritten by the autosave. That is every existing
 * user's resume, lost on one deploy.
 */
describe('a document saved before versions existed still loads', () => {
  it('loads a version 1 document whole, as a base with no versions', () => {
    const { api } = fakeStorage({ 'cv-match:document': JSON.stringify(storedDocument) })
    vi.stubGlobal('localStorage', api)

    const result = loadDocument()
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') return
    expect(result.doc.schemaVersion).toBe(DOCUMENT_VERSION)
    expect(result.doc.resumes.es).toEqual(cleanAr)
    expect(result.doc.settings).toEqual(storedDocument.settings)
    expect(result.doc.versions).toEqual([])
    expect(result.doc.activeVersionId).toBeNull()
  })

  /*
   * The control that checks itself. A green run of the test above does not
   * prove the migration is doing the work: it would also be green if the
   * current schema simply still accepted version 1. This is what shows it does
   * not -- so if the upgrade step is removed, the test above has to fail.
   */
  it('the current schema alone rejects that same document', () => {
    expect(documentSchema.safeParse(storedDocument).success).toBe(false)
  })
})

describe('versions survive export and import', () => {
  const version = patchOverrides(
    createVersion({ id: 'ver-1', company: 'Banco Columbia', role: 'Oficial' }, defaultSettings()),
    { headline: 'Atención al cliente en banca', hiddenCourses: ['course-1'] },
  )
  const withVersions: StoredDocument = {
    schemaVersion: DOCUMENT_VERSION,
    settings: defaultSettings(),
    activeLocale: 'es',
    resumes: { es: cleanAr },
    versions: [
      { ...version, letter: { recipient: '', body: 'Trabajé en sucursal.' } },
      { ...version, id: 'ver-2', company: 'Otra empresa' },
    ],
    activeVersionId: 'ver-2',
  }

  it('imports a whole export with its versions, instead of keeping only the base', () => {
    const result = parseResumeJson(JSON.stringify(withVersions))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.document).toEqual(withVersions)
  })

  it('reads back what it saved', () => {
    const { api } = fakeStorage({ 'cv-match:document': JSON.stringify(withVersions) })
    vi.stubGlobal('localStorage', api)

    const result = loadDocument()
    expect(result.status === 'ok' && result.doc).toEqual(withVersions)
  })

  it('a bare resume imports as a base, with no document to replace the versions', () => {
    const result = parseResumeJson(JSON.stringify(cleanAr))
    expect(result.ok && result.document).toBeFalsy()
  })
})
