import { ArrowDown, ArrowUp, Pencil } from 'lucide-react'
import type { ReactNode } from 'react'
import type { ExperienceItem, Resume } from '@/domain/resume/resumeSchema'
import {
  orderedSkills,
  patchOverrides,
  bulletRewrite,
  resolveVersion,
  setBulletRewrite,
  toggleHidden,
  type Overrides,
  type Version,
} from '@/domain/resume/versions'
import { Button } from '@/shared/ui/Button'
import { Notice, Section } from '@/shared/ui/Card'
import { TextAreaField, TextField } from '@/shared/ui/Field'
import { copy } from '@/shared/config/copy'
import { contactParts, formatRange, formatYearMonth, languageLevel } from '@/templates/shared/format'
import { PostingMatch } from './PostingMatch'

/**
 * The editor of a version: what may change, editable; what may not, visible.
 *
 * The facts are shown rather than hidden. Someone adapting their resume has to
 * see the whole thing they are about to send -- hiding the jobs because they
 * cannot be edited here would make the version look like a different, shorter
 * resume. They are read-only, with a way back to the base, because a version
 * that could change a date would be a version that can lie (ADR 0006).
 */

interface Props {
  base: Resume
  version: Version
  onChange: (change: (version: Version) => Version) => void
  onEditBase: () => void
}

