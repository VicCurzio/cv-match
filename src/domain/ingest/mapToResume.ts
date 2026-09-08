import { EMAIL_RE } from '@/shared/utils/text'

/**
 * Turns extracted lines into a proposal.
 *
 * Deliberately a PROPOSAL and not a resume: this is guesswork over a format
 * that does not carry structure, so everything it produces is shown for review
 * before it touches app state. Whatever it cannot place goes to `leftovers` --
 * nothing is dropped in silence, which is the one thing an importer must not do.
 */

export interface ImportDraft {
  fullName: string
  headline: string
  email: string
  phone: string
  city: string
  linkedin: string
  summary: string
  experienceText: string
  educationText: string
  skills: string[]
  languagesText: string
  /** Lines that matched no section. Shown so the person can place them. */
  leftovers: string[]
}

/** Section headings, and the variants people actually write. */
const HEADINGS: { key: keyof typeof BUCKETS; words: string[] }[] = [
  { key: 'summary', words: ['perfil', 'perfil profesional', 'resumen', 'acerca de', 'sobre mi', 'objetivo', 'summary', 'profile', 'about'] },
  { key: 'experience', words: ['experiencia', 'experiencia laboral', 'experiencia profesional', 'trayectoria', 'antecedentes laborales', 'experience', 'work experience', 'employment'] },
  { key: 'education', words: ['educacion', 'formacion', 'formacion academica', 'estudios', 'education', 'academic background'] },
  { key: 'skills', words: ['habilidades', 'aptitudes', 'competencias', 'conocimientos', 'skills', 'technical skills'] },
  { key: 'languages', words: ['idiomas', 'languages'] },
]

const BUCKETS = {
  summary: [] as string[],
  experience: [] as string[],
  education: [] as string[],
  skills: [] as string[],
  languages: [] as string[],
  header: [] as string[],
}

const PHONE_RE = /(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{4}/
const PHONE_G = new RegExp(PHONE_RE.source, 'g')
const LINKEDIN_RE = /(?:linkedin\.com\/[\w/-]+)/i

/** Lines that announce a phone number. Checked first, because they are certain. */
const PHONE_HINT = /\b(tel|telefono|tel[ée]fono|cel|celular|whatsapp|wsp|m[oó]vil|phone|mobile|contacto)\b/i

/** `2018 2021`. A pair of years, not a number anyone can call. */
const YEAR_RANGE = /^(19|20)\d{2}\s*[-–—/\s]\s*(19|20)\d{2}$/

/** Argentine numbers run to ten digits; nothing shorter than eight is a phone. */
const MIN_PHONE_DIGITS = 8

/**
 * The phone, taken from a line that says it is one when there is such a line.
 *
 * The plain pattern matched a date range written without punctuation -- an
 * experience block reading `Administrativa 2018 2021` handed back "2018 2021"
 * as the person's phone number, and it looked plausible enough to send.
 */
function findPhone(lines: string[]): string {
  return pickPhone(lines.filter((line) => PHONE_HINT.test(line))) || pickPhone(lines)
}

function pickPhone(lines: string[]): string {
  for (const line of lines) {
    for (const candidate of line.match(PHONE_G) ?? []) {
      const value = candidate.trim()
      if (YEAR_RANGE.test(value)) continue
      if (value.replace(/\D/g, '').length < MIN_PHONE_DIGITS) continue
      return value
    }
  }
  return ''
}

function normalise(line: string): string {
  return line
    .normalize('NFD')
    .replace(/[̀-ͯ]/gu, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .trim()
}

/** A heading is short and matches one of the known words. */
function headingOf(line: string): keyof typeof BUCKETS | null {
  const clean = normalise(line)
  if (!clean || clean.split(/\s+/).length > 4) return null
  for (const { key, words } of HEADINGS) {
    if (words.includes(clean)) return key
  }
  return null
}

/**
 * A name word: `Gómez`, or `GÓMEZ`.
 *
 * All-caps names were rejected until this second alternative existed, and they
 * are not an edge case -- printing the name in capitals is the single most
 * common way a resume opens, so the importer used to miss the name on a large
 * share of real files.
 */
const NAME_WORD = /^(?:[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü'.-]*|[A-ZÁÉÍÓÚÑÜ'.-]{2,})$/

/** Lowercase particles that belong inside a name: "Ana de la Torre". */
const NAME_PARTICLES = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'da', 'do', 'dos', 'di', 'van', 'von'])

