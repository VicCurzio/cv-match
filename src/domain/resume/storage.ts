import { z } from 'zod'
import { emptyResume, resumeSchema, type Resume } from './resumeSchema'
import { settingsSchema } from './settings'
import { versionSchema } from './versions'

/**
 * Everything lives in the browser. There is no server to send a resume to, which
 * is how the project's central rule -- the resume never leaves the user's
 * machine -- is enforced rather than merely promised.
 */

const STORAGE_KEY = 'cv-match:document'

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

/** The shape of what is saved. Bumped when that shape changes, never silently. */
export const DOCUMENT_VERSION = 2

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
 * The envelope carries a resume per locale even though only `es` exists today.
 * Translation (feature 0009) needs a second version, and adding it to the shape
 * later would mean migrating whatever people already have saved.
 *
 * Version 2 adds the versions aimed at job postings (feature 0011). `settings`
 * and `resumes` are the BASE: the facts, and how the base is exported.
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
 * A new, empty document with the start screen's answers: what "Empezar uno
 * nuevo" puts in place of whatever was saved. No resume, no versions, the base
 * selected.
 */
export function freshDocument(settings: Settings): StoredDocument {
  return {
    schemaVersion: DOCUMENT_VERSION,
    settings: { ...settings },
    activeLocale: 'es',
    resumes: { es: emptyResume() },
    versions: [],
    activeVersionId: null,
  }
}

/**
 * Reads any document this app has ever written, upgraded to the current shape.
 *
 * `schemaVersion` is a literal, so without this step the day the number went
 * up every resume already saved would stop validating -- and a document that
 * does not validate is set aside as unreadable and replaced by the autosave.
 * Raising the number without a migration is how everyone's resume gets lost at
 * once, on a deploy, with nothing on screen. `storage.test.ts` holds a real v1
 * document and fails if this is removed.
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

export type SaveResult =
  | { ok: true }
  | { ok: false; reason: 'quota' | 'unavailable'; message: string }

/**
 * Saving can fail, and the failure that matters is the silent one: a photo
 * stored uncompressed fills the ~5 MB quota, the browser stops writing, and the
 * app looks fine until the tab reloads and the resume is gone. So the result is
 * returned rather than thrown away.
 */
export function saveDocument(doc: StoredDocument): SaveResult {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(doc))
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
          'No entra en el almacenamiento del navegador. Quitá la foto o acortá el texto y volvé a intentar.',
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
  | { status: 'ok'; doc: StoredDocument }
  /** Something was saved and cannot be read. The raw text comes back so it can
   *  be handed to the person instead of being overwritten. */
  | { status: 'unreadable'; raw: string }

/**
 * Reads the saved document, telling "there is nothing" apart from "there is
 * something I cannot read". Those two used to be the same answer, and the
 * second one silently cost the resume.
 */
export function loadDocument(): LoadResult {
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

  const doc = upgradeDocument(parsed)
  return doc ? { status: 'ok', doc } : unreadable(raw)
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
  /** `document` is there when the file was a whole export, versions included. */
  | { ok: true; resume: Resume; document?: StoredDocument }
  | { ok: false; message: string }

/** Anything read from a file is validated before it reaches app state. */
export function parseResumeJson(text: string): ImportResult {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return { ok: false, message: 'El archivo no es un .json válido.' }
  }

  /*
   * Accept both a bare resume and a full exported document. The document comes
   * back whole: returning only `resumes.es`, as this did before versions, would
   * import someone's file and throw their versions away without a word.
   */
  const asDocument = upgradeDocument(json)
  if (asDocument) return { ok: true, resume: asDocument.resumes.es, document: asDocument }

  const asResume = resumeSchema.safeParse(json)
  if (asResume.success) return { ok: true, resume: asResume.data }

  return {
    ok: false,
    message: 'El .json no tiene la forma de un CV de CV Match. Revisá que sea un archivo exportado desde acá.',
  }
}
