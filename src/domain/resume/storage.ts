import { z } from 'zod'
import { emptyResume, resumeSchema } from './resumeSchema'
import { defaultSettings, settingsSchema } from './settings'
import { versionSchema } from './versions'

/**
 * Everything lives in the browser. There is no server to send a resume to, which
 * is how the project's central rule -- the resume never leaves the user's
 * machine -- is enforced rather than merely promised.
 */

const STORAGE_KEY = 'cv-match:document'

/**
 * Whether a `storage` event is about the saved library. The browser fires it
 * only in the OTHER tabs of the same site, never in the one that wrote, and with
 * a `null` key when storage was cleared altogether -- which also counts.
 */
export function isDocumentChange(key: string | null): boolean {
  return key === null || key === STORAGE_KEY
}

/**
 * Where an unreadable document is put aside before anything can overwrite it.
 *
 * A saved document that no longer parses -- a half-written record, or one from a
 * future schema version -- used to be treated exactly like an empty browser: the
 * app started blank and the autosave replaced it within half a second. That is
 * the single worst failure this app has, because it is silent and the resume
 * lives nowhere else.
 */
const BACKUP_KEY = 'cv-match:unreadable'

export { defaultSettings, settingsSchema, type Settings } from './settings'
import type { Settings } from './settings'

/** The shape of one resume as version 2 saved it, and as older copies still carry it. */
export const DOCUMENT_VERSION = 2

/** The shape of what is saved now: several resumes. Bumped when that shape changes, never silently. */
export const LIBRARY_VERSION = 3

const localizedResumes = z.object({
  es: resumeSchema,
  en: resumeSchema.optional(),
})

/**
 * Version 1, kept only to be read and upgraded. Every browser that used the app
 * before versions existed holds one of these.
 */
const documentV1Schema = z.object({
  schemaVersion: z.literal(1),
  settings: settingsSchema,
  activeLocale: z.enum(['es', 'en']),
  resumes: localizedResumes,
})

/**
 * Version 2: one resume and its versions. Still read -- from browsers that have
 * not opened the app since, and from every `.json` copy downloaded before
 * version 3 -- and upgraded on the way in.
 *
 * The envelope carries a resume per locale even though only `es` exists today.
 * Translation (feature 0009) needs a second version, and adding it to the shape
 * later would mean migrating whatever people already have saved.
 */
export const documentSchema = z.object({
  schemaVersion: z.literal(DOCUMENT_VERSION),
  settings: settingsSchema,
  activeLocale: z.enum(['es', 'en']),
  resumes: localizedResumes,
  versions: z.array(versionSchema),
  /** `null` is the base. An id that matches no version also falls back to it. */
  activeVersionId: z.string().nullable(),
})

export type StoredDocument = z.infer<typeof documentSchema>

/**
 * The base's own cover letter. A version keeps its letter with the version,
 * because a letter belongs to a posting; the base had nowhere to keep one, so a
 * paragraph written without a version was gone on reload.
 */
export const baseLetterSchema = z.strictObject({
  role: z.string(),
  company: z.string(),
  recipient: z.string(),
  body: z.string(),
})

export type BaseLetter = z.infer<typeof baseLetterSchema>

/** One resume in the library: a version 2 document with an id, and its base letter. */
export const cvSchema = documentSchema.omit({ schemaVersion: true }).extend({
  id: z.string(),
  letter: baseLetterSchema.optional(),
})

export type StoredCv = z.infer<typeof cvSchema>

/**
 * Version 3: several resumes in one browser (feature 0014).
 *
 * Before it, starting a second person's resume -- your own and then a
 * relative's -- meant replacing the first one. The library keeps all of them
 * and remembers which one was open.
 */
export const librarySchema = z.object({
  schemaVersion: z.literal(LIBRARY_VERSION),
  /** `null` when there is none yet. An id that matches no resume opens the first. */
  activeCvId: z.string().nullable(),
  cvs: z.array(cvSchema),
})

export type StoredLibrary = z.infer<typeof librarySchema>

/** A version 2 document as an entry of the library. */
export function documentToCv(doc: StoredDocument, id: string): StoredCv {
  const { schemaVersion: _version, ...rest } = doc
  return { ...rest, id }
}

