import { Plus, Trash2 } from 'lucide-react'
import type { MarketProfile } from '@/domain/market/marketProfile'
import { compressPhoto } from '@/domain/photo/compressPhoto'
import type { Resume } from '@/domain/resume/resumeSchema'
import { newId } from '@/domain/resume/useResume'
import { Button } from '@/shared/ui/Button'
import { Section, Notice } from '@/shared/ui/Card'
import { SelectField, TextAreaField, TextField } from '@/shared/ui/Field'
import { copy } from '@/shared/config/copy'

interface Props {
  resume: Resume
  profile: MarketProfile
  atsMode: boolean
  onChange: (next: Resume | ((current: Resume) => Resume)) => void
  onPhotoError: (message: string) => void
}

export function ResumeForm({ resume, profile, atsMode, onChange, onPhotoError }: Props) {
  const photoForbidden = profile.fields.photo === 'forbidden'
  const photoDisabled = photoForbidden || atsMode

  const patchPersonal = (patch: Partial<Resume['personal']>) =>
    onChange((current) => ({ ...current, personal: { ...current.personal, ...patch } }))

  async function handlePhoto(file: File | undefined) {
    if (!file) return
    const result = await compressPhoto(file)
    if (result.ok) patchPersonal({ photo: result.dataUrl })
    else onPhotoError(result.message)
  }

  return (
    <div className="flex flex-col gap-4">
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
            <label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={photoDisabled}
                onChange={(e) => void handlePhoto(e.target.files?.[0])}
              />
              <span
                className={
                  photoDisabled
                    ? 'inline-flex h-9 cursor-not-allowed items-center rounded-lg border border-border px-3 text-sm opacity-50'
                    : 'inline-flex h-9 cursor-pointer items-center rounded-lg border border-border bg-card px-3 text-sm hover:bg-muted'
                }
              >
                {copy.photo.add}
              </span>
            </label>
            {resume.personal.photo ? (
              <Button variant="ghost" size="sm" onClick={() => patchPersonal({ photo: undefined })}>
                {copy.photo.remove}
              </Button>
            ) : null}
          </div>

          {photoForbidden ? <Notice tone="warning">{copy.photo.blockedByMarket}</Notice> : null}
          {!photoForbidden && atsMode ? (
            <Notice tone="warning">{copy.photo.blockedByAts}</Notice>
          ) : null}
          {resume.personal.photo && photoDisabled ? (
            <Notice>{copy.photo.keptNotExported}</Notice>
          ) : null}
        </div>

        {profile.id === 'AR' ? (
          <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
            <TextField
              label="Documento (opcional)"
              value={resume.personal.documentId ?? ''}
              onChange={(e) => patchPersonal({ documentId: e.target.value })}
            />
            <TextField
              label="Fecha de nacimiento (opcional)"
              type="date"
              value={resume.personal.birthDate ?? ''}
              onChange={(e) => patchPersonal({ birthDate: e.target.value })}
            />
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
                onChange={(e) =>
                  onChange((current) => ({
                    ...current,
                    experience: current.experience.map((x, i) =>
                      i === index ? { ...x, role: e.target.value } : x,
                    ),
                  }))
                }
              />
              <TextField
                label="Empresa"
                value={item.company}
                onChange={(e) =>
                  onChange((current) => ({
                    ...current,
                    experience: current.experience.map((x, i) =>
                      i === index ? { ...x, company: e.target.value } : x,
                    ),
                  }))
                }
              />
              <TextField
                label="Desde (AAAA-MM)"
                placeholder="2021-03"
                value={item.startDate}
                onChange={(e) =>
                  onChange((current) => ({
                    ...current,
                    experience: current.experience.map((x, i) =>
                      i === index ? { ...x, startDate: e.target.value } : x,
                    ),
                  }))
                }
              />
              <TextField
                label="Hasta (AAAA-MM)"
                placeholder="Vacío = actualidad"
                value={item.endDate ?? ''}
                onChange={(e) =>
                  onChange((current) => ({
                    ...current,
                    experience: current.experience.map((x, i) =>
                      i === index ? { ...x, endDate: e.target.value || null } : x,
                    ),
                  }))
                }
              />
            </div>

            <TextAreaField
              label="Qué hiciste (una línea por punto)"
              hint="Empezá con un verbo y sumá números: cuántos, cuánto tiempo, cuánto mejoraste."
              value={item.bullets.join('\n')}
              onChange={(e) =>
                onChange((current) => ({
                  ...current,
                  experience: current.experience.map((x, i) =>
                    i === index ? { ...x, bullets: e.target.value.split('\n') } : x,
                  ),
                }))
              }
            />

            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  onChange((current) => ({
                    ...current,
                    experience: current.experience.filter((_, i) => i !== index),
                  }))
                }
              >
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
              onChange={(e) =>
                onChange((current) => ({
                  ...current,
                  education: current.education.map((x, i) =>
                    i === index ? { ...x, title: e.target.value } : x,
                  ),
                }))
              }
            />
            <TextField
              label="Institución"
              value={item.institution}
              onChange={(e) =>
                onChange((current) => ({
                  ...current,
                  education: current.education.map((x, i) =>
                    i === index ? { ...x, institution: e.target.value } : x,
                  ),
                }))
              }
            />
            <TextField
              label="Terminó (AAAA-MM)"
              placeholder="2019-12"
              value={item.endDate ?? ''}
              onChange={(e) =>
                onChange((current) => ({
                  ...current,
                  education: current.education.map((x, i) =>
                    i === index ? { ...x, endDate: e.target.value || undefined } : x,
                  ),
                }))
              }
            />
            <SelectField
              label="Estado"
              value={item.inProgress ? 'yes' : 'no'}
              onChange={(e) =>
                onChange((current) => ({
                  ...current,
                  education: current.education.map((x, i) =>
                    i === index ? { ...x, inProgress: e.target.value === 'yes' } : x,
                  ),
                }))
              }
            >
              <option value="no">Terminado</option>
              <option value="yes">En curso</option>
            </SelectField>
            <div className="sm:col-span-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  onChange((current) => ({
                    ...current,
                    education: current.education.filter((_, i) => i !== index),
                  }))
                }
              >
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
              onChange={(e) =>
                onChange((current) => ({
                  ...current,
                  languages: current.languages.map((x, i) =>
                    i === index ? { ...x, name: e.target.value } : x,
                  ),
                }))
              }
            />
            <TextField
              label="Nivel"
              placeholder="Nativo, Intermedio, Básico"
              value={item.level}
              onChange={(e) =>
                onChange((current) => ({
                  ...current,
                  languages: current.languages.map((x, i) =>
                    i === index ? { ...x, level: e.target.value } : x,
                  ),
                }))
              }
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label={`${copy.editor.remove} ${item.name}`}
              onClick={() =>
                onChange((current) => ({
                  ...current,
                  languages: current.languages.filter((_, i) => i !== index),
                }))
              }
            >
              <Trash2 />
            </Button>
          </div>
        ))}
      </Section>
    </div>
  )
}
