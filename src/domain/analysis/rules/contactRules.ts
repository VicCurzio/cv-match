import type { Finding, Rule } from '@/domain/analysis/findingModel'
import { EMAIL_RE, looksUnprofessional, monthIndex } from '@/shared/utils/text'

const GAP_MONTHS = 6

export const hasName: Rule = (resume) => {
  if (resume.personal.fullName.trim()) return []
  return [
    {
      id: 'personal/no-name',
      severity: 'error',
      section: 'personal',
      problem: 'Falta tu nombre.',
      action: 'Poné nombre y apellido arriba de todo.',
    },
  ]
}

/** Without a way to reach you, nothing else on the page matters. */
export const hasContact: Rule = (resume) => {
  const findings: Finding[] = []
  const { email, phone } = resume.personal

  if (!email.trim()) {
    findings.push({
      id: 'personal/no-email',
      severity: 'error',
      section: 'personal',
      problem: 'Falta el correo electrónico.',
      action: 'Sin una forma de contactarte, el CV no sirve. Agregalo.',
    })
  } else if (!EMAIL_RE.test(email.trim())) {
    findings.push({
      id: 'personal/invalid-email',
      severity: 'error',
      section: 'personal',
      problem: `"${email}" no es un correo válido.`,
      action: 'Revisalo: un correo mal escrito hace que nunca te respondan.',
    })
  } else if (looksUnprofessional(email.trim())) {
    findings.push({
      id: 'personal/informal-email',
      severity: 'suggestion',
      section: 'personal',
      problem: 'El correo tiene apodo o año de nacimiento.',
      action: 'Creá uno con nombre y apellido. Es gratis y cambia la primera impresión.',
    })
  }

  if (!phone.trim()) {
    findings.push({
      id: 'personal/no-phone',
      severity: 'error',
      section: 'personal',
      problem: 'Falta el teléfono.',
      action: 'Agregá un número con característica, así te pueden escribir por WhatsApp.',
    })
  }

  return findings
}

export const hasHeadline: Rule = (resume) => {
  if (resume.personal.headline.trim()) return []
  return [
    {
      id: 'personal/no-headline',
      severity: 'warning',
      section: 'personal',
      problem: 'No tenés un título debajo del nombre.',
      action:
        'Poné en qué trabajás, en tres o cuatro palabras: "Administrativa · Atención al cliente".',
    },
  ]
}

export const hasLinkedin: Rule = (resume) => {
  if (resume.personal.linkedin?.trim()) return []
  return [
    {
      id: 'personal/no-linkedin',
      severity: 'suggestion',
      section: 'personal',
      problem: 'No pusiste tu LinkedIn.',
      action: 'Si tenés perfil, agregalo: es lo primero que buscan después de leer el CV.',
    },
  ]
}

/**
 * Gaps are not a problem in themselves -- an unexplained gap is. The rule
 * suggests explaining, never hiding.
 */
export const employmentGaps: Rule = (resume) => {
  const ranges = resume.experience
    .map((item) => ({
      id: item.id,
      role: item.role,
      start: monthIndex(item.startDate),
      end: item.endDate === null ? Number.POSITIVE_INFINITY : monthIndex(item.endDate),
    }))
    .filter((r): r is { id: string; role: string; start: number; end: number } =>
      r.start !== null && r.end !== null,
    )
    .sort((a, b) => a.start - b.start)

  const findings: Finding[] = []
  for (let i = 1; i < ranges.length; i++) {
    const previous = ranges[i - 1]
    const current = ranges[i]
    if (!previous || !current) continue
    const gap = current.start - previous.end
    if (gap > GAP_MONTHS) {
      findings.push({
        id: 'experience/gap',
        severity: 'suggestion',
        section: 'experience',
        itemId: current.id,
        problem: `Hay ${gap} meses sin actividad antes de "${current.role}".`,
        action:
          'Explicalo en una línea: estudio, cuidado familiar, viaje, proyecto propio. Un hueco explicado no molesta; uno sin explicar genera dudas.',
      })
    }
  }
  return findings
}

export const contactRules: Rule[] = [
  hasName,
  hasContact,
  hasHeadline,
  hasLinkedin,
  employmentGaps,
]
