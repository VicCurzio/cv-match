import { z } from 'zod'
import type { Resume } from '@/domain/resume/resumeSchema'
import type { ExperienceItem } from '@/domain/resume/resumeSchema'
import type { Locale } from '@/domain/resume/translation'
import { listOf, monthIndex } from '@/shared/utils/text'

/**
 * The cover letter, without a language model (ADR 0003).
 *
 * What can be done honestly today: the structure, and the facts that already
 * live in the resume. What cannot: the paragraph explaining why this person
 * wants this job. That one is marked as the writer's and left for them, rather
 * than filled with something plausible-sounding that is not theirs to claim.
 *
 * In English the letter is built the same way from the English resume: the
 * fixed sentences are written in English here, not translated, and the
 * paragraph is still the writer's.
 */

export const letterSchema = z.object({
  role: z.string(),
  company: z.string(),
  /** "Equipo de Recursos Humanos", or a person's name when it is known. */
  recipient: z.string(),
  city: z.string(),
  opening: z.string(),
  body: z.string(),
  closing: z.string(),
})

export type Letter = z.infer<typeof letterSchema>

/** Marks the one paragraph the person has to write. Checked before exporting. */
export const BODY_PLACEHOLDER =
  '[Escribí acá por qué querés este puesto en esta empresa, y qué de lo que hiciste le sirve. Dos o tres oraciones alcanzan.]'

export const BODY_PLACEHOLDER_EN =
  '[Write here, in English, why you want this position at this company and what in your experience is useful to them. Two or three sentences are enough.]'

export function bodyPlaceholder(locale: Locale): string {
  return locale === 'en' ? BODY_PLACEHOLDER_EN : BODY_PLACEHOLDER
}

const DEFAULT_RECIPIENT: Record<Locale, string> = { es: 'Equipo de Selección', en: 'Hiring Team' }

/**
 * The job to open the letter with: a current one if there is any, the most
 * recently started; otherwise the one that ended last.
 *
 * It used to be `experience[0]` under the words "Actualmente me desempeño
 * como". The first job in the list is not necessarily the latest, and the
 * latest is not necessarily still going: a real letter went out saying the
 * person currently worked somewhere they had left the month before.
 */
export function latestJob(experience: ExperienceItem[]): { item: ExperienceItem; current: boolean } | null {
  const started = (item: ExperienceItem) => monthIndex(item.startDate) ?? -1
  const ended = (item: ExperienceItem) => (item.endDate ? (monthIndex(item.endDate) ?? -1) : -1)

  const current = experience.filter((item) => item.endDate === null).sort((a, b) => started(b) - started(a))[0]
  if (current) return { item: current, current: true }

  const last = [...experience].sort((a, b) => ended(b) - ended(a))[0]
  return last ? { item: last, current: false } : null
}

function spanishOpening(resume: Resume, input: { role: string; company: string }): string {
  const job = latestJob(resume.experience)
  const skills = resume.skills.filter((s) => s.trim()).slice(0, 3)

  const at = job ? `${job.item.role}${job.item.company ? ` en ${job.item.company}` : ''}` : ''
  const where = !job
    ? 'Cuento con experiencia'
    : job.current
      ? `Actualmente me desempeño como ${at}`
      : `Mi último puesto fue ${at}`

  const withSkills = skills.length > 0 ? `, con experiencia en ${listOf(skills)}` : ''

  return [
    `Me dirijo a ustedes para postularme al puesto de ${input.role || '[puesto]'}${
      input.company ? ` en ${input.company}` : ''
    }.`,
    `${where}${withSkills}.`,
  ].join(' ')
}

function englishOpening(resume: Resume, input: { role: string; company: string }): string {
  const job = latestJob(resume.experience)
  const skills = resume.skills.filter((s) => s.trim()).slice(0, 3)

  const at = job ? `${job.item.role}${job.item.company ? ` at ${job.item.company}` : ''}` : ''
  const withSkills = skills.length > 0 ? `, with experience in ${listOf(skills, 'en')}` : ''
  // Without a job, "I have experience." on its own says nothing: the sentence goes.
  const where = !job
    ? skills.length > 0
      ? `I have experience in ${listOf(skills, 'en')}.`
      : ''
    : `${job.current ? `I currently work as ${at}` : `Most recently, I worked as ${at}`}${withSkills}.`

  return [
    `I am writing to apply for the ${input.role || '[position]'} position${input.company ? ` at ${input.company}` : ''}.`,
    where,
  ]
    .filter(Boolean)
    .join(' ')
}

const CLOSING: Record<Locale, string> = {
  es: 'Quedo a disposición para una entrevista, cuando les resulte conveniente. Muchas gracias por su tiempo.',
  en: 'I would welcome the opportunity to discuss my application in an interview at your convenience. Thank you for your time and consideration.',
}

/**
 * Builds the draft from the resume. Deterministic: same resume and same job,
 * same letter. Nothing is invented -- every fact comes from a field the person
 * already filled in. For English, pass the English resume.
 */
export function draftLetter(
  resume: Resume,
  input: { role: string; company: string; recipient?: string },
  locale: Locale = 'es',
): Letter {
  return {
    role: input.role,
    company: input.company,
    recipient: input.recipient?.trim() || DEFAULT_RECIPIENT[locale],
    city: resume.personal.city,
    opening: locale === 'en' ? englishOpening(resume, input) : spanishOpening(resume, input),
    body: bodyPlaceholder(locale),
    closing: CLOSING[locale],
  }
}

/** Unwritten in either language: a Spanish placeholder left in an English letter is still unwritten. */
export function isUnwritten(letter: Letter): boolean {
  const body = letter.body.trim()
  return body === '' || body === BODY_PLACEHOLDER || body === BODY_PLACEHOLDER_EN
}

const MONTHS: Record<Locale, string[]> = {
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
}

/**
 * "La Plata, 7 de septiembre de 2026". Business dates are written in full.
 * In English, "September 7, 2026": an English letter carries the date alone,
 * and the city is already in the contact line.
 */
export function letterDate(city: string, today: Date, locale: Locale = 'es'): string {
  if (locale === 'en') return `${MONTHS.en[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`
  const place = city.trim() ? `${city.trim()}, ` : ''
  return `${place}${today.getDate()} de ${MONTHS.es[today.getMonth()]} de ${today.getFullYear()}`
}
