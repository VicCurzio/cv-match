import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { MarketProfile } from '@/domain/market/marketProfile'
import { PhotoDialog } from './PhotoDialog'
import {
  RESTRICTABLE_FIELDS,
  type EducationItem,
  type ExperienceItem,
  type LanguageItem,
  type RestrictableField,
  type Resume,
} from '@/domain/resume/resumeSchema'
import { newId } from '@/domain/resume/useResume'
import { Button } from '@/shared/ui/Button'
import { Section, Notice } from '@/shared/ui/Card'
import { SelectField, TextAreaField, TextField } from '@/shared/ui/Field'
import { copy } from '@/shared/config/copy'

/** The restrictable fields that are text inputs. The photo has its own control. */
type PersonalDataField = Exclude<RestrictableField, 'photo'>

/**
 * Written as a Record over the field union on purpose: adding a field to
 * `RESTRICTABLE_FIELDS` now fails to compile until this form has an input for
 * it. Marital status and nationality lived in the schema, in both market
 * profiles and in the rules for weeks with no way to type them or delete them,
 * precisely because nothing tied the two lists together.
 */
const PERSONAL_DATA_INPUTS: Record<PersonalDataField, { label: string; type?: string }> = {
  documentId: { label: 'Documento' },
  birthDate: { label: 'Fecha de nacimiento', type: 'date' },
  maritalStatus: { label: 'Estado civil' },
  nationality: { label: 'Nacionalidad' },
}

const PERSONAL_DATA_FIELDS = RESTRICTABLE_FIELDS.filter(
  (field): field is PersonalDataField => field !== 'photo',
)

interface Props {
  resume: Resume
  profile: MarketProfile
  atsMode: boolean
  onChange: (next: Resume | ((current: Resume) => Resume)) => void
  onPhotoError: (message: string) => void
}

