import { describe, expect, it } from 'vitest'
import { AR_PROFILE } from '@/domain/market/marketProfile'
import type { Resume } from '@/domain/resume/resumeSchema'
import { cleanAr } from '@/test/fixtures'
import { bulletsStartWithVerb, experienceHasNumbers } from './contentRules'

const ctx = { profile: AR_PROFILE, atsMode: false, template: 'harvard' as const }

/**
 * Found on a real resume: two different jobs held the title "Asesora Comercial",
 * one of them with numbers and one without. The panel showed a finding naming
 * only the title, so it pointed at both entries and at neither.
 */
describe('a finding names the job well enough to find it', () => {
  const twoSameTitle: Resume = {
    ...cleanAr,
    experience: [
      {
        id: 'a',
        role: 'Asesora Comercial',
        company: 'Grupo Randazzo',
        startDate: '2023-02',
        endDate: '2025-01',
        bullets: ['Vendí un mínimo de 6 a 7 vehículos por mes.'],
      },
      {
        id: 'b',
        role: 'Asesora Comercial',
        company: 'F31 SRL',
        startDate: '2015-12',
        endDate: '2024-01',
        bullets: ['Gestioné los pedidos a proveedores y el circuito de pagos.'],
      },
    ],
  }

  it('says which of the two jobs is missing numbers', () => {
    const findings = experienceHasNumbers(twoSameTitle, ctx)

    expect(findings).toHaveLength(1)
    expect(findings[0]?.problem).toContain('F31 SRL')
    expect(findings[0]?.problem).not.toContain('Randazzo')
  })

  it('points at the entry by id as well as by name', () => {
    expect(experienceHasNumbers(twoSameTitle, ctx)[0]?.itemId).toBe('b')
  })

  it('names the company in the action-verb finding too', () => {
    const weak: Resume = {
      ...twoSameTitle,
      experience: [
        { ...twoSameTitle.experience[1]!, bullets: ['Encargada de los pedidos a proveedores.'] },
      ],
    }
    expect(bulletsStartWithVerb(weak, ctx)[0]?.problem).toContain('F31 SRL')
  })

  it('falls back to the role alone when there is no company yet', () => {
    const noCompany: Resume = {
      ...twoSameTitle,
      experience: [{ ...twoSameTitle.experience[1]!, company: '   ' }],
    }
    const problem = experienceHasNumbers(noCompany, ctx)[0]?.problem ?? ''

    expect(problem).toContain('Asesora Comercial')
    expect(problem).not.toContain(' en ')
  })
})
