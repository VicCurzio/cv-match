import { Download, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { downloadBlob } from '@/domain/export/download'
import {
  BODY_PLACEHOLDER,
  draftLetter,
  isUnwritten,
  type Letter,
} from '@/domain/letter/letterModel'
import type { MarketProfile } from '@/domain/market/marketProfile'
import type { Resume } from '@/domain/resume/resumeSchema'
import { Button } from '@/shared/ui/Button'
import { Notice } from '@/shared/ui/Card'
import { Dialog } from '@/shared/ui/Dialog'
import { TextAreaField, TextField } from '@/shared/ui/Field'
import { copy } from '@/shared/config/copy'
import { buildLetterPdf, letterFileName } from '@/templates/buildPdf'

/**
 * Structure and the facts from the resume are filled in. The paragraph that
 * says why this person wants this job is left to them, on purpose (ADR 0003):
 * a plausible-sounding paragraph nobody wrote is worse than a blank one, because
 * it gets sent.
 */

interface Props {
  resume: Resume
  profile: MarketProfile
  atsMode: boolean
  template: 'harvard' | 'modern'
  onClose: () => void
}

export function LetterDialog({ resume, profile, atsMode, template, onClose }: Props) {
  const [role, setRole] = useState('')
  const [company, setCompany] = useState('')
  const [recipient, setRecipient] = useState('')
  const [body, setBody] = useState(BODY_PLACEHOLDER)
  const [busy, setBusy] = useState(false)

  // The header and closing follow the job fields; only the body is the writer's.
  const letter: Letter = useMemo(
    () => ({ ...draftLetter(resume, { role, company, recipient }), body }),
    [resume, role, company, recipient, body],
  )

  const unwritten = isUnwritten(letter)

  async function download() {
    setBusy(true)
    const blob = await buildLetterPdf(resume, letter, { profile, atsMode, template })
    downloadBlob(blob, letterFileName(resume))
    setBusy(false)
  }

  return (
    <Dialog label={copy.letter.title} onClose={onClose} className="max-w-2xl">
      <div className="flex items-start justify-between gap-4 border-b border-border p-5">
        <div>
          <h2 className="text-base font-semibold">{copy.letter.title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{copy.letter.subtitle}</p>
        </div>
        <Button variant="ghost" size="icon" aria-label="Cerrar" onClick={onClose}>
          <X />
        </Button>
      </div>

      <div className="flex flex-col gap-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Puesto al que te postulás"
            placeholder="Auxiliar administrativa"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
          <TextField
            label="Empresa"
            placeholder="Banco Credicoop"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </div>

        <TextField
          label="A quién va dirigida (opcional)"
          hint="Si sabés el nombre, ponelo. Si no, queda 'Equipo de Selección'."
          placeholder="Equipo de Selección"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
        />

        <div className="rounded-lg border border-border p-3">
          <p className="text-xs font-medium text-muted-foreground">{copy.letter.autoLabel}</p>
          <p className="mt-1 text-sm">{letter.opening}</p>
        </div>

        <TextAreaField
          label="El párrafo que escribís vos"
          hint={copy.letter.bodyHint}
          className="min-h-36"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onFocus={(e) => {
            // Clear the guidance the first time, so nobody types around it.
            if (e.target.value === BODY_PLACEHOLDER) setBody('')
          }}
        />

        <div className="rounded-lg border border-border p-3">
          <p className="text-xs font-medium text-muted-foreground">{copy.letter.closingLabel}</p>
          <p className="mt-1 text-sm">{letter.closing}</p>
        </div>

        {unwritten ? <Notice tone="warning">{copy.letter.unwritten}</Notice> : null}

        <div className="flex flex-wrap gap-2">
          <Button variant="primary" disabled={unwritten || busy} onClick={() => void download()}>
            <Download />
            {busy ? copy.letter.building : copy.letter.download}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </div>

        <Notice>{copy.letter.noModel}</Notice>
      </div>
    </Dialog>
  )
}