/** What a document calls itself. In capitals it looks exactly like a name. */
const DOCUMENT_TITLES = new Set([
  'curriculum',
  'curriculum vitae',
  'cv',
  'hoja de vida',
  'resume',
  'datos personales',
  'informacion personal',
  'antecedentes personales',
])

/** Two to six name-shaped words and nothing else -- most likely the name. */
function looksLikeName(line: string): boolean {
  if (EMAIL_RE.test(line) || /\d/.test(line)) return false
  if (DOCUMENT_TITLES.has(normalise(line))) return false

  const words = line.trim().split(/\s+/)
  if (words.length < 2 || words.length > 6) return false

  return words.every((word) => NAME_WORD.test(word) || NAME_PARTICLES.has(word.toLowerCase()))
}

export function mapToResume(lines: string[]): ImportDraft {
  const buckets: Record<keyof typeof BUCKETS, string[]> = {
    summary: [],
    experience: [],
    education: [],
    skills: [],
    languages: [],
    header: [],
  }

  let current: keyof typeof BUCKETS = 'header'
  for (const line of lines) {
    const heading = headingOf(line)
    if (heading) {
      current = heading
      continue
    }
    buckets[current].push(line)
  }

  const all = lines.join('\n')
  const email = all.match(EMAIL_RE)?.[0] ?? all.match(/[^\s@]+@[^\s@]+\.[^\s@,;]{2,}/)?.[0] ?? ''
  const phone = findPhone(lines)
  const linkedin = all.match(LINKEDIN_RE)?.[0] ?? ''

  const header = buckets.header
  const nameIndex = header.findIndex(looksLikeName)
  const fullName = nameIndex === -1 ? '' : (header[nameIndex] ?? '')

  // The headline is usually the line right after the name, unless it is contact data.
  const after = nameIndex === -1 ? undefined : header[nameIndex + 1]
  const headline =
    after && !EMAIL_RE.test(after) && !PHONE_RE.test(after) && after.length < 90 ? after : ''

  const city = guessCity(header)

  /*
   * Which header lines are already accounted for. The empty values matter here:
   * `line.includes('')` is always true, so an unfound email would mark every
   * line as used and quietly empty the leftovers -- the exact failure this
   * whole section exists to prevent.
   */
  const found = [email, phone, linkedin].filter(Boolean)
  const used = new Set(
    [fullName, headline, city]
      .filter(Boolean)
      .concat(header.filter((line) => found.some((value) => line.includes(value)))),
  )

  return {
    fullName,
    headline,
    email,
    phone,
    city,
    linkedin,
    summary: buckets.summary.join(' ').trim(),
    experienceText: buckets.experience.join('\n'),
    educationText: buckets.education.join('\n'),
    skills: splitSkills(buckets.skills),
    languagesText: buckets.languages.join('\n'),
    leftovers: header.filter((line) => !used.has(line) && line.length > 2),
  }
}

/** Skills come either one per line or separated by bullets, slashes or commas. */
function splitSkills(lines: string[]): string[] {
  return lines
    .flatMap((line) => line.split(/[•·|,/]|\s-\s/))
    .map((s) => s.trim())
    .filter((s) => s.length > 1)
}

const CITY_HINT = /\b(ciudad|localidad|domicilio|direcci[oó]n|residencia)\b/i

function guessCity(header: string[]): string {
  for (const line of header) {
    if (CITY_HINT.test(line)) {
      return line.replace(CITY_HINT, '').replace(/^[\s:.-]+/, '').trim()
    }
  }
  return ''
}
