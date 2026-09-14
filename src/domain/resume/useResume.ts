import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Resume } from './resumeSchema'
import { defaultSettings, type Settings } from './settings'
import {
  LIBRARY_VERSION,
  clearBackup,
  differsFrom,
  freshCv,
  isBlankCv,
  isDocumentChange,
  loadLibrary,
  readBackup,
  saveLibrary,
  type BaseLetter,
  type SaveResult,
  type StoredCv,
  type StoredLibrary,
} from './storage'
import { createVersion, resolveVersion, type Version } from './versions'

const SAVE_DELAY_MS = 500

/** A resume as the start screen lists it. */
export interface CvSummary {
  id: string
  fullName: string
  versionIds: string[]
  /** The version that was open in it, to reopen it there. */
  activeVersionId: string | null
  isOpen: boolean
}

export interface ResumeState {
  /**
   * The resume on screen: the open resume's base with the active version's
   * layer applied. What the preview draws, the rules judge and the download writes.
   */
  resume: Resume
  /** The facts of the open resume. The only resume the full form edits. */
  base: Resume
  versions: Version[]
  /** `null` while the base itself is selected. */
  activeVersion: Version | null
  /**
   * The id last selected, saved with the resume. Read by the start screen to
   * reopen the version that was open; may name a version that no longer exists.
   */
  activeVersionId: string | null
  /** The settings of whatever is selected, base or version. */
  settings: Settings
  /** The base's cover letter, when one was written. */
  baseLetter: BaseLetter | undefined
  /** Every resume with something in it, the open one included. */
  cvs: CvSummary[]
  /** The open resume holds nothing yet: answering the start questions can reuse it. */
  openIsBlank: boolean
  /** Set when a save failed, so the UI can say so instead of losing data quietly. */
  saveError: string | null
  /**
   * The saved library was changed from another tab. Autosave stops here, and
   * the UI asks to reload: this tab holds an older copy, and saving it would
   * write over the newer one without a word.
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
  /** Edits the open resume's base, whatever is selected. */
  setResume: (next: Resume | ((current: Resume) => Resume)) => void
  /** Patches the settings of whatever is selected: base or version. */
  setSettings: (patch: Partial<Settings>) => void
  /**
   * Patches the base's settings whatever is selected. The start questions are
   * about the resume itself; answered while the saved selection is a version,
   * they used to land on that version and leave the base untouched.
   */
  setBaseSettings: (patch: Partial<Settings>) => void
  setBaseLetter: (letter: BaseLetter) => void
  /** Replaces the open resume's base: a resume read from a PDF or Word file. Versions stay. */
  replaceAll: (resume: Resume) => void
  /** Adds a new, empty resume with these settings and opens it. The open one is kept. */
  createCv: (settings: Settings) => void
  /** Opens another resume. The one that was open is kept as it is. */
  openCv: (id: string) => void
  /** Deletes a resume for good. If it was open, another one opens. */
  deleteCv: (id: string) => void
  /** Adds resumes read from a copy, with new ids, and opens the first one. */
  addCvs: (cvs: StoredCv[]) => void
  /** The open resume as saved -- what a copy of it downloads. */
  currentCv: () => StoredCv
  /** A resume of the library by id, as saved. */
  findCv: (id: string) => StoredCv | undefined
  /** Creates the version and returns its id, so the caller can navigate to it. */
  addVersion: (input: { company: string; role: string; posting?: string }) => string
  updateVersion: (id: string, change: (version: Version) => Version) => void
  deleteVersion: (id: string) => void
  toLibrary: () => StoredLibrary
}

/**
 * @param selectedVersionId Which version the address selects: an id, `null`
 * for the base, or `undefined` on a screen that selects nothing (the start
 * screen), which leaves the saved selection alone so "seguir" can reopen it.
 *
 * The address is the source of truth for what is on screen. The hook follows
 * it instead of holding a second copy that the back button would not move.
 *
 * The open resume is held field by field, exactly as when the app had a single
 * one; the others wait in `shelf` as they were last saved. Opening another
 * resume puts the open one on the shelf and takes the other one off.
 */
