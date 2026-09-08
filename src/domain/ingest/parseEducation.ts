import { NAMED_MONTH_YEAR, parseMonth } from './parseExperience'

/**
 * Best-effort split of the education block into entries.
 *
 * It used to be one line of code in the import dialog: the first line became the
 * title and every other line was glued together into the institution. Three
 * studies came back as one entry whose institution read like a paragraph, and
 * the person had to retype all of it -- which is the same as having imported
 * nothing.
 *
 * Like the experience parser, this anchors on the only unambiguous marker a
 * resume carries: a year. Everything above an anchor belongs to it; a block with
 * no year at all falls back to reading title/institution pairs, which is how
 * education is written when the dates are left out.
 */

export interface ParsedEducation {
  title: string
  institution: string
  endDate?: string
  inProgress: boolean
}

const YEAR_RE = /\b(?:19|20)\d{2}\b/
const YEAR_G = /\b(?:19|20)\d{2}\b/g

/**
 * `marzo 2019`, `03/2019`, `2019-03`. A bare year is handled separately.
 *
 * The month names are spelled out rather than matched as "any word before a
 * year". Written the loose way, `Bachiller en Economía 2010` had "Economía
 * 2010" cut out of it as if it were a date, and the study came back titled
 * "Bachiller en".
 */
const MONTH_YEAR_G = new RegExp(
  String.raw`(?:${NAMED_MONTH_YEAR}|\d{1,2}[-/](?:19|20)\d{2}|(?:19|20)\d{2}[-/]\d{1,2})`,
  'gi',
)

const IN_PROGRESS = /\b(en curso|cursando|actualidad|presente|incompleto|en tr[aá]mite|to date)\b/i

/**
 * Punctuation left behind once the dates are cut out of a line.
 *
 * The middle dot is in the set because the extractor writes one wherever a wide
 * gap separated two runs of the same row -- which is exactly what sits between a
 * study and the year drawn at the far margin, so the title kept a dangling dot.
 */
const LOOSE_EDGES = /^[\s.,;:|/·–—-]+|[\s.,;:|/·–—-]+$/g

function hasDate(line: string): boolean {
  return YEAR_RE.test(line) || IN_PROGRESS.test(line)
}

/**
 * The date a study finished, read from the END of the line: `2015 - 2019` is one
 * study that ended in 2019, not two.
 *
 * A bare year becomes December rather than January. Nobody writes the month, and
 * a year on a finished study is the year it ended -- showing "ene 2019" for a
 * degree completed in 2019 is wrong in a way the reader notices.
 */
export function endDateOf(line: string): string | undefined {
  const monthly = line.match(MONTH_YEAR_G)?.at(-1)?.trim()
  if (monthly) {
    const parsed = parseMonth(monthly)
    if (parsed) return parsed
  }

  const year = line.match(YEAR_G)?.at(-1)
  return year ? `${year}-12` : undefined
}

/** The line without its dates, so a title does not carry `2015 - 2019` in it. */
function withoutDates(line: string): string {
  return line
    .replace(MONTH_YEAR_G, ' ')
    .replace(YEAR_G, ' ')
    .replace(IN_PROGRESS, ' ')
    .replace(/\s+/g, ' ')
    .replace(LOOSE_EDGES, '')
    .trim()
}

/**
 * `Tecnicatura en Administración - UNLP` written on one line.
 *
 * Only punctuation separates the two. Splitting on words like "en" as well
 * would cut "Técnico en el área contable" in half, and a title mangled that way
 * is worse than a missing institution.
 */
function splitTitle(line: string): [string, string] {
  const [title = '', ...rest] = line.split(/\s+[-–—|·]\s+/)
  return [title.trim(), rest.join(' - ').trim()]
}

function entryFrom(parts: string[], dateLine: string | null): ParsedEducation | null {
  const clean = parts.map(withoutDates).filter(Boolean)
  const [first = '', ...rest] = clean
  if (!first) return null

  // With a single line to work from, the title and the institution are in it.
  const [title, inlineInstitution] = rest.length === 0 ? splitTitle(first) : [first, '']
  if (!title) return null

  const entry: ParsedEducation = {
    title,
    institution: rest.length > 0 ? rest.join(' - ') : inlineInstitution,
    inProgress: dateLine !== null && IN_PROGRESS.test(dateLine),
  }

  const endDate = dateLine && !entry.inProgress ? endDateOf(dateLine) : undefined
  return endDate ? { ...entry, endDate } : entry
}

export function parseEducation(text: string): ParsedEducation[] {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length === 0) return []

  const anchors = lines.map((line, index) => (hasDate(line) ? index : -1)).filter((i) => i >= 0)

  const entries: ParsedEducation[] = []
  const consumed = new Set<number>()
  let start = 0

  for (let a = 0; a < anchors.length; a++) {
    const at = anchors[a] ?? 0
    const parts: string[] = []
    for (let i = start; i <= at; i++) {
      const line = lines[i]
      if (line && !consumed.has(i)) parts.push(line)
    }

    /*
     * When everything above the date amounts to a title and nothing else, the
     * institution is the line BELOW. Two layouts land here: `2015 - 2019
     * Licenciatura` followed by the university, and the one this app's own PDF
     * produces, where the title and its date are drawn as two pieces of the same
     * visual row and the university comes underneath.
     *
     * The line below is only taken when it is not itself the title of the next
     * study -- that is, when a date does not follow it. Without that check,
     * `Bachiller / 2010 / Perito mercantil / 2012` swallowed the second title as
     * the first one's institution and then dropped the second study entirely.
     */
    const below = lines[at + 1]
    const meaningful = parts.filter((line) => withoutDates(line))
    if (meaningful.length <= 1 && below && !hasDate(below) && !hasDate(lines[at + 2] ?? '')) {
      parts.push(below)
      consumed.add(at + 1)
    }

    const entry = entryFrom(parts, lines[at] ?? null)
    if (entry) entries.push(entry)
    start = at + 1
  }

  // Whatever is left carries no date at all: read it as title/institution pairs.
  const tail = lines.slice(start).filter((_, index) => !consumed.has(start + index))
  for (let i = 0; i < tail.length; i += 2) {
    const entry = entryFrom(tail.slice(i, i + 2), null)
    if (entry) entries.push(entry)
  }

  return entries
}
