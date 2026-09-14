import { Download, FileJson, FileUp, Mail, Plus, Trash2, Upload } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { runAnalysis } from '@/domain/analysis/runAnalysis'
import { downloadBlob, downloadJson } from '@/domain/export/download'
import { MARKET_PROFILES, forbiddenFields, type MarketId } from '@/domain/market/marketProfile'
import { BODY_PLACEHOLDER } from '@/domain/letter/letterModel'
import { FIELD_LABEL } from '@/domain/resume/resumeSchema'
import { exportCv, parseCopy } from '@/domain/resume/storage'
import type { ResumeState } from '@/domain/resume/useResume'
import { versionLabel } from '@/domain/resume/versions'
import { ImportDialog } from '@/screens/import/ImportDialog'
import { LetterDialog } from '@/screens/letter/LetterDialog'
import { RecoveryNotice } from '@/screens/recovery/RecoveryNotice'
import { ReviewPanel } from '@/screens/review/ReviewPanel'
import { isRecord, paths, previewPageFrom } from '@/screens/routes'
import { Button } from '@/shared/ui/Button'
import { Notice } from '@/shared/ui/Card'
import { copy } from '@/shared/config/copy'
import { listOf } from '@/shared/utils/text'
import { resumeFileName } from '@/templates/buildPdf'
import { copyFileName } from '@/templates/shared/format'
import { PdfLightbox, PdfPagePlaceholder, PdfPages } from './PdfPages'
import { usePdfDocument } from './usePdfDocument'
import { ResumeForm } from './ResumeForm'
import { TranslationForm } from './TranslationForm'
import { DeleteVersionDialog, NewVersionDialog } from './VersionDialogs'
import { VersionForm } from './VersionForm'
import { usePdfPreview } from './usePdfPreview'

