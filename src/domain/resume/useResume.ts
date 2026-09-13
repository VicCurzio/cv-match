import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { emptyResume, type Resume } from './resumeSchema'
import { defaultSettings, type Settings } from './settings'
import {
  DOCUMENT_VERSION,
  clearBackup,
  differsFrom,
  freshDocument,
  isBlankDocument,
  isDocumentChange,
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
  /**
   * The id last selected, saved with the document. Read by the start screen to
   * reopen the version that was open; may name a version that no longer exists.
   */
  activeVersionId: string | null
  /** The settings of whatever is selected, base or version. */
  settings: Settings
  /** Set when a save failed, so the UI can say so instead of losing data quietly. */
  saveError: string | null
  /**
   * The saved resume was changed from another tab. Autosave stops here, and the
   * UI asks to reload: this tab holds an older copy, and saving it would write
   * over the newer one without a word.
   */
  changedElsewhere: boolean
  /** A resume with something in it was saved before this visit. */
  hasSaved: boolean
  /**
   * The raw text of a saved document that could not be read. The autosave is
   * about to write over it, so the UI offers it as a download first.
   */
  unreadable: string | null
  dismissUnreadable: () => void
  /** Edits the base, whatever is selected. */
  setResume: (next: Resume | ((current: Resume) => Resume)) => void
  /** Patches the settings of whatever is selected: base or version. */
  setSettings: (patch: Partial<Settings>) => void
  /**
   * Patches the base's settings whatever is selected. The start questions are
   * about the resume itself; answered while the saved selection is a version,
   * they used to land on that version and leave the base untouched.
   */
  setBaseSettings: (patch: Partial<Settings>) => void
  /** Replaces the base: an imported resume. Versions stay, layered on the new facts. */
  replaceAll: (resume: Resume) => void
  /** Replaces everything: an imported export, versions included. */
  replaceDocument: (doc: StoredDocument) => void
  /**
   * Throws the saved resume and its versions away and starts an empty one with
   * these settings. Destructive on purpose: the start screen asks first and
   * offers a copy.
   */
  startNew: (settings: Settings) => void
  /** Creates the version and returns its id, so the caller can navigate to it. */
  addVersion: (input: { company: string; role: string; posting?: string }) => string
  updateVersion: (id: string, change: (version: Version) => Version) => void
  deleteVersion: (id: string) => void
  toDocument: () => StoredDocument
}

/**
 * @param selectedVersionId Which version the address selects: an id, `null`
 * for the base, or `undefined` on a screen that selects nothing (the start
 * screen), which leaves the saved selection alone so "seguir" can reopen it.
 *
 * The address is the source of truth for what is on screen. The hook follows
 * it instead of holding a second copy that the back button would not move.
 */
export function useResume(selectedVersionId?: string | null): ResumeState {
  const [stored] = useState(() => loadDocument())
  const saved = stored.status === 'ok' ? stored.doc : null

  const [base, setBase] = useState<Resume>(() => saved?.resumes.es ?? emptyResume())
  const [baseSettings, setBaseSettings] = useState<Settings>(
    () => saved?.settings ?? defaultSettings(),
  )
  const [versions, setVersions] = useState<Version[]>(() => saved?.versions ?? [])
  const [activeVersionId, setActiveVersionId] = useState<string | null>(
    // `null` from the address means the base; only `undefined` defers to what was saved.
    () => (selectedVersionId !== undefined ? selectedVersionId : (saved?.activeVersionId ?? null)),
  )
  // Adjusted during render rather than in an effect, so the first paint after
  // a navigation already shows the right version instead of flashing the old one.
  if (selectedVersionId !== undefined && selectedVersionId !== activeVersionId) {
    setActiveVersionId(selectedVersionId)
  }
  // Either the document that just failed to parse, or one set aside on an
  // earlier visit and never claimed.
  const [unreadable, setUnreadable] = useState<string | null>(() =>
    stored.status === 'unreadable' ? stored.raw : readBackup(),
  )
  const [saveError, setSaveError] = useState<string | null>(null)
  const [changedElsewhere, setChangedElsewhere] = useState(false)

  /*
   * Two tabs on the same resume used to fight silently: each autosaves its own
   * copy, so whichever wrote last erased what was done in the other -- a whole
   * version gone because an old tab was still open behind. The browser tells
   * every other tab when storage changes; this one listens and stands down.
   */
  const latest = useRef<(() => StoredDocument) | null>(null)
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (!isDocumentChange(event.key) || !latest.current) return
      if (differsFrom(latest.current(), event.newValue)) setChangedElsewhere(true)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])
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

  // Read by the storage listener, which is registered once and must compare
  // against this tab's current copy rather than the one from its first render.
  useEffect(() => {
    latest.current = toDocument
  }, [toDocument])

  // Debounced autosave: writing to storage on every keystroke is wasteful, and
  // a failure here is the one that loses work, so its result is surfaced.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    // An older copy must not be saved over a newer one from another tab.
    if (changedElsewhere) return
    timer.current = setTimeout(() => {
      const result: SaveResult = saveDocument(toDocument())
      setSaveError(result.ok ? null : result.message)
    }, SAVE_DELAY_MS)

    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [toDocument, changedElsewhere])

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

  const patchBaseSettings = useCallback((patch: Partial<Settings>) => {
    setBaseSettings((current) => ({ ...current, ...patch }))
  }, [])

  const replaceAll = useCallback((next: Resume) => setBase(next), [])

  const replaceDocument = useCallback((doc: StoredDocument) => {
    setBase(doc.resumes.es)
    setBaseSettings(doc.settings)
    setVersions(doc.versions)
    setActiveVersionId(doc.activeVersionId)
  }, [])

  const startNew = useCallback(
    (next: Settings) => replaceDocument(freshDocument(next)),
    [replaceDocument],
  )

  const addVersion = useCallback(
    (input: { company: string; role: string; posting?: string }) => {
      const version = createVersion({ ...input, id: newId('ver') }, settings)
      setVersions((current) => [...current, version])
      return version.id
    },
    [settings],
  )

  const deleteVersion = useCallback((id: string) => {
    setVersions((current) => current.filter((version) => version.id !== id))
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
    activeVersionId,
    settings,
    saveError,
    changedElsewhere,
    // An empty document left by an earlier look at the start screen is not a resume.
    hasSaved: stored.status === 'ok' && !isBlankDocument(stored.doc),
    unreadable,
    dismissUnreadable,
    setResume,
    setSettings,
    setBaseSettings: patchBaseSettings,
    replaceAll,
    replaceDocument,
    startNew,
    addVersion,
    updateVersion,
    deleteVersion,
    toDocument,
  }
}

export function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}