export function VersionForm({ base, version, onChange, onEditBase }: Props) {
  const layer = version.overrides
  const patch = (next: Partial<Overrides>) => onChange((current) => patchOverrides(current, next))

  const skills = orderedSkills(base.skills, layer.skillOrder)
  const skillsChanged = layer.skillOrder !== undefined || layer.hiddenSkills.length > 0

  function moveSkill(index: number, offset: -1 | 1) {
    const target = index + offset
    if (target < 0 || target >= skills.length) return
    const next = [...skills]
    ;[next[index], next[target]] = [next[target] as string, next[index] as string]
    patch({ skillOrder: next })
  }

  const editBase = (
    <Button size="sm" onClick={onEditBase}>
      <Pencil />
      {copy.versions.editBase}
    </Button>
  )

  return (
    <div className="flex flex-col gap-4">
      <Section title={copy.versions.postingSection}>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label={copy.versions.company}
            value={version.company}
            onChange={(e) => onChange((current) => ({ ...current, company: e.target.value }))}
          />
          <TextField
            label={copy.versions.role}
            value={version.role}
            onChange={(e) => onChange((current) => ({ ...current, role: e.target.value }))}
          />
        </div>
        <TextAreaField
          label={copy.versions.posting}
          value={version.posting ?? ''}
          onChange={(e) =>
            onChange((current) => ({ ...current, posting: e.target.value || undefined }))
          }
        />
        <PostingMatch
          posting={version.posting ?? ''}
          resume={resolveVersion(base, version)}
          company={version.company}
        />
        <Notice>{copy.versions.rule}</Notice>
      </Section>

      <Section title={copy.versions.headline}>
        <TextField
          label={copy.versions.headline}
          value={layer.headline ?? base.personal.headline}
          onChange={(e) => patch({ headline: e.target.value })}
        />
        <OverrideStatus changed={layer.headline !== undefined} onReset={() => patch({ headline: undefined })} />
      </Section>

      <Section title={copy.versions.summary} description={copy.editor.summaryHint}>
        <TextAreaField
          label={copy.versions.summary}
          value={layer.summary ?? base.summary}
          onChange={(e) => patch({ summary: e.target.value })}
        />
        <OverrideStatus changed={layer.summary !== undefined} onReset={() => patch({ summary: undefined })} />
      </Section>

      <Section title={copy.versions.skills} description={copy.versions.skillsHint}>
        {skills.length === 0 ? (
          <p className="text-sm text-muted-foreground">{copy.versions.empty}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {skills.map((skill, index) => (
              <li
                key={skill}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5"
              >
                <label className="flex flex-1 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!layer.hiddenSkills.includes(skill)}
                    onChange={(e) =>
                      patch({ hiddenSkills: toggleHidden(layer.hiddenSkills, skill, e.target.checked) })
                    }
                  />
                  <span className={layer.hiddenSkills.includes(skill) ? 'text-muted-foreground line-through' : ''}>
                    {skill}
                  </span>
                </label>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={copy.versions.moveUp(skill)}
                  disabled={index === 0}
                  onClick={() => moveSkill(index, -1)}
                >
                  <ArrowUp />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={copy.versions.moveDown(skill)}
                  disabled={index === skills.length - 1}
                  onClick={() => moveSkill(index, 1)}
                >
                  <ArrowDown />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <OverrideStatus
          changed={skillsChanged}
          onReset={() => patch({ skillOrder: undefined, hiddenSkills: [] })}
        />
      </Section>

      <Section title={copy.versions.facts} description={copy.versions.factsHint} action={editBase}>
        <FactGroup title={copy.editor.experience} empty={base.experience.length === 0}>
          {base.experience.map((item) => (
            <FactItem
              key={item.id}
              shown={!layer.hiddenExperience.includes(item.id)}
              onToggle={(show) =>
                patch({ hiddenExperience: toggleHidden(layer.hiddenExperience, item.id, show) })
              }
              title={[item.role, item.company].filter(Boolean).join(' - ')}
              detail={formatRange(item)}
            >
              <BulletEditor
                item={item}
                version={version}
                onChange={(bullets) => onChange((current) => setBulletRewrite(current, item.id, bullets))}
              />
            </FactItem>
          ))}
        </FactGroup>

        <FactGroup title={copy.editor.education} empty={base.education.length === 0}>
          {base.education.map((item) => (
            <FactItem
              key={item.id}
              shown={!layer.hiddenEducation.includes(item.id)}
              onToggle={(show) =>
                patch({ hiddenEducation: toggleHidden(layer.hiddenEducation, item.id, show) })
              }
              title={[item.title, item.institution].filter(Boolean).join(' - ')}
              detail={item.inProgress ? 'en curso' : formatYearMonth(item.endDate)}
            />
          ))}
        </FactGroup>

        <FactGroup title={copy.editor.courses} empty={base.courses.length === 0}>
          {base.courses.map((item) => (
            <FactItem
              key={item.id}
              shown={!layer.hiddenCourses.includes(item.id)}
              onToggle={(show) =>
                patch({ hiddenCourses: toggleHidden(layer.hiddenCourses, item.id, show) })
              }
              title={[item.title, item.institution].filter(Boolean).join(' - ')}
              detail={[item.inProgress ? 'en curso' : formatYearMonth(item.endDate), item.detail]
                .filter(Boolean)
                .join(' · ')}
            />
          ))}
        </FactGroup>

        <FactGroup title={copy.editor.personal} empty={false}>
          <p className="text-sm">{base.personal.fullName || 'Sin nombre'}</p>
          <p className="text-xs text-muted-foreground">{contactParts(base).join('  |  ')}</p>
        </FactGroup>

        {base.languages.length > 0 ? (
          <FactGroup title={copy.editor.languages} empty={false}>
            <p className="text-sm">
              {base.languages
                .map((language) =>
                  languageLevel(language) ? `${language.name} (${languageLevel(language)})` : language.name,
                )
                .join(' · ')}
            </p>
          </FactGroup>
        ) : null}
      </Section>
    </div>
  )
}

function OverrideStatus({ changed, onReset }: { changed: boolean; onReset: () => void }) {
  if (!changed) {
    return <p className="text-xs text-muted-foreground">{copy.versions.sameAsBase}</p>
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-primary">{copy.versions.changed}</span>
      <Button variant="ghost" size="sm" onClick={onReset}>
        {copy.versions.backToBase}
      </Button>
    </div>
  )
}

function FactGroup({ title, empty, children }: { title: string; empty: boolean; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h3>
      {empty ? <p className="text-sm text-muted-foreground">{copy.versions.empty}</p> : children}
    </div>
  )
}

function FactItem({
  shown,
  onToggle,
  title,
  detail,
  children,
}: {
  shown: boolean
  onToggle: (show: boolean) => void
  title: string
  detail: string
  children?: ReactNode
}) {
  // The label wraps only the checkbox and the title. Anything interactive in
  // `children` -- the bullet editor -- must sit outside it, or clicking into the
  // textarea would also toggle whether the job is shown.
  return (
    <div className={`flex flex-col gap-2 rounded-lg border border-border p-3 ${shown ? '' : 'opacity-60'}`}>
      <label className="flex gap-3">
        <input
          type="checkbox"
          className="mt-1"
          aria-label={`${copy.versions.show}: ${title}`}
          checked={shown}
          onChange={(e) => onToggle(e.target.checked)}
        />
        <span className="flex flex-1 flex-wrap items-baseline justify-between gap-2">
          <span className={`text-sm font-medium ${shown ? '' : 'line-through'}`}>{title}</span>
          {detail ? <span className="text-xs text-muted-foreground">{detail}</span> : null}
        </span>
      </label>
      {children ? <div className="pl-7">{children}</div> : null}
    </div>
  )
}

/**
 * A job's bullets, and the way to reword them for this posting.
 *
 * The base bullets show until the person asks to rewrite; the textarea then
 * starts from them, so the numbers are already there to keep. A rewrite that
 * states a number the base does not is kept -- the text is not thrown away --
 * but it is not exported, and the notice names the number.
 */
function BulletEditor({
  item,
  version,
  onChange,
}: {
  item: ExperienceItem
  version: Version
  onChange: (bullets: string[] | undefined) => void
}) {
  const rewrite = bulletRewrite(item, version)
  const baseBullets = item.bullets.filter((bullet) => bullet.trim())

  if (rewrite.status === 'none') {
    return (
      <div className="flex flex-col gap-2">
        {baseBullets.length > 0 ? (
          <ul className="list-disc pl-5 text-xs text-muted-foreground">
            {baseBullets.map((bullet, index) => (
              <li key={index}>{bullet}</li>
            ))}
          </ul>
        ) : null}
        {baseBullets.length > 0 ? (
          <div>
            <Button variant="ghost" size="sm" onClick={() => onChange(baseBullets)}>
              <Pencil />
              {copy.versions.rewriteBullets}
            </Button>
          </div>
        ) : null}
      </div>
    )
  }

  const text = (version.overrides.bullets?.[item.id] ?? []).join('\n')

  return (
    <div className="flex flex-col gap-2">
      <TextAreaField
        label={copy.versions.bulletsLabel}
        hint={copy.versions.bulletsHint}
        value={text}
        onChange={(e) => onChange(e.target.value.split('\n'))}
      />
      {rewrite.status === 'blocked' ? (
        <Notice tone="warning" live>
          {copy.versions.bulletsBlocked(rewrite.added)}
        </Notice>
      ) : null}
      <OverrideStatus changed onReset={() => onChange(undefined)} />
    </div>
  )
}
