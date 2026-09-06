import type { ExperienceItem, Resume } from '@/domain/resume/resumeSchema'

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

export function fileName(resume: Resume): string {
  const clean = resume.personal.fullName
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9-]/g, '')
  return `${clean || 'CV'}-CV.pdf`
}
