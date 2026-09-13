/**
 * Every address the app has, built in one place.
 *
 * Before these existed the app was one address for the browser: moving from the
 * start screen to the editor changed state in memory and nothing else, so the
 * back button left the site instead of going back a step, and a reload always
 * landed on the start screen.
 *
 * A version is addressed by its random id and never by its company. The URL is
 * the part of an app that travels -- history, a shared link, a server log --
 * and "the CV of X for company Y" does not belong in it.
 */
export const paths = {
  start: '/',
  editor: '/editor',
  version: (versionId: string) => `/editor/versions/${encodeURIComponent(versionId)}`,
} as const

/** The route pattern `paths.version` fills, for the router. */
export const VERSION_ROUTE = '/editor/versions/:versionId'

export type EditorAccess =
  | { kind: 'show' }
  /** Nothing to edit yet: the two start questions come first. */
  | { kind: 'redirect'; to: string }

/**
 * Whether an editor address can be shown as it is.
 *
 * - With nothing saved and the start questions not answered, the editor would
 *   open blank on default settings, skipping the questions that decide the
 *   result the most. That goes to the start screen.
 * - A version id that is not in this browser -- deleted, or a link opened on
 *   another device, where the resume never was -- goes to the base resume.
 */
export function editorAccess(input: {
  hasResume: boolean
  versionId: string | null
  versionIds: string[]
}): EditorAccess {
  if (!input.hasResume) return { kind: 'redirect', to: paths.start }
  if (input.versionId !== null && !input.versionIds.includes(input.versionId)) {
    return { kind: 'redirect', to: paths.editor }
  }
  return { kind: 'show' }
}

/**
 * Where "Seguir con el CV guardado" goes: back to the version that was open,
 * if it still exists.
 */
export function resumePath(activeVersionId: string | null, versionIds: string[]): string {
  return activeVersionId && versionIds.includes(activeVersionId)
    ? paths.version(activeVersionId)
    : paths.editor
}

/**
 * The router's basename from Vite's base URL. `/cv-match/` becomes `/cv-match`;
 * a root deploy becomes `/`.
 */
export function basenameFrom(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, '')
  return trimmed === '' || trimmed === '.' ? '/' : trimmed
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * The page the enlarged preview is open on, read from the history entry.
 *
 * History state survives a reload and can hold anything another script put
 * there, so it is read defensively: only a whole page number from 1 up opens
 * the preview.
 */
export function previewPageFrom(state: unknown): number | null {
  if (!isRecord(state)) return null
  const page = state.previewPage
  return typeof page === 'number' && Number.isInteger(page) && page >= 1 ? page : null
}