export function EditorScreen({ state }: { state: ResumeState }) {
  const { resume, settings, setResume, setSettings, replaceAll, saveError } = state
  const { unreadable, dismissUnreadable } = state
  const { base, versions, activeVersion, updateVersion, locale } = state
  const navigate = useNavigate()
  const location = useLocation()

  /*
   * A notice belongs to the address it was raised on, and is derived from it
   * rather than cleared in an effect. Without this, "Cambiamos a la plantilla
   * Harvard" survived the back button and showed up over another version that
   * nobody had changed.
   */
  const [notice, setNotice] = useState<{ text: string; path: string } | null>(null)
  const message = notice?.path === location.pathname ? notice.text : null
  const setMessage = (text: string | null) =>
    setNotice(text === null ? null : { text, path: location.pathname })
  const [importing, setImporting] = useState(false)
  const [writingLetter, setWritingLetter] = useState(false)
  const [creatingVersion, setCreatingVersion] = useState(false)
  const [deletingVersion, setDeletingVersion] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const profile = MARKET_PROFILES[settings.market]

  const buildOptions = useMemo(
    () => ({ profile, atsMode: settings.atsMode, template: settings.template, locale }),
    [profile, settings.atsMode, settings.template, locale],
  )

  const preview = usePdfPreview(resume, buildOptions)
  const pdf = usePdfDocument(preview.blob)
  /*
   * The enlarged preview is a history entry, not only a piece of state: on a
   * phone the back gesture is how people close things, and without an entry it
   * would leave the editor instead of closing the sheet.
   */
  const zoomedPage = previewPageFrom(location.state)
  const openPreview = (page: number) =>
    navigate(location.pathname, { state: { ...(isRecord(location.state) ? location.state : {}), previewPage: page } })
  const closePreview = () => navigate(-1)

  const findings = useMemo(
    () =>
      runAnalysis(resume, {
        profile,
        atsMode: settings.atsMode,
        template: settings.template,
        locale,
        // Measured from the rendered file, so the length rules judge the
        // document instead of guessing at it.
        ...(preview.layout ? { layout: preview.layout } : {}),
      }),
    [resume, profile, settings.atsMode, settings.template, locale, preview.layout],
  )

  /**
   * ATS mode forces the single-column template. It says so instead of silently
   * swapping: a control the user cannot see is a control they cannot trust.
   */
  function toggleAts(next: boolean) {
    if (next && settings.template === 'modern') {
      setSettings({ atsMode: true, template: 'harvard' })
      setMessage(
        'Cambiamos a la plantilla Harvard: la Moderna tiene dos columnas y un lector automático las lee intercaladas.',
      )
      return
    }
    setSettings({ atsMode: next })
  }

  /**
   * The notice names the fields the new market drops, read from the profile.
   *
   * It used to check a hand-written list of three fields, so the two it did not
   * mention -- marital status and nationality -- disappeared from the export
   * without a word. A list written twice is a list that stops matching.
   */
  function changeMarket(market: MarketId) {
    setSettings({ market })
    const next = MARKET_PROFILES[market]
    const removed = forbiddenFields(next).filter((field) => resume.personal[field])

    setMessage(
      removed.length > 0
        ? `En ${next.label} el CV va sin ${listOf(removed.map((field) => FIELD_LABEL[field]))}. Queda guardado, simplemente no se exporta.`
        : null,
    )
  }

  async function handleImport(file: File | undefined) {
    if (!file) return
    const result = parseCopy(await file.text())
    if (!result.ok) {
      setMessage(result.message)
      return
    }
    /*
     * A copy is added as its own resume: nothing open is replaced, so there is
     * nothing to confirm. The address moves to the base BEFORE the resume
     * changes: the other way round, for a moment the address still named a
     * version of the previous resume, the editor redirected, and it was torn
     * down and rebuilt -- losing the notice below.
     */
    navigate(paths.editor)
    state.addCvs(result.cvs)
    setNotice({ text: copy.loadCopy.loaded(result.cvs.length), path: paths.editor })
  }

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-6 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-3 text-xs font-medium tracking-widest text-primary uppercase">
            {copy.appName}
            <Link
              to={paths.start}
              className="rounded-md text-[11px] tracking-normal text-muted-foreground normal-case underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              {copy.editor.myCvs}
            </Link>
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {resume.personal.fullName || 'Tu CV'}
          </h1>
          {activeVersion ? (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {copy.versions.forCompany(versionLabel(activeVersion))}
              {activeVersion.role ? ` · ${activeVersion.role}` : ''}
            </p>
          ) : null}
        </div>

        {/*
          A native select is as wide as its longest option, and "Internacional
          (EEUU, Reino Unido, Canadá)" is long: on a 360 px phone with a wider
          font it ran off the screen. `max-w-full` lets it shrink and clip the
          label instead. Same for the other two selects.
        */}
        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
          <select
            aria-label={copy.start.marketQuestion}
            className="h-9 min-w-0 max-w-full rounded-lg border border-border bg-card px-3 text-sm"
            value={settings.market}
            onChange={(e) => changeMarket(e.target.value as MarketId)}
          >
            {(Object.keys(MARKET_PROFILES) as MarketId[]).map((id) => (
              <option key={id} value={id}>
                {MARKET_PROFILES[id].label}
              </option>
            ))}
          </select>

          <select
            aria-label="Plantilla"
            className="h-9 min-w-0 max-w-full rounded-lg border border-border bg-card px-3 text-sm disabled:opacity-50"
            value={settings.template}
            disabled={settings.atsMode}
            onChange={(e) => setSettings({ template: e.target.value as 'harvard' | 'modern' })}
          >
            <option value="modern">Moderna (la lee una persona)</option>
            <option value="harvard">Harvard (pasa filtros automáticos)</option>
          </select>

          <label className="flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm">
            <input
              type="checkbox"
              checked={settings.atsMode}
              onChange={(e) => toggleAts(e.target.checked)}
            />
            Filtro automático
          </label>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label={copy.versions.selectorLabel}
          className="h-9 min-w-0 max-w-full rounded-lg border border-border bg-card px-3 text-sm"
          value={activeVersion?.id ?? ''}
          onChange={(e) => {
            navigate(e.target.value ? paths.version(e.target.value) : paths.editor)
            setMessage(null)
          }}
        >
          <option value="">{copy.versions.base}</option>
          {versions.map((version) => (
            <option key={version.id} value={version.id}>
              {copy.versions.forCompany(versionLabel(version))}
            </option>
          ))}
        </select>
        <Button size="sm" onClick={() => setCreatingVersion(true)}>
          <Plus />
          {copy.versions.create}
        </Button>
        {activeVersion ? (
          <Button size="sm" variant="ghost" onClick={() => setDeletingVersion(true)}>
            <Trash2 />
            {copy.versions.remove}
          </Button>
        ) : (
          // English is a layer over the base; versions stay in Spanish (ADR 0008).
          <select
            aria-label={copy.translation.languageLabel}
            className="h-9 min-w-0 max-w-full rounded-lg border border-border bg-card px-3 text-sm"
            value={locale}
            onChange={(e) => {
              state.setLocale(e.target.value === 'en' ? 'en' : 'es')
              setMessage(null)
            }}
          >
            <option value="es">{copy.translation.spanish}</option>
            <option value="en">{copy.translation.english}</option>
          </select>
        )}
      </div>

      {/*
        A saved document that could not be read is offered back before the
        autosave writes over it. It is the one failure in this app that destroys
        work, and it used to happen without a word on screen.
      */}
      {unreadable ? <RecoveryNotice unreadable={unreadable} onDismiss={dismissUnreadable} /> : null}

      {state.changedElsewhere ? (
        <Notice tone="warning" live>
          {copy.otherTab.changed}
          <span className="mt-2 flex">
            <Button size="sm" onClick={() => window.location.reload()}>
              {copy.otherTab.reload}
            </Button>
          </span>
        </Notice>
      ) : null}

      {saveError ? <Notice tone="warning" live>{saveError}</Notice> : null}
      {message ? <Notice live>{message}</Notice> : null}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(420px,42%)]">
        <div className="flex flex-col gap-4">
          {activeVersion ? (
            <VersionForm
              base={base}
              version={activeVersion}
              onChange={(change) => updateVersion(activeVersion.id, change)}
              onEditBase={() => {
                navigate(paths.editor)
                setMessage(null)
              }}
            />
          ) : locale === 'en' ? (
            <TranslationForm
              base={base}
              segments={state.segments}
              translation={state.translation}
              onChange={state.setTranslation}
              market={settings.market}
              onUseInternational={() => changeMarket('INTL')}
              onEditSpanish={() => state.setLocale('es')}
            />
          ) : (
            <ResumeForm
              resume={base}
              profile={profile}
              atsMode={settings.atsMode}
              onChange={setResume}
              onPhotoError={setMessage}
            />
          )}
        </div>

        <div className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              // Not while a new render is on its way: right after switching
              // version the Blob is still the previous version's, and it would
              // download under the new version's file name.
              disabled={!preview.blob || preview.building}
              onClick={() => preview.blob && downloadBlob(preview.blob, resumeFileName(resume, activeVersion?.company, locale))}
            >
              <Download />
              {preview.building ? copy.editor.building : copy.editor.download}
            </Button>
            <Button onClick={() => downloadJson(exportCv(state.currentCv()), copyFileName(base.personal.fullName))}>
              <FileJson />
              {copy.editor.exportJson}
            </Button>
            <Button onClick={() => setWritingLetter(true)}>
              <Mail />
              {copy.letter.open}
            </Button>
            <Button onClick={() => setImporting(true)}>
              <FileUp />
              {copy.import.open}
            </Button>
            <Button onClick={() => fileInput.current?.click()}>
              <Upload />
              {copy.editor.importJson}
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
              void handleImport(e.target.files?.[0])
              // Cleared so choosing the same file again fires a change: without
              // it, re-loading a copy after editing silently did nothing.
              e.target.value = ''
            }}
            />
          </div>

          <div className="max-h-[80vh] overflow-y-auto rounded-card border border-border bg-muted p-4">
            {preview.error ? (
              <p className="text-sm text-severity-error">{preview.error}</p>
            ) : pdf.doc ? (
              <PdfPages doc={pdf.doc} onOpen={openPreview} />
            ) : pdf.failed && preview.url ? (
              // Drawing the sheets is the nicer view, not the only one: if pdfjs
              // cannot load, the browser's own viewer still shows the file.
              <iframe
                key={preview.url}
                src={preview.url}
                title={copy.editor.preview}
                className="h-[720px] w-full border-0"
              />
            ) : (
              <PdfPagePlaceholder />
            )}
          </div>

          <ReviewPanel findings={findings} />
        </div>
      </div>

      {writingLetter ? (
        <LetterDialog
          // The letter is written in Spanish, so it reads the Spanish resume.
          resume={locale === 'en' ? base : resume}
          profile={profile}
          atsMode={settings.atsMode}
          template={settings.template}
          {...(activeVersion
            ? {
                initial: {
                  role: activeVersion.role,
                  company: activeVersion.company,
                  recipient: activeVersion.letter?.recipient ?? '',
                  body: activeVersion.letter?.body ?? BODY_PLACEHOLDER,
                },
                // The letter belongs to the posting, so it is saved with the version.
                onChange: ({ role, company, recipient, body }) =>
                  updateVersion(activeVersion.id, (version) => ({
                    ...version,
                    role,
                    company,
                    letter: { recipient, body },
                  })),
              }
            : {
                ...(state.baseLetter ? { initial: state.baseLetter } : {}),
                // The base keeps its own letter too; it used to be gone on reload.
                onChange: (fields) => state.setBaseLetter(fields),
              })}
          onClose={() => setWritingLetter(false)}
        />
      ) : null}

      {zoomedPage !== null && pdf.doc ? (
        <PdfLightbox doc={pdf.doc} startPage={zoomedPage} onClose={closePreview} />
      ) : null}

      {creatingVersion ? (
        <NewVersionDialog
          onCreate={(input) => {
            navigate(paths.version(state.addVersion(input)))
            setMessage(null)
          }}
          onClose={() => setCreatingVersion(false)}
        />
      ) : null}

      {deletingVersion && activeVersion ? (
        <DeleteVersionDialog
          company={versionLabel(activeVersion)}
          onConfirm={() => {
            // Leave the address first: a deleted version's URL would otherwise
            // stay in the history as a step that leads nowhere.
            navigate(paths.editor, { replace: true })
            state.deleteVersion(activeVersion.id)
          }}
          onClose={() => setDeletingVersion(false)}
        />
      ) : null}

      {importing ? (
        <ImportDialog
          current={base}
          onApply={(next) => {
            replaceAll(next)
            setMessage('Importamos lo que pudimos leer. Revisá el formulario y corregí lo que haga falta.')
          }}
          onClose={() => setImporting(false)}
        />
      ) : null}
    </div>
  )
}