/** A new, empty resume with the start screen's answers. */
export function freshCv(id: string, settings: Settings): StoredCv {
  return {
    id,
    settings: { ...settings },
    activeLocale: 'es',
    resumes: { es: emptyResume() },
    versions: [],
    activeVersionId: null,
  }
}

/**
 * Whether a resume holds nothing the person wrote.
 *
 * The autosave runs from the first render, so a first visit that only looked at
 * the start screen leaves an empty resume behind -- and "Empezar uno nuevo"
 * followed by closing the tab leaves another. Blank resumes are not listed and
 * not kept: a library full of "Sin nombre" is noise that hides the real ones.
 */
export function isBlankCv(cv: StoredCv): boolean {
  const letter = cv.letter
  const letterBlank =
    !letter || [letter.role, letter.company, letter.recipient, letter.body].every((text) => !text.trim())
  return (
    letterBlank &&
    cv.versions.length === 0 &&
    JSON.stringify(cv.resumes.es) === JSON.stringify(emptyResume())
  )
}

/**
 * Reads any document this app has ever written, upgraded to the version 2
 * single-resume shape. Kept for version 1 and 2 data; `upgradeLibrary` builds
 * on it.
 *
 * `schemaVersion` is a literal, so without these steps the day the number went
 * up every resume already saved would stop validating -- and a document that
 * does not validate is set aside as unreadable and replaced by the autosave.
 * Raising the number without a migration is how everyone's resume gets lost at
 * once, on a deploy, with nothing on screen.
 */
export function upgradeDocument(json: unknown): StoredDocument | null {
  const current = documentSchema.safeParse(json)
  if (current.success) return current.data

  const v1 = documentV1Schema.safeParse(json)
  if (v1.success) {
    return { ...v1.data, schemaVersion: DOCUMENT_VERSION, versions: [], activeVersionId: null }
  }

  return null
}

/** The id the single resume of an upgraded version 1 or 2 document gets. */
export const FIRST_CV_ID = 'cv-1'

/**
 * Reads anything this app has ever saved as the current library. A version 1 or
 * 2 document becomes a library of one. `storage.test.ts` holds real documents of
 * every older version and fails if a step is removed.
 */
export function upgradeLibrary(json: unknown): StoredLibrary | null {
  const current = librarySchema.safeParse(json)
  if (current.success) return current.data

  const single = upgradeDocument(json)
  if (single) {
    return { schemaVersion: LIBRARY_VERSION, activeCvId: FIRST_CV_ID, cvs: [documentToCv(single, FIRST_CV_ID)] }
  }

  return null
}

/**
 * Whether a library written by another tab says something different from this
 * tab's copy.
 *
 * Which resume and which version are open are left out: both are saved, so just
 * opening one in a tab rewrites storage, and comparing them would tell every
 * other tab "this resume changed elsewhere" when nobody had touched it. Text
 * that is not a readable library counts as a change -- when in doubt, stop
 * saving rather than write over it.
 */
export function differsFrom(current: StoredLibrary, written: string | null): boolean {
  if (written === null) return true
  let other: StoredLibrary | null
  try {
    other = upgradeLibrary(JSON.parse(written))
  } catch {
    return true
  }
  if (!other) return true
  /*
   * Both sides go through the schema first. What was read back comes out in the
   * schema's key order and this tab's copy in whatever order it was built, and
   * comparing the two strings as they were reported a change on every write.
   */
  const content = (library: StoredLibrary) => {
    const normal = librarySchema.parse(library)
    return JSON.stringify({
      ...normal,
      activeCvId: null,
      cvs: normal.cvs.map((cv) => ({ ...cv, activeVersionId: null })),
    })
  }
  return content(other) !== content(current)
}

/** A downloaded copy of one resume: a library of one, so the file reads back as it is saved. */
export function exportCv(cv: StoredCv): StoredLibrary {
  return { schemaVersion: LIBRARY_VERSION, activeCvId: cv.id, cvs: [cv] }
}

export type SaveResult =
  | { ok: true }
  | { ok: false; reason: 'quota' | 'unavailable'; message: string }

