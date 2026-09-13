import { Download, FileJson, FileUp, Mail, Plus, Trash2, Upload } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { runAnalysis } from '@/domain/analysis/runAnalysis'
import { downloadBlob, downloadJson } from '@/domain/export/download'
import { MARKET_PROFILES, forbiddenFields, type MarketId } from '@/domain/market/marketProfile'
import { BODY_PLACEHOLDER } from '@/domain/letter/letterModel'
import { FIELD_LABEL } from '@/domain/resume/resumeSchema'
import { parseResumeJson } from '@/domain/resume/storage'
import type { ResumeState } from '@/domain/resume/useResume'
import { versionLabel } from '@/domain/resume/versions'
import { ImportDialog } from '@/screens/import/ImportDialog'
import { LetterDialog } from '@/screens/letter/LetterDialog'
import { ReviewPanel } from '@/screens/review/ReviewPanel'
import { Button } from '@/shared/ui/Button'
import { Notice } from '@/shared/ui/Card'
import { copy } from '@/shared/config/copy'
import { listOf } from '@/shared/utils/text'
import { resumeFileName } from '@/templates/buildPdf'
import { PdfLightbox, PdfPagePlaceholder, PdfPages, usePdfDocument } from './PdfPages'
import { ResumeForm } from './ResumeForm'
import { DeleteVersionDialog, NewVersionDialog } from './VersionDialogs'
import { VersionForm } from './VersionForm'
import { usePdfPreview } from './usePdfPreview'

export function EditorScreen({ state }: { state: ResumeState }) {
  const { resume, settings, setResume, setSettings, replaceAll, saveError } = state
  const { unreadable, dismissUnreadable } = state
  const { base, versions, activeVersion, selectVersion, updateVersion } = state
  const [message, setMessage] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [writingLetter, setWritingLetter] = useState(false)
  const [creatingVersion, setCreatingVersion] = useState(false)
  const [deletingVersion, setDeletingVersion] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const profile = MARKET_PROFILES[settings.market]

  const buildOptions = useMemo(
    () => ({ profile, atsMode: settings.atsMode, template: settings.template }),
    [profile, settings.atsMode, settings.template],
  )

  const preview = usePdfPreview(resume, buildOptions)
  const pdf = usePdfDocument(preview.blob)
  const [zoomedPage, setZoomedPage] = useState<number | null>(null)

  const findings = useMemo(
    () =>
      runAnalysis(resume, {
        profile,
        atsMode: settings.atsMode,
        template: settings.template,
        // Measured from the rendered file, so the length rules judge the
        // document instead of guessing at it.
        ...(preview.layout ? { layout: preview.layout } : {}),
      }),
    [resume, profile, settings.atsMode, settings.template, preview.layout],
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
    const result = parseResumeJson(await file.text())
    if (result.ok) {
      // A whole export brings its versions back; a bare resume replaces the facts.
      if (result.document) state.replaceDocument(result.document)
      else replaceAll(result.resume)
      setMessage('Copia cargada.')
    } else {
      setMessage(result.message)
    }
  }

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-6 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-widest text-primary uppercase">
            {copy.appName}
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

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label={copy.start.marketQuestion}
            className="h-9 rounded-lg border border-border bg-card px-3 text-sm"
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
            className="h-9 rounded-lg border border-border bg-card px-3 text-sm disabled:opacity-50"
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
          className="h-9 rounded-lg border border-border bg-card px-3 text-sm"
          value={activeVersion?.id ?? ''}
          onChange={(e) => {
            selectVersion(e.target.value || null)
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
        ) : null}
      </div>

      {/*
        A saved document that could not be read is offered back before the
        autosave writes over it. It is the one failure in this app that destroys
        work, and it used to happen without a word on screen.
      */}
      {unreadable ? (
        <Notice tone="warning" live>
          {copy.recovery.unreadable}
          <span className="mt-2 flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => {
                downloadBlob(
                  new Blob([unreadable], { type: 'application/json' }),
                  copy.recovery.fileName,
                )
                dismissUnreadable()
              }}
            >
              {copy.recovery.download}
            </Button>
            <Button size="sm" variant="ghost" onClick={dismissUnreadable}>
              {copy.recovery.dismiss}
            </Button>
          </span>
        </Notice>
      ) : null}

      {saveError ? <Notice tone="warning" live>{saveError}</Notice> : null}
      {message ? <Notice live>{message}</Notice> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(420px,42%)]">
        <div className="flex flex-col gap-4">
          {activeVersion ? (
            <VersionForm
              base={base}
              version={activeVersion}
              onChange={(change) => updateVersion(activeVersion.id, change)}
              onEditBase={() => {
                selectVersion(null)
                setMessage(null)
              }}
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
              disabled={!preview.blob}
              onClick={() => preview.blob && downloadBlob(preview.blob, resumeFileName(resume, activeVersion?.company))}
            >
              <Download />
              {preview.building ? copy.editor.building : copy.editor.download}
            </Button>
            <Button onClick={() => downloadJson(state.toDocument(), 'cv-match.json')}>
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
              onChange={(e) => void handleImport(e.target.files?.[0])}
            />
          </div>

          <div className="max-h-[80vh] overflow-y-auto rounded-card border border-border bg-muted p-4">
            {preview.error ? (
              <p className="text-sm text-severity-error">{preview.error}</p>
            ) : pdf.doc ? (
              <PdfPages doc={pdf.doc} onOpen={setZoomedPage} />
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
          resume={resume}
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
            : {})}
          onClose={() => setWritingLetter(false)}
        />
      ) : null}

      {zoomedPage !== null && pdf.doc ? (
        <PdfLightbox doc={pdf.doc} startPage={zoomedPage} onClose={() => setZoomedPage(null)} />
      ) : null}

      {creatingVersion ? (
        <NewVersionDialog
          onCreate={(input) => {
            state.addVersion(input)
            setMessage(null)
          }}
          onClose={() => setCreatingVersion(false)}
        />
      ) : null}

      {deletingVersion && activeVersion ? (
        <DeleteVersionDialog
          company={versionLabel(activeVersion)}
          onConfirm={() => state.deleteVersion(activeVersion.id)}
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
