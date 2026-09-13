import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { emptyResume, type Resume } from './resumeSchema'
import { defaultSettings, type Settings } from './settings'
import {
  DOCUMENT_VERSION,
  clearBackup,
  loadDocument,
  readBackup,
  saveDocument,
  type SaveResult,
  type StoredDocument,
} from './storage'
import { createVersion, resolveVersion, type Version } from './versions'

const SAVE_DELAY_MS = 500

export interface ResumeState {
  /**
   * The resume on screen: the base with the active version's layer applied.
   * What the preview draws, the rules judge and the download writes.
   */
  resume: Resume
  /** The facts. The only resume the full form edits. */
  base: Resume
  versions: Version[]
  /** `null` while the base itself is selected. */
  activeVersion: Version | null
  /** The settings of whatever is selected, base or version. */
  settings: Settings
  /** Set when a save failed, so the UI can say so instead of losing data quietly. */
  saveError: string | null
  hasSaved: boolean
  /**
   * The raw text of a saved document that could not be read. The autosave is
   * about to write over it, so the UI offers it as a download first.
   */
  unreadable: string | null
  dismissUnreadable: () => void
  /** Edits the base, whatever is selected. */
  setResume: (next: Resume | ((current: Resume) => Resume)) => void
  setSettings: (patch: Partial<Settings>) => void
  /** Replaces the base: an imported resume. Versions stay, layered on the new facts. */
  replaceAll: (resume: Resume) => void
  /** Replaces everything: an imported export, versions included. */
  replaceDocument: (doc: StoredDocument) => void
  selectVersion: (id: string | null) => void
  addVersion: (input: { company: string; role: string; posting?: string }) => void
  updateVersion: (id: string, change: (version: Version) => Version) => void
  deleteVersion: (id: string) => void
  toDocument: () => StoredDocument
}

export function useResume(): ResumeState {
  const [stored] = useState(() => loadDocument())
  const saved = stored.status === 'ok' ? stored.doc : null

  const [base, setBase] = useState<Resume>(() => saved?.resumes.es ?? emptyResume())
  const [baseSettings, setBaseSettings] = useState<Settings>(
    () => saved?.settings ?? defaultSettings(),
  )
  const [versions, setVersions] = useState<Version[]>(() => saved?.versions ?? [])
  const [activeVersionId, setActiveVersionId] = useState<string | null>(
    () => saved?.activeVersionId ?? null,
  )
  // Either the document that just failed to parse, or one set aside on an
  // earlier visit and never claimed.
  const [unreadable, setUnreadable] = useState<string | null>(() =>
    stored.status === 'unreadable' ? stored.raw : readBackup(),
  )
  const [saveError, setSaveError] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // An id pointing at a deleted version selects the base rather than nothing.
  const activeVersion = versions.find((version) => version.id === activeVersionId) ?? null

  const resume = useMemo(() => resolveVersion(base, activeVersion), [base, activeVersion])
  const settings = activeVersion ? activeVersion.settings : baseSettings

  const toDocument = useCallback(
    (): StoredDocument => ({
      schemaVersion: DOCUMENT_VERSION,
      settings: baseSettings,
      activeLocale: 'es',
      resumes: { es: base },
      versions,
      activeVersionId: activeVersion?.id ?? null,
    }),
    [base, baseSettings, versions, activeVersion],
  )

  // Debounced autosave: writing to storage on every keystroke is wasteful, and
  // a failure here is the one that loses work, so its result is surfaced.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const result: SaveResult = saveDocument(toDocument())
      setSaveError(result.ok ? null : result.message)
    }, SAVE_DELAY_MS)

    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [toDocument])

  const setResume = useCallback((next: Resume | ((current: Resume) => Resume)) => {
    setBase((current) => (typeof next === 'function' ? next(current) : next))
  }, [])

  const updateVersion = useCallback((id: string, change: (version: Version) => Version) => {
    setVersions((current) => current.map((version) => (version.id === id ? change(version) : version)))
  }, [])

  const setSettings = useCallback(
    (patch: Partial<Settings>) => {
      if (activeVersionId && versions.some((version) => version.id === activeVersionId)) {
        updateVersion(activeVersionId, (version) => ({
          ...version,
          settings: { ...version.settings, ...patch },
        }))
        return
      }
      setBaseSettings((current) => ({ ...current, ...patch }))
    },
    [activeVersionId, versions, updateVersion],
  )

  const replaceAll = useCallback((next: Resume) => setBase(next), [])

  const replaceDocument = useCallback((doc: StoredDocument) => {
    setBase(doc.resumes.es)
    setBaseSettings(doc.settings)
    setVersions(doc.versions)
    setActiveVersionId(doc.activeVersionId)
  }, [])

  const addVersion = useCallback(
    (input: { company: string; role: string; posting?: string }) => {
      const version = createVersion({ ...input, id: newId('ver') }, settings)
      setVersions((current) => [...current, version])
      setActiveVersionId(version.id)
    },
    [settings],
  )

  const deleteVersion = useCallback((id: string) => {
    setVersions((current) => current.filter((version) => version.id !== id))
    setActiveVersionId((current) => (current === id ? null : current))
  }, [])

  const dismissUnreadable = useCallback(() => {
    clearBackup()
    setUnreadable(null)
  }, [])

  return {
    resume,
    base,
    versions,
    activeVersion,
    settings,
    saveError,
    hasSaved: stored.status === 'ok',
    unreadable,
    dismissUnreadable,
    setResume,
    setSettings,
    replaceAll,
    replaceDocument,
    selectVersion: setActiveVersionId,
    addVersion,
    updateVersion,
    deleteVersion,
    toDocument,
  }
}

export function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}