/**
 * Saving can fail, and the failure that matters is the silent one: a photo
 * stored uncompressed fills the ~5 MB quota, the browser stops writing, and the
 * app looks fine until the tab reloads and the resume is gone. So the result is
 * returned rather than thrown away.
 */
export function saveLibrary(library: StoredLibrary): SaveResult {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(library))
    return { ok: true }
  } catch (error) {
    const isQuota =
      error instanceof DOMException &&
      (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    if (isQuota) {
      return {
        ok: false,
        reason: 'quota',
        message:
          'No entra en el almacenamiento del navegador. Quitá una foto, borrá un CV que ya no uses o acortá el texto, y volvé a intentar.',
      }
    }
    return {
      ok: false,
      reason: 'unavailable',
      message:
        'El navegador no está guardando (puede ser una ventana privada). Exportá el CV a .json para no perderlo.',
    }
  }
}

export type LoadResult =
  /** Nothing saved, or storage is unreachable: a legitimate blank start. */
  | { status: 'empty' }
  | { status: 'ok'; library: StoredLibrary }
  /** Something was saved and cannot be read. The raw text comes back so it can
   *  be handed to the person instead of being overwritten. */
  | { status: 'unreadable'; raw: string }

/**
 * Reads the saved library, telling "there is nothing" apart from "there is
 * something I cannot read". Those two used to be the same answer, and the
 * second one silently cost the resume.
 */
export function loadLibrary(): LoadResult {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(STORAGE_KEY)
  } catch {
    return { status: 'empty' }
  }
  if (!raw) return { status: 'empty' }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return unreadable(raw)
  }

  const library = upgradeLibrary(parsed)
  return library ? { status: 'ok', library } : unreadable(raw)
}

/**
 * Puts the unreadable text aside under its own key, so it survives the autosave
 * that is about to write over the document. Best effort: if the copy cannot be
 * made, the raw text still travels back in memory for the person to download.
 */
function unreadable(raw: string): LoadResult {
  try {
    localStorage.setItem(BACKUP_KEY, raw)
  } catch {
    /* no room for a copy; the in-memory one is what is left */
  }
  return { status: 'unreadable', raw }
}

/**
 * The set-aside copy, if there is one.
 *
 * Read on every start, not only on the start that put it there: the autosave
 * replaces the broken document immediately, so from the next reload onwards the
 * copy would be invisible -- sitting in storage, eating quota, offered to
 * nobody.
 */
export function readBackup(): string | null {
  try {
    return localStorage.getItem(BACKUP_KEY)
  } catch {
    return null
  }
}

export function clearBackup(): void {
  try {
    localStorage.removeItem(BACKUP_KEY)
  } catch {
    /* nothing to clear if storage is unavailable */
  }
}

export function clearDocument(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* nothing to clear if storage is unavailable */
  }
}

export type ImportResult =
  /** The resumes the file holds, ready to be added. Their ids are replaced when added. */
  | { ok: true; cvs: StoredCv[] }
  | { ok: false; message: string }

/**
 * Reads a `.json` copy. Anything read from a file is validated before it reaches
 * app state.
 *
 * Accepts every shape this app has written -- a library, a version 2 or 1
 * document -- and a bare resume. Loading a copy ADDS what it holds to the
 * library instead of replacing what is open: with several resumes kept, there
 * is no reason for a copy to overwrite anything, and picking the wrong file
 * costs nothing.
 */
export function parseCopy(text: string): ImportResult {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return { ok: false, message: 'El archivo no es un .json válido.' }
  }

  const asLibrary = upgradeLibrary(json)
  if (asLibrary) {
    const cvs = asLibrary.cvs.filter((cv) => !isBlankCv(cv))
    return cvs.length > 0
      ? { ok: true, cvs }
      : { ok: false, message: 'La copia no tiene ningún CV con datos.' }
  }

  const asResume = resumeSchema.safeParse(json)
  if (asResume.success) {
    return { ok: true, cvs: [{ ...freshCv(FIRST_CV_ID, defaultSettings()), resumes: { es: asResume.data } }] }
  }

  return {
    ok: false,
    message: 'El .json no tiene la forma de un CV de CV Match. Revisá que sea un archivo exportado desde acá.',
  }
}
