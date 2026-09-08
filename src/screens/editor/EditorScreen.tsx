import { Download, FileJson, FileUp, Mail, Upload } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { runAnalysis } from '@/domain/analysis/runAnalysis'
import { downloadBlob, downloadJson } from '@/domain/export/download'
import { MARKET_PROFILES, type MarketId } from '@/domain/market/marketProfile'
import { parseResumeJson } from '@/domain/resume/storage'
import type { ResumeState } from '@/domain/resume/useResume'
import { ImportDialog } from '@/screens/import/ImportDialog'
import { LetterDialog } from '@/screens/letter/LetterDialog'
import { ReviewPanel } from '@/screens/review/ReviewPanel'
import { Button } from '@/shared/ui/Button'
import { Notice } from '@/shared/ui/Card'
import { copy } from '@/shared/config/copy'
import { resumeFileName } from '@/templates/buildPdf'
import { ResumeForm } from './ResumeForm'
import { usePdfPreview } from './usePdfPreview'

export function EditorScreen({ state }: { state: ResumeState }) {
  const { resume, settings, setResume, setSettings, replaceAll, saveError } = state
  const [message, setMessage] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [writingLetter, setWritingLetter] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const profile = MARKET_PROFILES[settings.market]

  const buildOptions = useMemo(
    () => ({ profile, atsMode: settings.atsMode, template: settings.template }),
    [profile, settings.atsMode, settings.template],
  )

  const preview = usePdfPreview(resume, buildOptions)

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

  function changeMarket(market: MarketId) {
    setSettings({ market })
    const stripped = MARKET_PROFILES[market]
    const removed = (['photo', 'documentId', 'birthDate'] as const).filter(
      (field) => stripped.fields[field] === 'forbidden' && resume.personal[field],
    )
    setMessage(
      removed.length > 0
        ? `En ${stripped.label} el CV va sin ${removed.length === 1 ? 'ese dato' : 'esos datos'}. Queda guardado, simplemente no se exporta.`
        : null,
    )
  }

  async function handleImport(file: File | undefined) {
    if (!file) return
    const result = parseResumeJson(await file.text())
    if (result.ok) {
      replaceAll(result.resume)
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

      {saveError ? <Notice tone="warning">{saveError}</Notice> : null}
      {message ? <Notice>{message}</Notice> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(420px,42%)]">
        <div className="flex flex-col gap-4">
          <ResumeForm
            resume={resume}
            profile={profile}
            atsMode={settings.atsMode}
            onChange={setResume}
            onPhotoError={setMessage}
          />
        </div>

        <div className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              disabled={!preview.blob}
              onClick={() => preview.blob && downloadBlob(preview.blob, resumeFileName(resume))}
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

          <div className="overflow-hidden rounded-card border border-border bg-muted">
            {preview.error ? (
              <p className="p-4 text-sm text-severity-error">{preview.error}</p>
            ) : preview.url ? (
              <iframe
                key={preview.url}
                src={preview.url}
                title={copy.editor.preview}
                className="h-[720px] w-full border-0"
              />
            ) : (
              <div className="h-[720px] w-full animate-pulse bg-muted" />
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
          onClose={() => setWritingLetter(false)}
        />
      ) : null}

      {importing ? (
        <ImportDialog
          current={resume}
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
