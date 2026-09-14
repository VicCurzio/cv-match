/** Pure text helpers. No business knowledge, no state -- safe for `shared/`. */

export function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

export function hasNumber(text: string): boolean {
  return /\d/.test(text)
}

/** "a, b y c" -- the Spanish list, without the serial comma. */
export function listOf(items: string[], language: 'es' | 'en' = 'es'): string {
  if (items.length <= 1) return items[0] ?? ''
  if (language === 'en') {
    // "Excel and SAP", but "Excel, SAP, and Tango": the serial comma of American business English.
    return items.length === 2 ? `${items[0]} and ${items[1]}` : `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`
  }
  return `${items.slice(0, -1).join(', ')} y ${items.at(-1)}`
}

export function stripAccents(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/gu, '')
}

/**
 * Openers that describe a POSITION instead of an action: "Encargada de la
 * atención al cliente" says what the job was called; "Atendí a 40 clientes por
 * día" says what the person did. Only the second one is evidence.
 *
 * Written as an explicit list rather than as "does the first word look like a
 * verb", on purpose. Spanish first-person preterites are wildly irregular
 * -- gestioné, reduje, hice, tuve, produje, resolví -- so any ending heuristic
 * either misses half of them or flags ordinary nouns. Matching the small,
 * well-known set of weak openers means the rule never nags about phrasing it
 * cannot actually judge, at the cost of missing some weak bullets. For advice
 * shown to a person, a false positive costs far more than a miss.
 */
/**
 * Deverbal noun endings: "Gestión", "Seguimiento", "Preparación", "Asistencia".
 *
 * This is the pattern the explicit list below kept missing. A resume bullet that
 * opens with one of these is describing the NAME of an activity rather than
 * something the person did -- "Gestión y control administrativo" instead of
 * "Gestioné y controlé". The check is safe because a Spanish verb form never
 * ends this way, so it cannot misfire on a bullet that already starts with one.
 */
const NOMINALISED_OPENER = /(ion|miento|anza|encia|ancia|aje|azgo|ura)$/

const RESPONSIBILITY_OPENERS = [
  'encargada',
  'encargado',
  'encargue',
  'responsable',
  'a cargo',
  'tareas',
  'tarea ',
  'funciones',
  'participacion',
  'participe en',
  'colaboracion',
  'apoyo',
  'ayudante',
  'auxiliar',
  'asistente',
  'mis tareas',
  'me encargaba',
  'me encargue',
  'trabajo en',
  'trabaje en el area',
  'atencion al',
  'desempeno',
  'desempeno en',
  'tareas de',
  'asistencia a',
  'manejo de',
  'gestion de',
  'control de',
  'seguimiento de',
  'venta de',
  'ventas en',
  'soporte a',
]

/**
 * True when the bullet opens with an action rather than with a job description.
 * Conservative by design: anything not on the weak list passes.
 */
export function startsWithActionVerb(bullet: string): boolean {
  const clean = stripAccents(bullet.trim().toLowerCase()).replace(/^[-•·*\s]+/, '')
  if (!clean) return false

  if (RESPONSIBILITY_OPENERS.some((weak) => clean.startsWith(weak))) return false

  const firstWord = clean.split(/[\s,;:.]+/)[0] ?? ''
  // "Desempeño" loses its tilde to stripAccents and collides with the verb
  // "desempeño" (I perform), so it stays on the explicit list rather than here.
  if (firstWord.length > 4 && NOMINALISED_OPENER.test(firstWord)) return false

  return true
}

/** `YYYY-MM` to a count of months, for gap arithmetic. */
export function monthIndex(yearMonth: string): number | null {
  const match = /^(\d{4})-(\d{2})$/.exec(yearMonth)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  return year * 12 + (month - 1)
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Openers that make an email address read as personal rather than professional. */
export function looksUnprofessional(email: string): boolean {
  const local = email.split('@')[0]
  if (!local) return false
  const clean = stripAccents(local.toLowerCase())
  if (/(19|20)\d{2}/.test(clean)) return true
  return /(sexy|loco|loca|kitty|princes|bebe|gato|nena|nene|xx|666|420)/.test(clean)
}

/**
 * The numbers a text states, normalised so the same figure written two ways
 * compares equal: "1.500" and "1500" are one number, "56,5" is "56.5", and a
 * range like "20-40" is two numbers.
 */
export function numbersIn(text: string): string[] {
  return (text.match(/\d+(?:[.,]\d+)*/g) ?? []).map((raw) =>
    /^\d{1,3}(?:[.,]\d{3})+$/.test(raw) ? raw.replace(/[.,]/g, '') : raw.replace(',', '.'),
  )
}

/**
 * Numbers the rewritten text states that the original does not, counted with
 * repetition: a rewrite that turns one "20" into two has added one.
 *
 * Dropping a number is allowed -- saying less is not saying something false.
 * Adding or changing one is not.
 */
export function addedNumbers(original: string, rewritten: string): string[] {
  const available = new Map<string, number>()
  for (const n of numbersIn(original)) available.set(n, (available.get(n) ?? 0) + 1)

  const added: string[] = []
  for (const n of numbersIn(rewritten)) {
    const left = available.get(n) ?? 0
    if (left > 0) available.set(n, left - 1)
    else added.push(n)
  }
  return added
}
