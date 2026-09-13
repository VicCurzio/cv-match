import type { Resume } from '@/domain/resume/resumeSchema'
import { stripAccents } from '@/shared/utils/text'

/**
 * What a job posting names that the resume never says.
 *
 * Deliberately NOT a match score. There is no public standard for one, and a
 * "73% compatible" invites people to stuff words into their resume until the
 * number goes up. This returns two lists of words and leaves the judgement to
 * the person: a missing word is a question -- "¿esto lo sabés hacer?" -- never
 * an instruction to add it.
 *
 * Deterministic and literal, which is also its limit: it does not understand
 * meaning. A handful of equivalences a bank or shop posting commonly swaps are
 * listed below; anything beyond that list is two different words to it.
 */

export interface PostingTerm {
  /** As the posting first wrote it: "ATM", "clientes". */
  label: string
  /** How many times the posting uses it. */
  count: number
}

export interface PostingComparison {
  /** Terms the posting uses that the resume also says, most repeated first. */
  covered: PostingTerm[]
  /** Terms the posting uses that the resume never says, most repeated first. */
  missing: PostingTerm[]
}

/**
 * Sections of a posting that describe the logistics, not the person: where the
 * job is, how to apply, what it pays. Their words are place names, email
 * subjects and schedules, and listing "Berazategui" as something the resume
 * lacks would bury the terms that matter.
 */
const LOGISTICS_HEADER =
  /(zona|ubicaci|lugar de trabajo|direcci|sucursales disponibles|postulaci|postular|enviar|contacto|beneficio|ofrecemos|horario|salario|remuneraci|modalidad)/

/**
 * Function words, and the vocabulary every posting shares regardless of the
 * job. "Buscamos", "requisitos", "ganas" and "experiencia" appear in all of
 * them, so they say nothing about this one.
 */
const STOPWORDS = new Set(
  `
a al algo algun alguna algunas alguno algunos ante antes aqui asi aun aunque bajo bien cada casi como con contra cual cuales cuando de del desde donde dos e el ella ellas ello ellos en entre era es esa esas ese eso esos esta estas este esto estos fue ha hacia han hasta hay la las le les lo los mas me mi mientras muy nada ni no nos nosotros o otra otras otro otros para pero poco por porque que quien quienes se sea ser si sin sobre solo son su sus tal tambien te tener tiene tienen toda todas todo todos tu tus u un una unas uno unos usted ustedes y ya yo vos
buscamos busca buscado buscada buscados buscadas buscando perfil requisito requisitos excluyente excluyentes deseable deseables valorable valorables valoraremos indispensable conocimiento conocimientos experiencia puesto posicion empresa compania equipo trabajo trabajar tarea tareas responsabilidad responsabilidades funcion funciones principales persona personas candidato candidatos candidata candidatas gana ganas interes interesados interesadas desarrollar desarrollo formar parte nuestro nuestra nuestros nuestras nuevo nueva nuevos nuevas manera forma formas mismo misma dentro requiere requerimos disponibilidad oportunidad crecimiento ano anos mes meses dia dias semana lunes viernes sabado jornada full time part temporal cv curriculum asunto afines afin carrera carreras sector area areas etc
uso usar usa conocer aprender ayudar interactuar simple agil negocio realizar brindar lograr contar capacidad habilidad habilidades orientacion actitud info informacion proactividad proactivo proactiva compromiso responsable
`
    .split(/\s+/)
    .filter(Boolean),
)

/**
 * Words a posting and a resume use for the same thing. Keyed and valued by the
 * reduced form `reduce` produces, so plurals and gender are already folded in.
 */
const EQUIVALENT: Record<string, string> = {
  atm: 'cajer',
  aplicacion: 'app',
  email: 'mail',
  correo: 'mail',
  telefonic: 'telefon',
}

const URL_OR_EMAIL = /\b(?:https?:\/\/\S+|www\.\S+|[^\s@]+@[^\s@]+\.[^\s@]+)/g

