/** Pure text helpers. No business knowledge, no state -- safe for `shared/`. */

export function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

export function hasNumber(text: string): boolean {
  return /\d/.test(text)
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
  return !RESPONSIBILITY_OPENERS.some((weak) => clean.startsWith(weak))
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
