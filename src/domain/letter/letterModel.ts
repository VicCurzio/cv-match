import { z } from 'zod'
import type { Resume } from '@/domain/resume/resumeSchema'

/**
 * The cover letter, without a language model (ADR 0003).
 *
 * What can be done honestly today: the structure, and the facts that already
 * live in the resume. What cannot: the paragraph explaining why this person
 * wants this job. That one is marked as the writer's and left for them, rather
 * than filled with something plausible-sounding that is not theirs to claim.
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

const DEFAULT_RECIPIENT = 'Equipo de Selección'

/**
 * Builds the draft from the resume. Deterministic: same resume and same job,
 * same letter. Nothing is invented -- every fact comes from a field the person
 * already filled in.
 */
export function draftLetter(
  resume: Resume,
  input: { role: string; company: string; recipient?: string },
): Letter {
  const current = resume.experience[0]
  const skills = resume.skills.filter((s) => s.trim()).slice(0, 3)

  const where = current
    ? `Actualmente me desempeño como ${current.role}${current.company ? ` en ${current.company}` : ''}`
    : 'Cuento con experiencia'

  const withSkills = skills.length > 0 ? `, con experiencia en ${listOf(skills)}` : ''

  const opening = [
    `Me dirijo a ustedes para postularme al puesto de ${input.role || '[puesto]'}${
      input.company ? ` en ${input.company}` : ''
    }.`,
    `${where}${withSkills}.`,
  ].join(' ')

  const closing =
    'Quedo a disposición para una entrevista, cuando les resulte conveniente. Muchas gracias por su tiempo.'

  return {
    role: input.role,
    company: input.company,
    recipient: input.recipient?.trim() || DEFAULT_RECIPIENT,
    city: resume.personal.city,
    opening,
    body: BODY_PLACEHOLDER,
    closing,
  }
}

/** "a, b y c" -- the Spanish list, without the serial comma. */
function listOf(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} y ${items.at(-1)}`
}

export function isUnwritten(letter: Letter): boolean {
  return letter.body.trim() === BODY_PLACEHOLDER || letter.body.trim() === ''
}

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

/** "La Plata, 7 de septiembre de 2026". Business dates are written in full. */
export function letterDate(city: string, today: Date): string {
  const place = city.trim() ? `${city.trim()}, ` : ''
  return `${place}${today.getDate()} de ${MONTHS[today.getMonth()]} de ${today.getFullYear()}`
}
