import {
  LANGUAGE_ABILITIES,
  type ExperienceItem,
  type LanguageAbility,
  type LanguageItem,
  type Resume,
} from '@/domain/resume/resumeSchema'
import { listOf } from '@/shared/utils/text'

/** Page geometry, shared by every template. A4 with 18 mm margins, in points. */
export const PAGE = {
  margin: 51, // 18 mm
  accent: '#1f4e79',
  ink: '#111111',
  inkSoft: '#3f3f46',
  /** The lightest grey still legible on a photocopy. */
  inkFaint: '#5b5b66',
  rule: '#c8c8d0',
} as const

const MONTHS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
]

/** `2024-03` becomes `mar 2024`. One format, used everywhere in the document. */
export function formatYearMonth(value: string | undefined | null): string {
  if (!value) return ''
  const match = /^(\d{4})-(\d{2})$/.exec(value)
  if (!match) return value
  const month = MONTHS[Number(match[2]) - 1]
  return month ? `${month} ${match[1]}` : match[1] ?? value
}

export function formatRange(item: ExperienceItem): string {
  const start = formatYearMonth(item.startDate)
  const end = item.endDate === null ? 'actualidad' : formatYearMonth(item.endDate)
  return end ? `${start} - ${end}` : start
}

/** Contact line, skipping whatever is not loaded. */
export function contactParts(resume: Resume): string[] {
  const { email, phone, city, province, country, linkedin, website } = resume.personal
  const place = [city, province, country].filter(Boolean).join(', ')
  return [place, phone, email, linkedin, website].filter(
    (part): part is string => Boolean(part && part.trim()),
  )
}

/** Letters, digits and hyphens: a name that survives every mail client and OS. */
function slug(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9-]/g, '')
    // "Pérez & Hijos" would leave "Pérez--Hijos" behind once the "&" is gone.
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * `Ana-Gomez-CV.pdf`, or `Ana-Gomez-CV-Banco-Columbia.pdf` for a version.
 *
 * The company goes in the name because someone applying to five places ends up
 * with five files in their downloads, and five identical names is how the
 * wrong one gets attached.
 */
export function fileName(resume: Resume, company?: string, kind: 'CV' | 'Carta' = 'CV'): string {
  const name = slug(resume.personal.fullName) || 'CV'
  const target = company ? slug(company) : ''
  return target ? `${name}-${kind}-${target}.pdf` : `${name}-${kind}.pdf`
}

export const ABILITY_LABEL: Record<LanguageAbility, string> = {
  reading: 'lectura',
  listening: 'comprensión oral',
  speaking: 'conversación',
  writing: 'escritura',
}

/**
 * `A2, lectura y comprensión oral`, or just `B2` when nothing is qualified.
 *
 * A comma and not a middle dot: react-pdf treats the dot as a break opportunity
 * and draws a stray hyphen after it at the end of a line (see the Harvard tags).
 *
 * All four abilities marked says nothing a level does not already say, so it
 * prints as the level alone rather than as a list that reads like padding.
 */
export function languageLevel(language: LanguageItem): string {
  const level = language.level.trim()
  const abilities = LANGUAGE_ABILITIES.filter((ability) => language.abilities?.includes(ability))
  const qualified = abilities.length > 0 && abilities.length < LANGUAGE_ABILITIES.length
  const detail = qualified ? listOf(abilities.map((ability) => ABILITY_LABEL[ability])) : ''
  return [level, detail].filter(Boolean).join(', ')
}
