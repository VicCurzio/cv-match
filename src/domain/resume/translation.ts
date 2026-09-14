import { z } from 'zod'
import type { Resume } from './resumeSchema'

/** The languages a resume can be shown in. Spanish is the one written; English is a layer. */
export type Locale = 'es' | 'en'

/**
 * The English version of a resume, as a LAYER over the Spanish one.
 *
 * Only the text that is told in a language is stored here, and each piece keeps
 * the Spanish it was translated from. Dates, companies, institutions, numbers,
 * the photo and the contact details are read from the Spanish resume every
 * time -- the same rule as versions (ADR 0006): a fact corrected once is
 * corrected in both languages.
 *
 * And because every segment remembers its source, a Spanish text that changed
 * after it was translated is noticed on the next read: that field shows the
 * Spanish and is marked, instead of printing an English translation of
 * something the resume no longer says.
 */

/** Why a segment deserves a second look before the resume is sent. */
export const REVIEW_REASONS = ['title-not-in-glossary', 'numbers-changed', 'protected-term-lost'] as const
export type ReviewReason = (typeof REVIEW_REASONS)[number]

export const segmentSchema = z.strictObject({
  /** The Spanish text this translation was made from. */
  source: z.string(),
  /** The English text. The person can edit it. */
  text: z.string(),
  review: z.enum(REVIEW_REASONS).optional(),
})

export type Segment = z.infer<typeof segmentSchema>

export const translationSchema = z.strictObject({
  headline: segmentSchema.optional(),
  summary: segmentSchema.optional(),
  /** By experience id. Bullets are matched by their Spanish text, not by position. */
  experience: z
    .record(z.string(), z.strictObject({ role: segmentSchema.optional(), bullets: z.array(segmentSchema).default([]) }))
    .default({}),
  /** Education titles by id. */
  education: z.record(z.string(), segmentSchema).default({}),
  courses: z
    .record(z.string(), z.strictObject({ title: segmentSchema.optional(), detail: segmentSchema.optional() }))
    .default({}),
  /** Skills have no id: matched by their Spanish text. */
  skills: z.array(segmentSchema).default([]),
  languages: z
    .record(z.string(), z.strictObject({ name: segmentSchema.optional(), level: segmentSchema.optional() }))
    .default({}),
})

export type Translation = z.infer<typeof translationSchema>

export const emptyTranslation = (): Translation => ({
  experience: {},
  education: {},
  courses: {},
  skills: [],
  languages: {},
})

/** Where a segment lives. */
export type SegmentPath =
  | { kind: 'headline' }
  | { kind: 'summary' }
  | { kind: 'role'; id: string }
  | { kind: 'bullet'; id: string }
  | { kind: 'education'; id: string }
  | { kind: 'courseTitle'; id: string }
  | { kind: 'courseDetail'; id: string }
  | { kind: 'skill' }
  | { kind: 'languageName'; id: string }
  | { kind: 'languageLevel'; id: string }

export type SegmentState = 'translated' | 'changed' | 'missing'

export interface SegmentRow {
  path: SegmentPath
  /** The Spanish text on the resume now. */
  source: string
  /** The English text, when there is a translation of exactly `source`. */
  text: string | null
  state: SegmentState
  review?: ReviewReason
  /**
   * For a `changed` segment: the English of the Spanish it used to say. Offered
   * as a starting point to fix, never printed.
   */
  previous?: string
}

function row(path: SegmentPath, source: string, segment: Segment | undefined): SegmentRow {
  if (segment && segment.source === source) {
    // An English text erased by hand is not a translation: printing it would drop the field.
    if (!segment.text.trim()) return { path, source, text: segment.text, state: 'missing' }
    return { path, source, text: segment.text, state: 'translated', ...(segment.review ? { review: segment.review } : {}) }
  }
  return segment
    ? { path, source, text: null, state: 'changed', previous: segment.text }
    : { path, source, text: null, state: 'missing' }
}

/** The segment for a text matched by content (bullets, skills), if one exists. */
function bySource(segments: Segment[], source: string): Segment | undefined {
  return segments.find((segment) => segment.source === source)
}

/**
 * Every piece of the resume that is told in a language, with its translation
 * state. Blank Spanish texts are left out: there is nothing to translate.
 *
 * The one list that the translator, the editor and the resolver all read, so
 * the three can never disagree about what a translation covers.
 */
