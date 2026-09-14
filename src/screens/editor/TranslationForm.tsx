import { Languages, Pencil } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { MarketId } from '@/domain/market/marketProfile'
import type { Resume } from '@/domain/resume/resumeSchema'
import { writeSegment, type SegmentPath, type SegmentRow, type Translation } from '@/domain/resume/translation'
import { buildTranslation } from '@/domain/translate/buildTranslation'
import {
  createTranslator,
  translatorAvailability,
  type TranslatorAvailability,
} from '@/domain/translate/browserTranslator'
import { Button } from '@/shared/ui/Button'
import { Notice, Section } from '@/shared/ui/Card'
import { TextAreaField, TextField } from '@/shared/ui/Field'
import { copy } from '@/shared/config/copy'
import { addedNumbers } from '@/shared/utils/text'

/**
 * The English resume, text by text: the Spanish it comes from beside the
 * English that will be printed, editable.
 *
 * Only the words are here. Dates, companies and contact details are not shown
 * as fields at all, because they are not translated: they are read from the
 * Spanish resume, and correcting one there corrects it in English (ADR 0008).
 */

interface Props {
  base: Resume
  segments: SegmentRow[]
  translation: Translation | undefined
  onChange: (next: Translation | ((current: Translation | undefined) => Translation)) => void
  market: MarketId
  onUseInternational: () => void
  onEditSpanish: () => void
}

const t = copy.translation

function fieldLabel(base: Resume, path: SegmentPath): string {
  const company = (id: string) => base.experience.find((item) => item.id === id)?.company ?? ''
  switch (path.kind) {
    case 'headline':
      return t.field.headline
    case 'summary':
      return t.field.summary
    case 'role':
      return t.field.role(company(path.id))
    case 'bullet':
      return t.field.bullet(company(path.id))
    case 'education':
      return t.field.education
    case 'courseTitle':
      return t.field.courseTitle
    case 'courseDetail':
      return t.field.courseDetail(base.courses.find((item) => item.id === path.id)?.title ?? '')
    case 'skill':
      return t.field.skill
    case 'languageName':
      return t.field.languageName
    case 'languageLevel':
      return t.field.languageLevel(base.languages.find((item) => item.id === path.id)?.name ?? '')
  }
}

function rowKey(row: SegmentRow): string {
  return `${row.path.kind}|${'id' in row.path ? row.path.id : ''}|${row.source}`
}

function needsLook(row: SegmentRow): boolean {
  return row.state !== 'translated' || row.review !== undefined
}

