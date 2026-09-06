import type { Finding, Rule } from '@/domain/analysis/findingModel'
import { countWords, startsWithActionVerb, hasNumber } from '@/shared/utils/text'

const SUMMARY_MAX_WORDS = 60
const BULLET_MAX_WORDS = 30
const MIN_SKILLS = 3

/**
 * The summary is where almost every resume goes wrong: one dense paragraph
 * nobody reads. A recruiter scans; a wall of text defeats scanning.
 */
export const summaryLength: Rule = (resume) => {
  const words = countWords(resume.summary)
  if (words === 0) {
    return [
      {
        id: 'summary/empty',
        severity: 'warning',
        section: 'summary',
        problem: 'No tenés perfil profesional.',
        action:
          'Escribí tres o cuatro líneas: qué hacés, cuántos años de experiencia tenés y qué buscás.',
      },
    ]
  }
  if (words > SUMMARY_MAX_WORDS) {
    return [
      {
        id: 'summary/too-long',
        severity: 'warning',
        section: 'summary',
        problem: `El perfil profesional tiene ${words} palabras. Arriba de ${SUMMARY_MAX_WORDS} nadie lo lee entero.`,
        action: 'Cortalo a tres o cuatro líneas, o pasalo a viñetas.',
      },
    ]
  }
  return []
}

/** A single block with no breaks reads as a wall even when it is short. */
export const summaryIsOneBlock: Rule = (resume) => {
  const words = countWords(resume.summary)
  if (words < 35) return []
  const hasBreaks = /\n|•|·|- /.test(resume.summary)
  if (hasBreaks) return []
  return [
    {
      id: 'summary/single-block',
      severity: 'suggestion',
      section: 'summary',
      problem: 'El perfil profesional es un solo bloque de texto corrido.',
      action: 'Separalo en dos o tres viñetas: se lee en diagonal, que es como se lee un CV.',
    },
  ]
}

export const experienceExists: Rule = (resume) => {
  if (resume.experience.length > 0) return []
  return [
    {
      id: 'experience/empty',
      severity: 'error',
      section: 'experience',
      problem: 'No cargaste ninguna experiencia laboral.',
      action: 'Agregá al menos un puesto, aunque sea una pasantía o un trabajo temporal.',
    },
  ]
}

/**
 * "Encargada de la atención al cliente" describes a job title. "Atendí a 40
 * clientes por día" describes what the person did. The second one gets read.
 */
export const bulletsStartWithVerb: Rule = (resume) => {
  const findings: Finding[] = []
  for (const item of resume.experience) {
    const weak = item.bullets.filter((b) => b.trim() && !startsWithActionVerb(b))
    if (weak.length === 0) continue
    findings.push({
      id: 'experience/no-action-verb',
      severity: 'warning',
      section: 'experience',
      itemId: item.id,
      problem: `En "${item.role}" hay ${weak.length} ${weak.length === 1 ? 'punto que no arranca' : 'puntos que no arrancan'} con un verbo de acción.`,
      action:
        'Empezá por lo que hiciste: "Coordiné...", "Reduje...", "Implementé...", en vez de "Encargada de...".',
    })
  }
  return findings
}

/**
 * A resume without a single number is a list of responsibilities. With numbers
 * it becomes evidence.
 */
export const experienceHasNumbers: Rule = (resume) => {
  const findings: Finding[] = []
  for (const item of resume.experience) {
    if (item.bullets.length === 0) {
      findings.push({
        id: 'experience/no-bullets',
        severity: 'warning',
        section: 'experience',
        itemId: item.id,
        problem: `"${item.role}" no tiene ningún detalle de lo que hiciste.`,
        action: 'Agregá dos o tres puntos con tus tareas y logros concretos.',
      })
      continue
    }
    if (!item.bullets.some(hasNumber)) {
      findings.push({
        id: 'experience/no-numbers',
        severity: 'warning',
        section: 'experience',
        itemId: item.id,
        problem: `"${item.role}" no tiene ni un número.`,
        action:
          'Agregá cuántos (clientes, expedientes, pedidos), cuánto tiempo o cuánto mejoraste algo. Un número vale más que un adjetivo.',
      })
    }
  }
  return findings
}

export const bulletLength: Rule = (resume) => {
  const findings: Finding[] = []
  for (const item of resume.experience) {
    const long = item.bullets.filter((b) => countWords(b) > BULLET_MAX_WORDS)
    if (long.length === 0) continue
    findings.push({
      id: 'experience/bullet-too-long',
      severity: 'suggestion',
      section: 'experience',
      itemId: item.id,
      problem: `En "${item.role}" hay ${long.length} ${long.length === 1 ? 'punto' : 'puntos'} de más de ${BULLET_MAX_WORDS} palabras.`,
      action: 'Partilo en dos. Un punto de CV entra en una o dos líneas.',
    })
  }
  return findings
}

export const enoughSkills: Rule = (resume) => {
  if (resume.skills.filter((s) => s.trim()).length >= MIN_SKILLS) return []
  return [
    {
      id: 'skills/too-few',
      severity: 'suggestion',
      section: 'skills',
      problem: 'Tenés menos de tres habilidades cargadas.',
      action:
        'Sumá herramientas y sistemas concretos que usás (Excel, Tango, sistemas de gestión), no solo cualidades personales.',
    },
  ]
}

export const educationExists: Rule = (resume) => {
  if (resume.education.length > 0) return []
  return [
    {
      id: 'education/empty',
      severity: 'suggestion',
      section: 'education',
      problem: 'No cargaste formación.',
      action: 'Poné el secundario, cursos o capacitaciones. Un CV sin sección de educación llama la atención.',
    },
  ]
}

export const contentRules: Rule[] = [
  summaryLength,
  summaryIsOneBlock,
  experienceExists,
  bulletsStartWithVerb,
  experienceHasNumbers,
  bulletLength,
  enoughSkills,
  educationExists,
]
