import { z } from 'zod'
import { addedNumbers } from '@/shared/utils/text'
import type { ExperienceItem, Resume } from './resumeSchema'
import { settingsSchema, type Settings } from './settings'

/**
 * A version of the resume aimed at one job posting.
 *
 * It is a LAYER over the base resume, not a copy of it (ADR 0006). The version
 * stores only what it changes about how the resume is told; every fact is read
 * from the base. So a typo fixed once in the base is fixed in every version --
 * with copies, the one someone forgets to fix is the one that gets sent.
 */

/**
 * What a version may change. Strict on purpose, and this is the product rule
 * living in code rather than in a promise: there is no key here for a job title,
 * a date or a contact detail, and an object carrying one is rejected. No screen
 * written later can store a version that says something the base does not,
 * because there is nowhere to put it. The one field that holds numbers -- the
 * rewritten bullets -- is checked against the base on every read instead.
 *
 * Adapting a resume to a posting is telling it differently, never telling
 * something else.
 */
export const overridesSchema = z.strictObject({
  headline: z.string().optional(),
  summary: z.string().optional(),
  /**
   * The order this version shows the skills in. Skills are plain strings with
   * no id, so a skill the base gains -- or renames -- later is not in this list;
   * those are appended at the end rather than dropped. Showing one too many is
   * a visible, fixable failure. Losing one silently is not.
   */
  skillOrder: z.array(z.string()).optional(),
  hiddenSkills: z.array(z.string()).default([]),
  /**
   * Bullets rewritten for this posting, by experience id. The one override that
   * sits next to facts: a bullet carries numbers, and a version may not change
   * a number. So a rewrite is only ever APPLIED when every number it states is
   * in the base bullets -- see `bulletRewrite`. It is stored either way, so
   * the person does not lose their text while they fix it.
   */
  bullets: z.record(z.string(), z.array(z.string())).optional(),
  hiddenExperience: z.array(z.string()).default([]),
  hiddenEducation: z.array(z.string()).default([]),
  hiddenCourses: z.array(z.string()).default([]),
})

export type Overrides = z.infer<typeof overridesSchema>

/**
 * The part of a cover letter the person types. The opening and the closing are
 * rebuilt from the resume every time (see `domain/letter`), so only these two
 * are worth keeping.
 */
export const letterDraftSchema = z.strictObject({
  recipient: z.string(),
  body: z.string(),
})

export type LetterDraft = z.infer<typeof letterDraftSchema>

export const versionSchema = z.strictObject({
  id: z.string(),
  company: z.string(),
  role: z.string(),
  /** The posting's text or link. Kept so it can be compared against later. */
  posting: z.string().optional(),
  settings: settingsSchema,
  overrides: overridesSchema,
  letter: letterDraftSchema.optional(),
})

export type Version = z.infer<typeof versionSchema>

export const emptyOverrides = (): Overrides => ({
  hiddenSkills: [],
  hiddenExperience: [],
  hiddenEducation: [],
  hiddenCourses: [],
})

export function createVersion(
  input: { id: string; company: string; role: string; posting?: string },
  settings: Settings,
): Version {
  const posting = input.posting?.trim()
  return {
    id: input.id,
    company: input.company.trim(),
    role: input.role.trim(),
    ...(posting ? { posting } : {}),
    // Starts from whatever was on screen; the person changes it per posting.
    settings: { ...settings },
    overrides: emptyOverrides(),
  }
}

/** What the version is called on screen: the company it is for. */
export function versionLabel(version: Version): string {
  return version.company || version.role || 'Versión sin nombre'
}

/**
 * The base skills in this version's order, hidden ones included -- what the
 * version's own editor lists. Blank lines left by the textarea are not skills.
 */
export function orderedSkills(base: string[], order: string[] | undefined): string[] {
  const present = [...new Set(base.filter((skill) => skill.trim()))]
  if (!order) return present
  return [
    ...order.filter((skill) => present.includes(skill)),
    ...present.filter((skill) => !order.includes(skill)),
  ]
}

export type BulletRewrite =
  | { status: 'none' }
  | { status: 'applied'; bullets: string[] }
  /** Stored but not exported: it states numbers the base does not. */
  | { status: 'blocked'; added: string[] }

/**
 * Whether this version's rewrite of a job's bullets can be used.
 *
 * Checked on every read, never only when it is typed. If the base is corrected
 * later -- "30%" turns out to have been "25%" -- a rewrite that still says 30
 * stops applying at once, and the correction reaches the version like every
 * other fact does, instead of being overridden by an old copy of the mistake.
 */
export function bulletRewrite(item: ExperienceItem, version: Version): BulletRewrite {
  const rewrite = version.overrides.bullets?.[item.id]
  if (!rewrite) return { status: 'none' }
  const added = addedNumbers(item.bullets.join('\n'), rewrite.join('\n'))
  return added.length > 0 ? { status: 'blocked', added } : { status: 'applied', bullets: rewrite }
}

/** Sets or, with `undefined`, removes the rewrite of one job's bullets. */
export function setBulletRewrite(version: Version, itemId: string, bullets: string[] | undefined): Version {
  const next = { ...version.overrides.bullets }
  if (bullets === undefined) delete next[itemId]
  else next[itemId] = bullets
  return patchOverrides(version, { bullets: Object.keys(next).length > 0 ? next : undefined })
}

/**
 * Base plus layer: the resume that is previewed, analysed and exported.
 *
 * The only place the two meet. Templates and rules keep receiving a plain
 * `Resume` and never learn that versions exist -- the same shape as
 * `applyProfile` for the market.
 *
 * Every rule here fails towards the base: an item added to the base appears, a
 * hidden id that no longer exists is ignored, a renamed skill comes back, and a
 * bullet rewrite that states a number the base does not is not used.
 */
export function resolveVersion(base: Resume, version: Version | null): Resume {
  if (!version) return base
  const layer = version.overrides

  const without = <T extends { id: string }>(items: T[], hidden: string[]) =>
    items.filter((item) => !hidden.includes(item.id))

  return {
    ...base,
    personal: { ...base.personal, headline: layer.headline ?? base.personal.headline },
    summary: layer.summary ?? base.summary,
    experience: without(base.experience, layer.hiddenExperience).map((item) => {
      const rewrite = bulletRewrite(item, version)
      // A blocked rewrite falls back to the base: the facts win.
      return rewrite.status === 'applied' ? { ...item, bullets: rewrite.bullets } : item
    }),
    education: without(base.education, layer.hiddenEducation),
    courses: without(base.courses, layer.hiddenCourses),
    skills: orderedSkills(base.skills, layer.skillOrder).filter(
      (skill) => !layer.hiddenSkills.includes(skill),
    ),
  }
}

/**
 * Applies a change to the layer. A key set to `undefined` is removed, which is
 * what "volver al CV base" means: the field stops being this version's and goes
 * back to following the base.
 */
export function patchOverrides(version: Version, patch: Partial<Overrides>): Version {
  const next: Record<string, unknown> = { ...version.overrides, ...patch }
  for (const key of Object.keys(next)) {
    if (next[key] === undefined) delete next[key]
  }
  return { ...version, overrides: next as Overrides }
}

/** Flips one item in or out of the version. */
export function toggleHidden(hidden: string[], id: string, show: boolean): string[] {
  return show ? hidden.filter((item) => item !== id) : [...new Set([...hidden, id])]
}