export function ResumeForm({ resume, profile, atsMode, onChange, onPhotoError }: Props) {
  const [framing, setFraming] = useState<File | null>(null)
  const photoForbidden = profile.fields.photo === 'forbidden'
  const photoDisabled = photoForbidden || atsMode

  /*
   * One updater per list instead of the same map-by-index written out at every
   * input. Twelve copies of a line like this is twelve chances for one of them
   * to update the wrong list, and no way to see it by reading any single one.
   */
  const patchPersonal = (patch: Partial<Resume['personal']>) =>
    onChange((current) => ({ ...current, personal: { ...current.personal, ...patch } }))

  const patchExperience = (index: number, patch: Partial<ExperienceItem>) =>
    onChange((current) => ({
      ...current,
      experience: current.experience.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }))

  const patchEducation = (index: number, patch: Partial<EducationItem>) =>
    onChange((current) => ({
      ...current,
      education: current.education.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }))

  const patchLanguage = (index: number, patch: Partial<LanguageItem>) =>
    onChange((current) => ({
      ...current,
      languages: current.languages.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }))

  const removeExperience = (index: number) =>
    onChange((current) => ({
      ...current,
      experience: current.experience.filter((_, i) => i !== index),
    }))

  const removeEducation = (index: number) =>
    onChange((current) => ({
      ...current,
      education: current.education.filter((_, i) => i !== index),
    }))

  const removeLanguage = (index: number) =>
    onChange((current) => ({
      ...current,
      languages: current.languages.filter((_, i) => i !== index),
    }))

  // The chosen file goes to the framing dialog; only its result is stored.
  function handlePhoto(file: File | undefined) {
    if (file) setFraming(file)
  }

  /*
   * The personal-data block shows wherever the market allows those fields AND
   * wherever they already hold something. Rendering it only for Argentina meant
   * that switching to the international market hid the very fields the review
   * panel was asking the person to delete, with no way to reach them.
   */
  const personalDataAllowed = PERSONAL_DATA_FIELDS.some(
    (field) => profile.fields[field] !== 'forbidden',
  )
  const personalDataLoaded = PERSONAL_DATA_FIELDS.some((field) => Boolean(resume.personal[field]))

  return (
    <div className="flex flex-col gap-4">
      {framing ? (
        <PhotoDialog
          file={framing}
          onDone={(dataUrl) => patchPersonal({ photo: dataUrl })}
          onError={onPhotoError}
          onClose={() => setFraming(null)}
        />
      ) : null}

      <Section title={copy.editor.personal}>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Nombre y apellido"
            value={resume.personal.fullName}
            onChange={(e) => patchPersonal({ fullName: e.target.value })}
          />
          <TextField
            label="Título"
            hint="En qué trabajás, en tres o cuatro palabras."
            value={resume.personal.headline}
            onChange={(e) => patchPersonal({ headline: e.target.value })}
          />
          <TextField
            label="Correo electrónico"
            type="email"
            value={resume.personal.email}
            onChange={(e) => patchPersonal({ email: e.target.value })}
          />
          <TextField
            label="Teléfono"
            value={resume.personal.phone}
            onChange={(e) => patchPersonal({ phone: e.target.value })}
          />
          <TextField
            label="Ciudad"
            value={resume.personal.city}
            onChange={(e) => patchPersonal({ city: e.target.value })}
          />
          <TextField
            label={profile.id === 'AR' ? 'Provincia' : 'País'}
            value={
              (profile.id === 'AR' ? resume.personal.province : resume.personal.country) ?? ''
            }
            onChange={(e) =>
              patchPersonal(
                profile.id === 'AR' ? { province: e.target.value } : { country: e.target.value },
              )
            }
          />
          <TextField
            label="LinkedIn"
            value={resume.personal.linkedin ?? ''}
            onChange={(e) => patchPersonal({ linkedin: e.target.value })}
          />
          <TextField
            label="Sitio o portfolio"
            value={resume.personal.website ?? ''}
            onChange={(e) => patchPersonal({ website: e.target.value })}
          />
        </div>

        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <span className="text-xs font-medium text-muted-foreground">{copy.photo.label}</span>
          <div className="flex flex-wrap items-center gap-3">
            {resume.personal.photo ? (
              <img
                src={resume.personal.photo}
                alt="Tu foto de perfil"
                className="size-14 rounded-full object-cover"
              />
            ) : null}
            {/*
              The input is `sr-only`, never `hidden`. A display:none input is not
              focusable, so styling a span next to it produces a control that
              works with a mouse and does not exist for the keyboard -- there was
              no way to reach "subir foto" with Tab at all.
            */}
            <label
              className={
                photoDisabled
                  ? 'inline-flex h-9 cursor-not-allowed items-center rounded-lg border border-border px-3 text-sm opacity-50'
                  : 'inline-flex h-9 cursor-pointer items-center rounded-lg border border-border bg-card px-3 text-sm hover:bg-muted focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background'
              }
            >
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={photoDisabled}
                onChange={(e) => {
                  handlePhoto(e.target.files?.[0])
                  // Allow picking the same file again after cancelling.
                  e.target.value = ''
                }}
              />
              {copy.photo.add}
            </label>
            {resume.personal.photo ? (
              <Button variant="ghost" size="sm" onClick={() => patchPersonal({ photo: undefined })}>
                {copy.photo.remove}
              </Button>
            ) : null}
          </div>

          {photoForbidden ? (
            <Notice tone="warning" live>{copy.photo.blockedByMarket}</Notice>
          ) : null}
          {!photoForbidden && atsMode ? (
            <Notice tone="warning" live>{copy.photo.blockedByAts}</Notice>
          ) : null}
          {resume.personal.photo && photoDisabled ? (
            <Notice>{copy.photo.keptNotExported}</Notice>
          ) : null}
        </div>

        {personalDataAllowed || personalDataLoaded ? (
          <div className="flex flex-col gap-3 border-t border-border pt-4">
            <div>
              <span className="text-xs font-medium text-muted-foreground">
                {copy.editor.personalData}
              </span>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {copy.editor.personalDataHint}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {PERSONAL_DATA_FIELDS.map((field) => (
                <TextField
                  key={field}
                  label={PERSONAL_DATA_INPUTS[field].label}
                  type={PERSONAL_DATA_INPUTS[field].type}
                  value={resume.personal[field] ?? ''}
                  onChange={(e) => patchPersonal({ [field]: e.target.value })}
                />
              ))}
            </div>

            {!personalDataAllowed ? (
              <Notice tone="warning">{copy.editor.personalDataNotExported}</Notice>
            ) : null}
          </div>
        ) : null}
      </Section>

      <Section title={copy.editor.summary} description={copy.editor.summaryHint}>
        <TextAreaField
          label="Perfil"
          value={resume.summary}
          onChange={(e) => onChange((current) => ({ ...current, summary: e.target.value }))}
        />
      </Section>

      <Section
        title={copy.editor.experience}
        action={
          <Button
            size="sm"
            onClick={() =>
              onChange((current) => ({
                ...current,
                experience: [
                  ...current.experience,
                  {
                    id: newId('exp'),
                    role: '',
                    company: '',
                    startDate: '2024-01',
                    endDate: null,
                    bullets: [''],
                  },
                ],
              }))
            }
          >
            <Plus />
            {copy.editor.addExperience}
          </Button>
        }
      >
        {resume.experience.map((item, index) => (
          <div key={item.id} className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="Puesto"
                value={item.role}
                onChange={(e) => patchExperience(index, { role: e.target.value })}
              />
              <TextField
                label="Empresa"
                value={item.company}
                onChange={(e) => patchExperience(index, { company: e.target.value })}
              />
              <TextField
                label="Desde (AAAA-MM)"
                placeholder="2021-03"
                value={item.startDate}
                onChange={(e) => patchExperience(index, { startDate: e.target.value })}
              />
              <TextField
                label="Hasta (AAAA-MM)"
                placeholder="Vacío = actualidad"
                value={item.endDate ?? ''}
                onChange={(e) => patchExperience(index, { endDate: e.target.value || null })}
              />
            </div>

            <TextAreaField
              label="Qué hiciste (una línea por punto)"
              hint="Empezá con un verbo y sumá números: cuántos, cuánto tiempo, cuánto mejoraste."
              value={item.bullets.join('\n')}
              onChange={(e) => patchExperience(index, { bullets: e.target.value.split('\n') })}
            />

            <div>
              <Button variant="ghost" size="sm" onClick={() => removeExperience(index)}>
                <Trash2 />
                {copy.editor.remove}
              </Button>
            </div>
          </div>
        ))}
      </Section>

      <Section
        title={copy.editor.education}
        action={
          <Button
            size="sm"
            onClick={() =>
              onChange((current) => ({
                ...current,
                education: [
                  ...current.education,
                  { id: newId('edu'), title: '', institution: '', inProgress: false },
                ],
              }))
            }
          >
            <Plus />
            {copy.editor.addEducation}
          </Button>
        }
      >
        {resume.education.map((item, index) => (
          <div key={item.id} className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2">
            <TextField
              label="Título"
              value={item.title}
              onChange={(e) => patchEducation(index, { title: e.target.value })}
            />
            <TextField
              label="Institución"
              value={item.institution}
              onChange={(e) => patchEducation(index, { institution: e.target.value })}
            />
            <TextField
              label="Terminó (AAAA-MM)"
              placeholder="2019-12"
              value={item.endDate ?? ''}
              onChange={(e) => patchEducation(index, { endDate: e.target.value || undefined })}
            />
            <SelectField
              label="Estado"
              value={item.inProgress ? 'yes' : 'no'}
              onChange={(e) => patchEducation(index, { inProgress: e.target.value === 'yes' })}
            >
              <option value="no">Terminado</option>
              <option value="yes">En curso</option>
            </SelectField>
            <div className="sm:col-span-2">
              <Button variant="ghost" size="sm" onClick={() => removeEducation(index)}>
                <Trash2 />
                {copy.editor.remove}
              </Button>
            </div>
          </div>
        ))}
      </Section>

      <Section title={copy.editor.skills}>
        <TextAreaField
          label="Habilidades (una por línea)"
          hint="Sumá herramientas y sistemas concretos, no solo cualidades personales."
          value={resume.skills.join('\n')}
          onChange={(e) =>
            onChange((current) => ({ ...current, skills: e.target.value.split('\n') }))
          }
        />
      </Section>

      <Section
        title={copy.editor.languages}
        action={
          <Button
            size="sm"
            onClick={() =>
              onChange((current) => ({
                ...current,
                languages: [...current.languages, { id: newId('lang'), name: '', level: '' }],
              }))
            }
          >
            <Plus />
            {copy.editor.addLanguage}
          </Button>
        }
      >
        {resume.languages.map((item, index) => (
          <div key={item.id} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <TextField
              label="Idioma"
              value={item.name}
              onChange={(e) => patchLanguage(index, { name: e.target.value })}
            />
            <TextField
              label="Nivel"
              placeholder="Nativo, Intermedio, Básico"
              value={item.level}
              onChange={(e) => patchLanguage(index, { level: e.target.value })}
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label={`${copy.editor.remove} ${item.name}`}
              onClick={() => removeLanguage(index)}
            >
              <Trash2 />
            </Button>
          </div>
        ))}
      </Section>
    </div>
  )
}
