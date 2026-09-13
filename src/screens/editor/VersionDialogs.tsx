import { X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/shared/ui/Button'
import { Dialog } from '@/shared/ui/Dialog'
import { TextAreaField, TextField } from '@/shared/ui/Field'
import { copy } from '@/shared/config/copy'

export function NewVersionDialog({
  onCreate,
  onClose,
}: {
  onCreate: (input: { company: string; role: string; posting?: string }) => void
  onClose: () => void
}) {
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [posting, setPosting] = useState('')

  // Company and role name the version and fill the cover letter; without them
  // five versions end up called the same thing.
  const ready = company.trim() !== '' && role.trim() !== ''

  return (
    <Dialog label={copy.versions.newTitle} onClose={onClose} className="max-w-xl">
      <div className="flex items-start justify-between gap-4 border-b border-border p-5">
        <div>
          <h2 className="text-base font-semibold">{copy.versions.newTitle}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{copy.versions.newSubtitle}</p>
        </div>
        <Button variant="ghost" size="icon" aria-label="Cerrar" onClick={onClose}>
          <X />
        </Button>
      </div>

      <form
        className="flex flex-col gap-4 p-5"
        onSubmit={(e) => {
          e.preventDefault()
          if (!ready) return
          onCreate({ company, role, posting })
          onClose()
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label={copy.versions.company}
            placeholder="Banco Columbia"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
          <TextField
            label={copy.versions.role}
            placeholder="Oficial de atención"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
        </div>

        <TextAreaField
          label={copy.versions.posting}
          hint={copy.versions.postingHint}
          value={posting}
          onChange={(e) => setPosting(e.target.value)}
        />

        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="primary" disabled={!ready}>
            {copy.versions.createButton}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            {copy.versions.cancel}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

/**
 * Says exactly what goes and what stays. "¿Seguro?" alone makes people wonder
 * whether deleting a version deletes their jobs too -- and it does not.
 */
export function DeleteVersionDialog({
  company,
  onConfirm,
  onClose,
}: {
  company: string
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Dialog label={copy.versions.removeTitle} onClose={onClose} className="max-w-md" align="center">
      <div className="flex flex-col gap-4 p-5">
        <h2 className="text-base font-semibold">{copy.versions.removeTitle}</h2>
        <p className="text-sm text-muted-foreground">{copy.versions.removeBody(company)}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {copy.versions.removeConfirm}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            {copy.versions.cancel}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
