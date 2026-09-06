import type { Finding, Rule } from '@/domain/analysis/findingModel'

/**
 * These run only with ATS mode on.
 *
 * They deliberately re-check things the UI already prevents -- the Modern
 * template is not offered in ATS mode, for instance. A rule that is satisfied
 * only because the interface hid the wrong option is not being enforced, it is
 * being hidden (Project-Kickoff). If the guard is real, it holds even when the
 * state that should be impossible shows up anyway.
 */

/** The Modern template is two-column with icons: unreadable to an ATS. */
export const templateIsAtsSafe: Rule = (_resume, ctx) => {
  if (!ctx.atsMode || ctx.template === 'harvard') return []
  return [
    {
      id: 'ats/unsafe-template',
      severity: 'error',
      section: 'layout',
      problem:
        'Elegiste una plantilla con dos columnas e iconos, y pediste que el CV pase filtros automáticos.',
      action:
        'Cambiá a la plantilla Harvard. Un lector automático lee las dos columnas intercaladas y mezcla las frases.',
    },
  ]
}

/** An ATS looks for the headings it knows. "Mi recorrido" is invisible to it. */
export const standardHeadings: Rule = (resume, ctx) => {
  if (!ctx.atsMode) return []
  const findings: Finding[] = []

  const headline = resume.personal.headline.toLowerCase()
  if (/mi (recorrido|historia|camino)|sobre m/.test(headline)) {
    findings.push({
      id: 'ats/non-standard-heading',
      severity: 'warning',
      section: 'personal',
      problem: 'El título usa un nombre creativo en vez del puesto.',
      action:
        'Poné el nombre del puesto que buscás. El filtro automático busca eso, no una frase original.',
    })
  }

  return findings
}

/**
 * Mixed date formats confuse both a parser and a human skimming the column.
 * The schema already forces `YYYY-MM`, so this catches dates typed into free
 * text -- inside a bullet, for example.
 */
export const consistentDates: Rule = (resume, ctx) => {
  if (!ctx.atsMode) return []

  const freeText = [
    resume.summary,
    ...resume.experience.flatMap((item) => item.bullets),
  ].join(' ')

  const slashDates = /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/.test(freeText)
  const writtenDates = /\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+\d{4}\b/i.test(freeText)

  if (!slashDates || !writtenDates) return []

  return [
    {
      id: 'ats/mixed-date-formats',
      severity: 'warning',
      section: 'layout',
      problem: 'Hay fechas escritas de dos formas distintas dentro del texto.',
      action: 'Unificá el formato. Un lector automático interpreta mal las fechas mezcladas.',
    },
  ]
}

/** A photo is text-shaped noise to a parser, whatever the market allows. */
export const noPhotoInAtsMode: Rule = (resume, ctx) => {
  if (!ctx.atsMode || !resume.personal.photo) return []
  return [
    {
      id: 'ats/photo-present',
      severity: 'error',
      section: 'personal',
      problem: 'Tenés foto cargada y pediste que el CV pase filtros automáticos.',
      action:
        'La foto no se exporta en este modo. Ningún lector automático la procesa y algunos descartan el archivo entero.',
    },
  ]
}

export const atsRules: Rule[] = [
  templateIsAtsSafe,
  standardHeadings,
  consistentDates,
  noPhotoInAtsMode,
]
