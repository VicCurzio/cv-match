const MONTHS: Record<string, string> = {
  ene: '01', enero: '01', jan: '01', january: '01',
  feb: '02', febrero: '02', february: '02',
  mar: '03', marzo: '03', march: '03',
  abr: '04', abril: '04', apr: '04', april: '04',
  may: '05', mayo: '05',
  jun: '06', junio: '06', june: '06',
  jul: '07', julio: '07', july: '07',
  ago: '08', agosto: '08', aug: '08', august: '08',
  // "Setiembre" is how a good part of Argentina spells it.
  sep: '09', sept: '09', set: '09', septiembre: '09', setiembre: '09', september: '09',
  oct: '10', octubre: '10', october: '10',
  nov: '11', noviembre: '11', november: '11',
  dic: '12', diciembre: '12', dec: '12', december: '12',
}

/**
 * The month names, longest first.
 *
 * A date pattern has to name the months it accepts. Written as "any word
 * followed by a year", it swallowed the last word of whatever came before the
 * date: `Encargada de depósito 2018 - actualidad` matched as the month
 * "depósito", `parseMonth` then returned null for it, and the whole job -- date
 * range, title and bullets -- vanished from the import without a trace.
 */
export const MONTH_NAMES = Object.keys(MONTHS).sort((a, b) => b.length - a.length)

/** `marzo 2021`, `mar. 2021`, `marzo de 2021`. Never `depósito 2021`. */
export const NAMED_MONTH_YEAR = String.raw`\b(?:${MONTH_NAMES.join('|')})\.?\s+(?:de\s+)?(?:19|20)\d{2}`

const PRESENT = /\b(actualidad|presente|actual|hoy|present|current)\b/i

export interface ParsedExperience {
  role: string
  company: string
  startDate: string
  endDate: string | null
  bullets: string[]
}

/** `marzo 2021`, `mar 2021`, `03/2021`, `2021-03` -- all become `2021-03`. */
export function parseMonth(raw: string): string | null {
  const text = raw.trim().toLowerCase()

  const iso = /^(\d{4})[-/](\d{1,2})$/.exec(text)
  if (iso) return `${iso[1]}-${String(iso[2]).padStart(2, '0')}`

  const numeric = /^(\d{1,2})[-/](\d{4})$/.exec(text)
  if (numeric) return `${numeric[2]}-${String(numeric[1]).padStart(2, '0')}`

  const named = /^([a-záéíóú]+)\.?\s+(?:de\s+)?(\d{4})$/.exec(text)
  if (named) {
    const key = (named[1] ?? '').normalize('NFD').replace(/[̀-ͯ]/gu, '')
    const month = MONTHS[key]
    if (month) return `${named[2]}-${month}`
  }

  const yearOnly = /^(\d{4})$/.exec(text)
  if (yearOnly) return `${yearOnly[1]}-01`

  return null
}

const DATE_PART = String.raw`(?:${NAMED_MONTH_YEAR}|\d{1,2}[-/]\d{4}|\d{4}[-/]\d{1,2}|\d{4})`
const RANGE_RE = new RegExp(
  String.raw`(${DATE_PART})\s*(?:-|–|—|a|hasta|to)\s*(${DATE_PART}|actualidad|presente|actual|hoy|present|current)`,
  'i',
)

/** True when the line is mostly a date range rather than prose. */
export function dateRangeOf(line: string): { start: string; end: string | null } | null {
  const match = RANGE_RE.exec(line)
  if (!match) return null

  const start = parseMonth(match[1] ?? '')
  if (!start) return null

  const rawEnd = match[2] ?? ''
  const end = PRESENT.test(rawEnd) ? null : parseMonth(rawEnd)
  if (end === null && !PRESENT.test(rawEnd)) return null

  return { start, end }
}

const BULLET_RE = /^[-•·*–—]\s*/

/**
 * Best-effort split of an experience block into entries.
 *
 * A resume has no machine-readable structure, so the anchor is the one thing
 * that is unambiguous: a date range. The line carrying it -- or the line right
 * above it -- names the job; the bulleted lines after it describe it.
 *
 * It will get things wrong on unusual layouts. That is why the importer shows
 * the result for review instead of applying it.
 */
/** "Puesto - Empresa", "Puesto | Empresa", "Puesto en Empresa". */
function splitRoleAndCompany(title: string): { role: string; company: string } {
  const [role = '', company = ''] = title.split(/\s+(?:-|–|—|\||en|at)\s+/)
  return { role: role.trim(), company: company.trim() }
}

export function parseExperience(text: string): ParsedExperience[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)

  // Anchor on the date ranges: they are the only unambiguous marker in a resume.
  const anchors = lines
    .map((line, index) => ({ index, line, range: dateRangeOf(line) }))
    .filter((a): a is { index: number; line: string; range: { start: string; end: string | null } } =>
      a.range !== null,
    )

  const consumed = new Set<number>(anchors.map((a) => a.index))

  /*
   * Resolve every title BEFORE collecting any body.
   *
   * A title can sit above its own date line, which puts it inside the previous
   * entry's body range. Doing this in one pass made the second job's title show
   * up as the first job's last bullet.
   */
  const titles = anchors.map((anchor) => {
    // The title may share the date's line, sit above it, or -- when the layout
    // puts dates on their own row -- sit just below it.
    // The middle dot is in the strip set because the extractor writes one
    // wherever a wide gap separated two runs of the same row -- which is exactly
    // what sits between a job title and the dates drawn at the far margin.
    const inline = anchor.line.replace(RANGE_RE, '').replace(/[\s|,;·-]+$/, '').trim()
    if (inline) return inline

    const above = lines[anchor.index - 1]
    if (above && !BULLET_RE.test(above) && !consumed.has(anchor.index - 1) && !dateRangeOf(above)) {
      consumed.add(anchor.index - 1)
      return above
    }

    const below = lines[anchor.index + 1]
    if (below && !BULLET_RE.test(below) && !consumed.has(anchor.index + 1) && !dateRangeOf(below)) {
      consumed.add(anchor.index + 1)
      return below
    }

    return ''
  })

  const entries: ParsedExperience[] = []

  for (let a = 0; a < anchors.length; a++) {
    const anchor = anchors[a]
    if (!anchor) continue

    const { role, company } = splitRoleAndCompany(titles[a] ?? '')
    const entry: ParsedExperience = {
      role,
      company,
      startDate: anchor.range.start,
      endDate: anchor.range.end,
      bullets: [],
    }

    // The body runs until the next date range.
    const stop = anchors[a + 1]?.index ?? lines.length
    for (let i = anchor.index + 1; i < stop; i++) {
      const line = lines[i]
      if (!line || consumed.has(i)) continue

      /*
       * A line with no bullet mark, sitting right under the header while the
       * company is still unknown, is the employer -- not a bullet. Without this
       * "Distribuidora del Este - La Plata" ended up as the first thing the
       * person appeared to have done at the job.
       */
      if (!entry.company && !BULLET_RE.test(line) && entry.bullets.length === 0) {
        const parts = splitRoleAndCompany(line)
        entry.company = parts.company ? `${parts.role} - ${parts.company}` : parts.role
        continue
      }

      entry.bullets.push(line.replace(BULLET_RE, '').trim())
    }

    entry.bullets = entry.bullets.filter(Boolean)
    entries.push(entry)
  }

  return entries
}