/**
 * Folds the inflections a posting and a resume never share: a posting says
 * "atender" and "clientes", a resume says "atendí" and "cliente". Crude on
 * purpose -- it only has to make those pairs meet, and a rare collision shows
 * up as one word too many in a list the person reads, not as a wrong answer.
 */
export function reduce(word: string): string {
  let w = stripAccents(word.toLowerCase())
  if (w.length <= 3) return EQUIVALENT[w] ?? w

  // "asistirlos" is "asistir" with a pronoun attached.
  w = w.replace(/(ar|er|ir)(los|las|lo|la|les|le|se)$/, '$1')
  w = w.replace(/(iendo|ando)$/, '')
  if (/[lrndzj]es$/.test(w) && w.length > 5) w = w.slice(0, -2)
  else if (w.endsWith('s')) w = w.slice(0, -1)
  if (w.length > 5 && /(ar|er|ir)$/.test(w)) w = w.slice(0, -2)
  if (w.length > 4 && /[aeio]$/.test(w)) w = w.slice(0, -1)

  return EQUIVALENT[w] ?? w
}

function words(text: string): string[] {
  return text.replace(URL_OR_EMAIL, ' ').match(/[\p{L}\d][\p{L}\d-]*/gu) ?? []
}

/** The posting without its logistics sections. A header is a short line ending in ":". */
function relevantLines(posting: string): string[] {
  const kept: string[] = []
  let skipping = false
  for (const raw of posting.split(/\r?\n/)) {
    const line = raw.replace(/^[\s•·*-]+/, '').trim()
    const isHeader = /:$/.test(line) && line.split(/\s+/).length <= 5
    if (isHeader) {
      skipping = LOGISTICS_HEADER.test(stripAccents(line.toLowerCase()))
      continue
    }
    if (!skipping) kept.push(line)
  }
  return kept
}

/** Everything the resume says, as reduced words. Contact details are not claims. */
function resumeVocabulary(resume: Resume): Set<string> {
  const text = [
    resume.personal.headline,
    resume.summary,
    ...resume.experience.flatMap((item) => [item.role, item.company, ...item.bullets]),
    ...resume.education.flatMap((item) => [item.title, item.institution]),
    ...resume.courses.flatMap((item) => [item.title, item.institution, item.detail ?? '']),
    ...resume.skills,
    ...resume.languages.map((language) => language.name),
  ].join(' ')
  return new Set(words(text).map(reduce))
}

export function comparePosting(
  posting: string,
  resume: Resume,
  options: { company?: string } = {},
): PostingComparison {
  // The company's own name is in every posting and in no resume; it is not a gap.
  const ignored = new Set(words(options.company ?? '').map(reduce))

  const terms = new Map<string, PostingTerm>()
  for (const word of words(relevantLines(posting).join(' '))) {
    const plain = stripAccents(word.toLowerCase())
    if (plain.length < 3 || /^\d/.test(plain) || STOPWORDS.has(plain)) continue
    const key = reduce(word)
    if (ignored.has(key) || STOPWORDS.has(key)) continue

    const existing = terms.get(key)
    if (existing) existing.count++
    else {
      // Acronyms keep their capitals; everything else reads as a plain word.
      const isAcronym = /^[A-ZÁÉÍÓÚÑ]{2,5}$/.test(word)
      terms.set(key, { label: isAcronym ? word : word.toLowerCase(), count: 1 })
    }
  }

  const said = resumeVocabulary(resume)
  const byCount = (a: PostingTerm, b: PostingTerm) => b.count - a.count
  const covered: PostingTerm[] = []
  const missing: PostingTerm[] = []
  for (const [key, term] of terms) (said.has(key) ? covered : missing).push(term)

  // Array.prototype.sort is stable, so ties keep the posting's own order.
  return { covered: covered.sort(byCount), missing: missing.sort(byCount) }
}
