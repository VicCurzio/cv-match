import { useCallback, useEffect, useRef, useState } from 'react'
import { RESUME_VERSION, emptyResume, type Resume } from './resumeSchema'
import {
  defaultSettings,
  loadDocument,
  saveDocument,
  type SaveResult,
  type Settings,
  type StoredDocument,
} from './storage'

const SAVE_DELAY_MS = 500

export interface ResumeState {
  resume: Resume
  settings: Settings
  /** Set when a save failed, so the UI can say so instead of losing data quietly. */
  saveError: string | null
  hasSaved: boolean
  setResume: (next: Resume | ((current: Resume) => Resume)) => void
  setSettings: (patch: Partial<Settings>) => void
  replaceAll: (resume: Resume) => void
  toDocument: () => StoredDocument
}

export function useResume(): ResumeState {
  const [stored] = useState(() => loadDocument())
  const [resume, setResumeState] = useState<Resume>(() => stored?.resumes.es ?? emptyResume())
  const [settings, setSettingsState] = useState<Settings>(
    () => stored?.settings ?? defaultSettings(),
  )
  const [saveError, setSaveError] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const toDocument = useCallback(
    (): StoredDocument => ({
      schemaVersion: RESUME_VERSION,
      settings,
      activeLocale: 'es',
      resumes: { es: resume },
    }),
    [resume, settings],
  )

  // Debounced autosave: writing to storage on every keystroke is wasteful, and
  // a failure here is the one that loses work, so its result is surfaced.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const result: SaveResult = saveDocument({
        schemaVersion: RESUME_VERSION,
        settings,
        activeLocale: 'es',
        resumes: { es: resume },
      })
      setSaveError(result.ok ? null : result.message)
    }, SAVE_DELAY_MS)

    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [resume, settings])

  const setResume = useCallback((next: Resume | ((current: Resume) => Resume)) => {
    setResumeState((current) => (typeof next === 'function' ? next(current) : next))
  }, [])

  const setSettings = useCallback((patch: Partial<Settings>) => {
    setSettingsState((current) => ({ ...current, ...patch }))
  }, [])

  const replaceAll = useCallback((next: Resume) => setResumeState(next), [])

  return {
    resume,
    settings,
    saveError,
    hasSaved: stored !== null,
    setResume,
    setSettings,
    replaceAll,
    toDocument,
  }
}

export function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}