export function useResume(selectedVersionId?: string | null): ResumeState {
  const [stored] = useState(() => loadLibrary())
  const saved = stored.status === 'ok' ? stored.library : null
  const [first] = useState<StoredCv>(
    () =>
      saved?.cvs.find((cv) => cv.id === saved.activeCvId) ??
      saved?.cvs[0] ??
      freshCv(newId('cv'), defaultSettings()),
  )

  const [shelf, setShelf] = useState<StoredCv[]>(() => saved?.cvs ?? [])
  const [openId, setOpenId] = useState(first.id)
  const [base, setBase] = useState<Resume>(first.resumes.es)
  const [baseSettings, setBaseSettings] = useState<Settings>(first.settings)
  const [versions, setVersions] = useState<Version[]>(first.versions)
  const [baseLetter, setBaseLetter] = useState<BaseLetter | undefined>(first.letter)
  const [activeVersionId, setActiveVersionId] = useState<string | null>(
    // `null` from the address means the base; only `undefined` defers to what was saved.
    () => (selectedVersionId !== undefined ? selectedVersionId : first.activeVersionId),
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
   * Two tabs on the same library used to fight silently: each autosaves its own
   * copy, so whichever wrote last erased what was done in the other -- a whole
   * version gone because an old tab was still open behind. The browser tells
   * every other tab when storage changes; this one listens and stands down.
   */
  const latest = useRef<(() => StoredLibrary) | null>(null)
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

  const currentCv = useCallback(
    (): StoredCv => ({
      id: openId,
      settings: baseSettings,
      activeLocale: 'es',
      resumes: { es: base },
      versions,
      activeVersionId: activeVersion?.id ?? null,
      ...(baseLetter ? { letter: baseLetter } : {}),
    }),
    [openId, base, baseSettings, versions, activeVersion, baseLetter],
  )

  /**
   * Everything, in the order resumes were added. Blank resumes are dropped,
   * except the open one: someone who just pressed "Empezar" is looking at it.
   */
  const toLibrary = useCallback((): StoredLibrary => {
    const open = currentCv()
    const cvs = shelf.some((cv) => cv.id === open.id)
      ? shelf.map((cv) => (cv.id === open.id ? open : cv))
      : [...shelf, open]
    return {
      schemaVersion: LIBRARY_VERSION,
      activeCvId: open.id,
      cvs: cvs.filter((cv) => cv.id === open.id || !isBlankCv(cv)),
    }
  }, [shelf, currentCv])

  // Read by the storage listener, which is registered once and must compare
  // against this tab's current copy rather than the one from its first render.
  useEffect(() => {
    latest.current = toLibrary
  }, [toLibrary])

  // Debounced autosave: writing to storage on every keystroke is wasteful, and
  // a failure here is the one that loses work, so its result is surfaced.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    // An older copy must not be saved over a newer one from another tab.
    if (changedElsewhere) return
    timer.current = setTimeout(() => {
      const library = toLibrary()
      // A library holding only an untouched resume is not worth a write: it is
      // what a first look at the start screen would otherwise leave behind.
      const empty = library.cvs.every((cv) => isBlankCv(cv))
      const result: SaveResult = empty && stored.status !== 'ok' ? { ok: true } : saveLibrary(library)
      setSaveError(result.ok ? null : result.message)
    }, SAVE_DELAY_MS)

    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [toLibrary, changedElsewhere, stored.status])

  /** Puts the open resume on the shelf -- or drops it, when blank -- and opens `next`. */
  const switchTo = useCallback(
    (next: StoredCv, extra: StoredCv[] = []) => {
      const open = currentCv()
      setShelf((current) => {
        // The open resume goes back in its place, with what was typed since it opened.
        const kept = isBlankCv(open)
          ? current.filter((cv) => cv.id !== open.id)
          : current.some((cv) => cv.id === open.id)
            ? current.map((cv) => (cv.id === open.id ? open : cv))
            : [...current, open]
        const additions = [...extra, next].filter((cv) => !kept.some((existing) => existing.id === cv.id))
        return [...kept, ...additions]
      })
      setOpenId(next.id)
      setBase(next.resumes.es)
      setBaseSettings(next.settings)
      setVersions(next.versions)
      setBaseLetter(next.letter)
      setActiveVersionId(next.activeVersionId)
    },
    [currentCv],
  )

  const findCv = useCallback(
    (id: string) => (id === openId ? currentCv() : shelf.find((cv) => cv.id === id)),
    [openId, currentCv, shelf],
  )

  const createCv = useCallback(
    (next: Settings) => switchTo(freshCv(newId('cv'), next)),
    [switchTo],
  )

  const openCv = useCallback(
    (id: string) => {
      if (id === openId) return
      const target = shelf.find((cv) => cv.id === id)
      if (target) switchTo(target)
    },
    [openId, shelf, switchTo],
  )

  const deleteCv = useCallback(
    (id: string) => {
      if (id !== openId) {
        setShelf((current) => current.filter((cv) => cv.id !== id))
        return
      }
      const rest = shelf.filter((cv) => cv.id !== id && !isBlankCv(cv))
      const next = rest[0] ?? freshCv(newId('cv'), defaultSettings())
      setShelf((current) => current.filter((cv) => cv.id !== id))
      setOpenId(next.id)
      setBase(next.resumes.es)
      setBaseSettings(next.settings)
      setVersions(next.versions)
      setBaseLetter(next.letter)
      setActiveVersionId(next.activeVersionId)
    },
    [openId, shelf],
  )

  const addCvs = useCallback(
    (incoming: StoredCv[]) => {
      // New ids: a copy of a resume that is already here is a second resume, not a clash.
      const added = incoming.map((cv) => ({ ...cv, id: newId('cv') }))
      const [firstAdded, ...others] = added
      if (firstAdded) switchTo(firstAdded, others)
    },
    [switchTo],
  )

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

  const open = currentCv()
  const cvs: CvSummary[] = toLibrary()
    .cvs.filter((cv) => !isBlankCv(cv))
    .map((cv) => ({
      id: cv.id,
      fullName: cv.resumes.es.personal.fullName,
      versionIds: cv.versions.map((version) => version.id),
      activeVersionId: cv.activeVersionId,
      isOpen: cv.id === open.id,
    }))

  return {
    resume,
    base,
    versions,
    activeVersion,
    activeVersionId,
    settings,
    baseLetter,
    cvs,
    openIsBlank: isBlankCv(open),
    saveError,
    changedElsewhere,
    // An empty resume left by an earlier look at the start screen is not a resume.
    hasSaved: stored.status === 'ok' && stored.library.cvs.some((cv) => !isBlankCv(cv)),
    unreadable,
    dismissUnreadable,
    setResume,
    setSettings,
    setBaseSettings: patchBaseSettings,
    setBaseLetter,
    replaceAll,
    createCv,
    openCv,
    deleteCv,
    addCvs,
    currentCv,
    findCv,
    addVersion,
    updateVersion,
    deleteVersion,
    toLibrary,
  }
}

export function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}
