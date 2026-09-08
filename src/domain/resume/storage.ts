import { z } from 'zod'
import { RESUME_VERSION, resumeSchema, type Resume } from './resumeSchema'

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

export const settingsSchema = z.object({
  market: z.enum(['AR', 'INTL']),
  atsMode: z.boolean(),
  template: z.enum(['harvard', 'modern']),
})

export type Settings = z.infer<typeof settingsSchema>

/**
 * The envelope carries a resume per locale even though only `es` exists today.
 * Translation (feature 0009) needs a second version, and adding it to the shape
 * later would mean migrating whatever people already have saved.
 */
export const documentSchema = z.object({
  schemaVersion: z.literal(RESUME_VERSION),
  settings: settingsSchema,
  activeLocale: z.enum(['es', 'en']),
  resumes: z.object({
    es: resumeSchema,
    en: resumeSchema.optional(),
  }),
})

export type StoredDocument = z.infer<typeof documentSchema>

export const defaultSettings = (): Settings => ({
  market: 'AR',
  atsMode: false,
  template: 'modern',
})

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

  const result = documentSchema.safeParse(parsed)
  return result.success ? { status: 'ok', doc: result.data } : unreadable(raw)
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
  | { ok: true; resume: Resume }
  | { ok: false; message: string }

/** Anything read from a file is validated before it reaches app state. */
export function parseResumeJson(text: string): ImportResult {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return { ok: false, message: 'El archivo no es un .json válido.' }
  }

  // Accept both a bare resume and a full exported document.
  const asDocument = documentSchema.safeParse(json)
  if (asDocument.success) return { ok: true, resume: asDocument.data.resumes.es }

  const asResume = resumeSchema.safeParse(json)
  if (asResume.success) return { ok: true, resume: asResume.data }

  return {
    ok: false,
    message: 'El .json no tiene la forma de un CV de CV Match. Revisá que sea un archivo exportado desde acá.',
  }
}