export function listSegments(base: Resume, layer: Translation | undefined): SegmentRow[] {
  const t = layer ?? emptyTranslation()
  const rows: SegmentRow[] = []
  const add = (path: SegmentPath, source: string, segment: Segment | undefined) => {
    if (source.trim()) rows.push(row(path, source, segment))
  }

  add({ kind: 'headline' }, base.personal.headline, t.headline)
  add({ kind: 'summary' }, base.summary, t.summary)
  for (const item of base.experience) {
    add({ kind: 'role', id: item.id }, item.role, t.experience[item.id]?.role)
    for (const bullet of item.bullets) {
      if (!bullet.trim()) continue
      // A bullet that matches no segment was never translated, or changed:
      // matched by content, the two cannot be told apart, and both need the same thing.
      rows.push(row({ kind: 'bullet', id: item.id }, bullet, bySource(t.experience[item.id]?.bullets ?? [], bullet)))
    }
  }
  for (const item of base.education) add({ kind: 'education', id: item.id }, item.title, t.education[item.id])
  for (const item of base.courses) {
    add({ kind: 'courseTitle', id: item.id }, item.title, t.courses[item.id]?.title)
    add({ kind: 'courseDetail', id: item.id }, item.detail ?? '', t.courses[item.id]?.detail)
  }
  for (const skill of base.skills) {
    if (skill.trim()) rows.push(row({ kind: 'skill' }, skill, bySource(t.skills, skill)))
  }
  for (const item of base.languages) {
    add({ kind: 'languageName', id: item.id }, item.name, t.languages[item.id]?.name)
    add({ kind: 'languageLevel', id: item.id }, item.level, t.languages[item.id]?.level)
  }
  return rows
}

/**
 * Writes one segment. For a text matched by content, the segment of that same
 * Spanish text is replaced, and segments whose Spanish is no longer on the
 * resume are dropped along the way, so the layer does not grow stale entries.
 */
export function writeSegment(
  base: Resume,
  layer: Translation | undefined,
  path: SegmentPath,
  segment: Segment,
): Translation {
  const t = layer ?? emptyTranslation()
  switch (path.kind) {
    case 'headline':
      return { ...t, headline: segment }
    case 'summary':
      return { ...t, summary: segment }
    case 'role': {
      const current = t.experience[path.id] ?? { bullets: [] }
      return { ...t, experience: { ...t.experience, [path.id]: { ...current, role: segment } } }
    }
    case 'bullet': {
      const current = t.experience[path.id] ?? { bullets: [] }
      const live = base.experience.find((item) => item.id === path.id)?.bullets ?? []
      const bullets = [
        ...current.bullets.filter((s) => s.source !== segment.source && live.includes(s.source)),
        segment,
      ]
      return { ...t, experience: { ...t.experience, [path.id]: { ...current, bullets } } }
    }
    case 'education':
      return { ...t, education: { ...t.education, [path.id]: segment } }
    case 'courseTitle': {
      const current = t.courses[path.id] ?? {}
      return { ...t, courses: { ...t.courses, [path.id]: { ...current, title: segment } } }
    }
    case 'courseDetail': {
      const current = t.courses[path.id] ?? {}
      return { ...t, courses: { ...t.courses, [path.id]: { ...current, detail: segment } } }
    }
    case 'skill': {
      const skills = [
        ...t.skills.filter((s) => s.source !== segment.source && base.skills.includes(s.source)),
        segment,
      ]
      return { ...t, skills }
    }
    case 'languageName': {
      const current = t.languages[path.id] ?? {}
      return { ...t, languages: { ...t.languages, [path.id]: { ...current, name: segment } } }
    }
    case 'languageLevel': {
      const current = t.languages[path.id] ?? {}
      return { ...t, languages: { ...t.languages, [path.id]: { ...current, level: segment } } }
    }
  }
}

/**
 * The English resume: the Spanish one with every translated text swapped in.
 *
 * A text without a translation of exactly its current Spanish stays in
 * Spanish, and is listed in `pending`. Failing towards the source is the point:
 * a stale translation printed in a resume says something the person no longer
 * claims, while a Spanish sentence in an English resume is visibly unfinished.
 */
export function resolveTranslation(
  base: Resume,
  layer: Translation | undefined,
): { resume: Resume; pending: SegmentRow[] } {
  const t = layer ?? emptyTranslation()
  const rows = listSegments(base, t)
  const pending = rows.filter((r) => r.state !== 'translated')
  const pick = (source: string, segment: Segment | undefined) =>
    segment && segment.source === source && segment.text.trim() ? segment.text : source

  const resume: Resume = {
    ...base,
    personal: { ...base.personal, headline: pick(base.personal.headline, t.headline) },
    summary: pick(base.summary, t.summary),
    experience: base.experience.map((item) => {
      const entry = t.experience[item.id]
      return {
        ...item,
        role: pick(item.role, entry?.role),
        bullets: item.bullets.map((bullet) => pick(bullet, bySource(entry?.bullets ?? [], bullet))),
      }
    }),
    education: base.education.map((item) => ({ ...item, title: pick(item.title, t.education[item.id]) })),
    courses: base.courses.map((item) => {
      const entry = t.courses[item.id]
      return {
        ...item,
        title: pick(item.title, entry?.title),
        ...(item.detail !== undefined ? { detail: pick(item.detail, entry?.detail) } : {}),
      }
    }),
    skills: base.skills.map((skill) => pick(skill, bySource(t.skills, skill))),
    languages: base.languages.map((item) => {
      const entry = t.languages[item.id]
      return { ...item, name: pick(item.name, entry?.name), level: pick(item.level, entry?.level) }
    }),
  }
  return { resume, pending }
}
