import { FileUp, Loader2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { extractText } from '@/domain/ingest/extractText'
import { mapToResume, type ImportDraft } from '@/domain/ingest/mapToResume'
import { parseEducation } from '@/domain/ingest/parseEducation'
import { parseExperience } from '@/domain/ingest/parseExperience'
import type { Resume } from '@/domain/resume/resumeSchema'
import { newId } from '@/domain/resume/useResume'
import { Button } from '@/shared/ui/Button'
import { Notice } from '@/shared/ui/Card'
import { Dialog } from '@/shared/ui/Dialog'
import { copy } from '@/shared/config/copy'

/**
 * Importing is guesswork over a format that carries no structure, so the result
 * is always shown for review. Nothing is applied blindly, and whatever could not
 * be placed is listed rather than dropped.
 */

type Stage =
  | { name: 'choose' }
  | { name: 'reading' }
  | { name: 'failed'; message: string }
  | { name: 'review'; draft: ImportDraft }

interface Props {
  current: Resume
  onApply: (next: Resume) => void
  onClose: () => void
}

/** Which parts of the draft the person wants to keep. */
type Picks = Record<'identity' | 'contact' | 'summary' | 'experience' | 'education' | 'skills', boolean>

export function ImportDialog({ current, onApply, onClose }: Props) {
  const [stage, setStage] = useState<Stage>({ name: 'choose' })
  const [picks, setPicks] = useState<Picks>({
    identity: true,
    contact: true,
    summary: true,
    experience: true,
    education: true,
    skills: true,
  })

  async function handleFile(file: File | undefined) {
    if (!file) return
    setStage({ name: 'reading' })
    const result = await extractText(file)
    if (!result.ok) {
      setStage({ name: 'failed', message: result.message })
      return
    }
    setStage({ name: 'review', draft: mapToResume(result.lines) })
  }

  function apply(draft: ImportDraft) {
    const experience = picks.experience ? parseExperience(draft.experienceText) : []
    const education = picks.education ? parseEducation(draft.educationText) : []

    onApply({
      ...current,
      personal: {
        ...current.personal,
        ...(picks.identity && draft.fullName ? { fullName: draft.fullName } : {}),
        ...(picks.identity && draft.headline ? { headline: draft.headline } : {}),
        ...(picks.contact && draft.email ? { email: draft.email } : {}),
        ...(picks.contact && draft.phone ? { phone: draft.phone } : {}),
        ...(picks.contact && draft.city ? { city: draft.city } : {}),
        ...(picks.contact && draft.linkedin ? { linkedin: draft.linkedin } : {}),
      },
      summary: picks.summary && draft.summary ? draft.summary : current.summary,
      experience:
        experience.length > 0
          ? experience.map((item) => ({ ...item, id: newId('exp') }))
          : current.experience,
      education:
        education.length > 0
          ? education.map((item) => ({ ...item, id: newId('edu') }))
          : current.education,
      skills: picks.skills && draft.skills.length > 0 ? draft.skills : current.skills,
    })
    onClose()
  }

  return (
    <Dialog label={copy.import.title} onClose={onClose} className="max-w-2xl">
      <div className="flex items-start justify-between gap-4 border-b border-border p-5">
        <div>
          <h2 className="text-base font-semibold">{copy.import.title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{copy.import.subtitle}</p>
        </div>
        <Button variant="ghost" size="icon" aria-label="Cerrar" onClick={onClose}>
          <X />
        </Button>
      </div>

      <div className="p-5">
        {stage.name === 'choose' ? (
          <label className="flex cursor-pointer flex-col items-center gap-3 rounded-card border border-dashed border-border p-10 text-center hover:bg-muted focus-within:border-primary focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background">
            <FileUp className="size-6 text-muted-foreground" />
            <span className="text-sm font-medium">{copy.import.pick}</span>
            <span className="text-xs text-muted-foreground">{copy.import.formats}</span>
            {/* `sr-only`, not `hidden`: a display:none input cannot be tabbed to. */}
            <input
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="sr-only"
              onChange={(e) => void handleFile(e.target.files?.[0])}
            />
          </label>
        ) : null}

        {stage.name === 'reading' ? (
          <p className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {copy.import.reading}
          </p>
        ) : null}

        {stage.name === 'failed' ? (
          <div className="flex flex-col gap-4">
            <Notice tone="warning" live>{stage.message}</Notice>
            <div className="flex gap-2">
              <Button onClick={() => setStage({ name: 'choose' })}>{copy.import.tryAnother}</Button>
              <Button variant="ghost" onClick={onClose}>
                {copy.import.byHand}
              </Button>
            </div>
          </div>
        ) : null}

        {stage.name === 'review' ? (
          <Review
            draft={stage.draft}
            picks={picks}
            onToggle={(key) => setPicks((p) => ({ ...p, [key]: !p[key] }))}
            onApply={() => apply(stage.draft)}
            onCancel={() => setStage({ name: 'choose' })}
          />
        ) : null}
      </div>
    </Dialog>
  )
}

function Row({
  label,
  value,
  checked,
  onToggle,
}: {
  label: string
  value: string
  checked: boolean
  onToggle: () => void
}) {
  const empty = !value.trim()
  return (
    <label className="flex items-start gap-3 border-b border-border py-2.5 last:border-0">
      <input
        type="checkbox"
        className="mt-1"
        checked={checked && !empty}
        disabled={empty}
        onChange={onToggle}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium text-muted-foreground">{label}</span>
        <span className={empty ? 'block text-sm text-muted-foreground italic' : 'block text-sm'}>
          {empty ? copy.import.notFound : value}
        </span>
      </span>
    </label>
  )
}

function Review({
  draft,
  picks,
  onToggle,
  onApply,
  onCancel,
}: {
  draft: ImportDraft
  picks: Picks
  onToggle: (key: keyof Picks) => void
  onApply: () => void
  onCancel: () => void
}) {
  const experience = useMemo(() => parseExperience(draft.experienceText), [draft.experienceText])
  const education = useMemo(() => parseEducation(draft.educationText), [draft.educationText])

  return (
    <div className="flex flex-col gap-4">
      <Notice>{copy.import.reviewHint}</Notice>

      <div>
        <Row
          label="Nombre y título"
          value={[draft.fullName, draft.headline].filter(Boolean).join(' — ')}
          checked={picks.identity}
          onToggle={() => onToggle('identity')}
        />
        <Row
          label="Contacto"
          value={[draft.email, draft.phone, draft.city, draft.linkedin].filter(Boolean).join(' · ')}
          checked={picks.contact}
          onToggle={() => onToggle('contact')}
        />
        <Row
          label="Perfil profesional"
          value={draft.summary}
          checked={picks.summary}
          onToggle={() => onToggle('summary')}
        />
        <Row
          label={`Experiencia (${experience.length} ${experience.length === 1 ? 'puesto' : 'puestos'})`}
          value={experience.map((e) => `${e.role || 'sin puesto'} · ${e.company}`).join(' | ')}
          checked={picks.experience}
          onToggle={() => onToggle('experience')}
        />
        <Row
          label={`Educación (${education.length} ${education.length === 1 ? 'estudio' : 'estudios'})`}
          value={education.map((e) => [e.title, e.institution].filter(Boolean).join(' · ')).join(' | ')}
          checked={picks.education}
          onToggle={() => onToggle('education')}
        />
        <Row
          label={`Habilidades (${draft.skills.length})`}
          value={draft.skills.join(' · ')}
          checked={picks.skills}
          onToggle={() => onToggle('skills')}
        />
      </div>

      {draft.leftovers.length > 0 ? (
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs font-medium text-muted-foreground">{copy.import.leftovers}</p>
          <ul className="mt-1.5 flex flex-col gap-1">
            {draft.leftovers.map((line, index) => (
              <li key={index} className="text-xs">
                {line}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={onApply}>
          {copy.import.apply}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          {copy.import.another}
        </Button>
      </div>
    </div>
  )
}
