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

const LINES_PER_PAGE = 46
const WORDS_PER_LINE = 13

interface Measurable {
  summary: string
  experience: { bullets: string[] }[]
  education: unknown[]
  skills: unknown[]
  languages: unknown[]
}

/**
 * Rough line count. It does not need to be exact -- it needs to catch the
 * three-page resume, and the one that spills onto a second page for two lines,
 * before the person sends either.
 */
export function estimateLines(resume: Measurable): number {
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

  return lines
}

export function estimatePages(resume: Measurable): number {
  return Math.max(1, Math.ceil(estimateLines(resume) / LINES_PER_PAGE))
}

/** Below this share of the text on the last page, the spill is worth flagging. */
const BARELY_OVER = 0.15

/**
 * A resume that runs two lines onto a second page reads as careless: the reader
 * gets a page that is ninety percent white. Trimming a little makes it fit, and
 * nobody notices they need to until they print it.
 *
 * This sits apart from the maximum-length rule: Argentina allows two pages, so
 * nothing is technically wrong -- it just looks bad.
 *
 * It measures the rendered PDF when there is one. The estimate is the fallback,
 * and it is a poor one here: on the first real resume it claimed twenty-two
 * lines had spilled when the actual page held three.
 */
export const barelySpillsOver: Rule = (resume, ctx) => {
  let pages: number
  let lastPageShare: number

  if (ctx.layout) {
    pages = ctx.layout.pageCount
    lastPageShare = ctx.layout.lastPageShare
  } else {
    const lines = estimateLines(resume)
    pages = Math.max(1, Math.ceil(lines / LINES_PER_PAGE))
    lastPageShare = pages < 2 ? 1 : (lines - (pages - 1) * LINES_PER_PAGE) / LINES_PER_PAGE
  }

  if (pages < 2 || lastPageShare > BARELY_OVER) return []

  return [
    {
      id: 'layout/barely-spills',
      severity: 'warning',
      section: 'layout',
      problem: `El CV se pasa por poco a la página ${pages}: queda casi entera en blanco.`,
      action:
        'Recortá un poco y entra en una carilla menos. Lo más fácil: acortar el perfil profesional y sacar una o dos viñetas de los trabajos más viejos.',
    },
  ]
}

export const lengthForMarket: Rule = (resume, ctx) => {
  // The measured count wins whenever a PDF has been rendered.
  const pages = ctx.layout?.pageCount ?? estimatePages(resume)
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

export const marketRules: Rule[] = [restrictedFields, lengthForMarket, barelySpillsOver]
