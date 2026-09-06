import { z } from 'zod'
import { RESUME_VERSION, resumeSchema, type Resume } from './resumeSchema'

/**
 * Everything lives in the browser. There is no server to send a resume to, which
 * is how the project's central rule -- the resume never leaves the user's
 * machine -- is enforced rather than merely promised.
 */

const STORAGE_KEY = 'cv-match:document'

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

export function loadDocument(): StoredDocument | null {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
  if (!raw) return null

  try {
    const parsed = documentSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
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
