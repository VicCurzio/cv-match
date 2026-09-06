import type { Finding, Rule } from '@/domain/analysis/findingModel'
import { RESTRICTABLE_FIELDS, type RestrictableField } from '@/domain/resume/resumeSchema'
import { countWords } from '@/shared/utils/text'

const FIELD_LABEL: Record<RestrictableField, string> = {
  photo: 'la foto',
  documentId: 'el número de documento',
  birthDate: 'la fecha de nacimiento',
  maritalStatus: 'el estado civil',
  nationality: 'la nacionalidad',
}

/**
 * The rules that make the product worth using: the same resume gets a different
 * diagnosis depending on where it is being sent. The engine is not duplicated
 * per market -- it reads the profile, which is data (ADR 0002).
 */
export const restrictedFields: Rule = (resume, ctx) => {
  const findings: Finding[] = []

  for (const field of RESTRICTABLE_FIELDS) {
    const value = resume.personal[field]
    if (!value || !String(value).trim()) continue

    const policy = ctx.profile.fields[field]
    if (policy === 'allowed') continue

    const reason = ctx.profile.reasons[field] ?? ''

    if (policy === 'forbidden') {
      findings.push({
        id: `market/forbidden-${field}`,
        severity: 'error',
        section: 'personal',
        problem: `Tenés ${FIELD_LABEL[field]} cargada y en ${ctx.profile.label} no va.`,
        action: `${reason} Queda fuera de la exportación, pero conviene sacarla del CV.`,
      })
    } else {
      findings.push({
        id: `market/discouraged-${field}`,
        severity: 'warning',
        section: 'personal',
        problem: `Tenés ${FIELD_LABEL[field]} cargada.`,
        action: `${reason} Se sigue exportando: sacala vos si estás de acuerdo.`,
      })
    }
  }

  return findings
}

/**
 * Rough page estimate. It does not need to be exact -- it needs to catch the
 * three-page resume before the person sends it.
 */
export function estimatePages(resume: {
  summary: string
  experience: { bullets: string[] }[]
  education: unknown[]
  skills: unknown[]
  languages: unknown[]
}): number {
  const LINES_PER_PAGE = 46
  const WORDS_PER_LINE = 13

  let lines = 8 // header block
  lines += Math.ceil(countWords(resume.summary) / WORDS_PER_LINE) + 2

  for (const item of resume.experience) {
    lines += 3 // role, company, spacing
    for (const bullet of item.bullets) {
      lines += Math.ceil(countWords(bullet) / WORDS_PER_LINE)
    }
  }

  lines += resume.education.length * 3 + 2
  lines += Math.ceil(resume.skills.length / 4) + 2
  lines += resume.languages.length + 2

  return Math.max(1, Math.ceil(lines / LINES_PER_PAGE))
}

export const lengthForMarket: Rule = (resume, ctx) => {
  const pages = estimatePages(resume)
  if (pages <= ctx.profile.maxPages) return []
  return [
    {
      id: 'layout/too-long',
      severity: 'warning',
      section: 'layout',
      problem: `El CV ocupa alrededor de ${pages} páginas y para ${ctx.profile.label} se espera un máximo de ${ctx.profile.maxPages}.`,
      action:
        'Recortá primero: trabajos de hace más de diez años, tareas repetidas entre puestos y cursos cortos sin relación con lo que buscás.',
    },
  ]
}

export const marketRules: Rule[] = [restrictedFields, lengthForMarket]