export function TranslationForm({ base, segments, translation, onChange, market, onUseInternational, onEditSpanish }: Props) {
  const [availability, setAvailability] = useState<TranslatorAvailability | null>(null)
  const [running, setRunning] = useState<{ done: number; total: number } | null>(null)
  const [download, setDownload] = useState<number | null>(null)
  const [failed, setFailed] = useState(false)
  /*
   * "Only what is left" is a snapshot taken when it is ticked. Filtered live,
   * a field vanished from under the cursor at the first letter typed into it.
   */
  const [onlyKeys, setOnlyKeys] = useState<Set<string> | null>(null)

  useEffect(() => {
    let alive = true
    void translatorAvailability().then((answer) => {
      if (alive) setAvailability(answer)
    })
    return () => {
      alive = false
    }
  }, [])

  const pending = segments.filter((row) => row.state !== 'translated')
  const toReview = segments.filter((row) => row.state === 'translated' && row.review)
  const translated = segments.length - pending.length
  const canTranslate = availability === 'available' || availability === 'downloadable' || availability === 'downloading'

  async function translateMissing() {
    setFailed(false)
    setRunning({ done: 0, total: pending.length })
    let translator: Awaited<ReturnType<typeof createTranslator>> | null = null
    try {
      // Created here, inside the click: the browser only downloads a model after a gesture.
      translator = await createTranslator((fraction) => setDownload(Math.round(fraction * 100)))
      setDownload(null)
      const next = await buildTranslation(base, translation, translator.translate, (done, total) =>
        setRunning({ done, total }),
      )
      onChange(next)
    } catch {
      setFailed(true)
    } finally {
      translator?.dispose()
      setRunning(null)
      setDownload(null)
    }
  }

  /**
   * A hand edit replaces the machine's text and its warnings, except the one
   * that is still true: figures that do not match the Spanish are flagged again.
   */
  function edit(row: SegmentRow, text: string) {
    const numbersDiffer =
      text.trim() !== '' && (addedNumbers(row.source, text).length > 0 || addedNumbers(text, row.source).length > 0)
    onChange((current) =>
      writeSegment(base, current, row.path, {
        source: row.source,
        text,
        ...(numbersDiffer ? { review: 'numbers-changed' as const } : {}),
      }),
    )
  }

  const shown = onlyKeys ? segments.filter((row) => onlyKeys.has(rowKey(row))) : segments

  return (
    <div className="flex flex-col gap-4">
      <Section title={t.title} description={t.subtitle}>
        <Notice>{t.onDevice}</Notice>

        {availability === null ? (
          <p className="text-sm text-muted-foreground">{t.checking}</p>
        ) : availability === 'unsupported' ? (
          <Notice tone="warning">{t.unsupported}</Notice>
        ) : availability === 'unavailable' ? (
          <Notice tone="warning">{t.unavailable}</Notice>
        ) : null}

        {canTranslate && pending.length > 0 ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" disabled={running !== null} onClick={() => void translateMissing()}>
              <Languages />
              {translated === 0 ? t.translate : t.translateRest(pending.length)}
            </Button>
            {download !== null ? (
              <span role="status" className="text-sm text-muted-foreground">
                {t.downloading(download)}
              </span>
            ) : running !== null ? (
              <span role="status" className="text-sm text-muted-foreground">
                {t.running(running.done, running.total)}
              </span>
            ) : null}
          </div>
        ) : null}

        {failed ? (
          <Notice tone="warning" live>
            {t.failed}
          </Notice>
        ) : null}

        {segments.length > 0 ? (
          <p role="status" className="text-sm">
            {pending.length === 0 && toReview.length === 0 ? t.allDone : t.progress(translated, segments.length)}
            {toReview.length > 0 ? ` ${t.toReview(toReview.length)}` : ''}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">{t.empty}</p>
        )}

        <Notice>{t.draft}</Notice>

        {market !== 'INTL' ? (
          <Notice>
            {t.suggestMarket}
            <span className="mt-2 flex">
              <Button size="sm" onClick={onUseInternational}>
                {t.useInternational}
              </Button>
            </span>
          </Notice>
        ) : null}

        <span className="flex">
          <Button size="sm" onClick={onEditSpanish}>
            <Pencil />
            {t.editSpanish}
          </Button>
        </span>
      </Section>

      {segments.length > 0 ? (
        <Section title={t.textsTitle}>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={onlyKeys !== null}
              onChange={(e) =>
                setOnlyKeys(e.target.checked ? new Set(segments.filter(needsLook).map(rowKey)) : null)
              }
            />
            {t.onlyPending}
          </label>
          {shown.length === 0 ? <p className="text-sm text-muted-foreground">{t.nothingPending}</p> : null}
          <ul className="flex flex-col gap-3">
            {shown.map((row, index) => {
              const label = fieldLabel(base, row.path)
              const value = row.text ?? row.previous ?? ''
              const long = row.path.kind === 'summary' || row.path.kind === 'bullet'
              const Field = long ? TextAreaField : TextField
              return (
                <li
                  key={`${rowKey(row)}|${index}`}
                  className="flex flex-col gap-2 rounded-lg border border-border p-3"
                >
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">{t.inSpanish}</span> {row.source}
                  </p>
                  <Field
                    label={t.englishLabel(label)}
                    value={value}
                    disabled={running !== null}
                    className={long ? 'min-h-16' : undefined}
                    onChange={(e) => edit(row, e.target.value)}
                  />
                  {row.state !== 'translated' ? (
                    <p className="text-xs text-severity-warning">{t.state[row.state]}</p>
                  ) : row.review ? (
                    <p className="text-xs text-severity-warning">{t.review[row.review]}</p>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </Section>
      ) : null}
    </div>
  )
}
