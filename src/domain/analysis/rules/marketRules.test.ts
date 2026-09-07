import { describe, expect, it } from 'vitest'
import { AR_PROFILE, INTL_PROFILE } from '@/domain/market/marketProfile'
import { cleanAr } from '@/test/fixtures'
import type { Resume } from '@/domain/resume/resumeSchema'
import { barelySpillsOver, estimatePages, lengthForMarket } from './marketRules'

const ctx = { profile: AR_PROFILE, atsMode: false, template: 'harvard' as const }

/** Grow a resume by repeating a job, to push it over a page boundary. */
function withJobs(count: number, bulletsEach = 3): Resume {
  return {
    ...cleanAr,
    experience: Array.from({ length: count }, (_, i) => ({
      id: `exp-${i}`,
      role: `Puesto ${i}`,
      company: 'Empresa',
      startDate: '2020-01',
      endDate: '2021-01',
      bullets: Array.from(
        { length: bulletsEach },
        () => 'Gestioné una cartera de 180 cuentas corrientes con cierre mensual sin diferencias.',
      ),
    })),
  }
}

describe('estimatePages tracks the real page count', () => {
  it('keeps a short resume on one page', () => {
    expect(estimatePages(cleanAr)).toBe(1)
  })

  it('grows with the content', () => {
    expect(estimatePages(withJobs(12))).toBeGreaterThan(1)
  })
})

/**
 * Found by loading a real resume: four jobs and four studies produced a second
 * page holding two lines. Nothing was technically wrong -- Argentina allows two
 * pages -- but a page that is ninety percent white reads as careless.
 */
describe('barelySpillsOver catches the almost-fits resume', () => {
  it('says nothing about a resume that fits on one page', () => {
    expect(barelySpillsOver(cleanAr, ctx)).toEqual([])
  })

  it('flags a resume that spills just past the boundary', () => {
    const findings = barelySpillsOver(withJobs(6, 1), ctx)
    expect(findings.map((f) => f.id)).toContain('layout/barely-spills')
  })

  it('says nothing when the last page is genuinely full', () => {
    // Far over the limit: the problem there is length, not a wasted page.
    expect(barelySpillsOver(withJobs(9, 3), ctx)).toEqual([])
  })

  it('always gives a concrete way to trim', () => {
    const findings = barelySpillsOver(withJobs(6, 1), ctx)
    expect(findings[0]?.action).toMatch(/perfil profesional|viñetas/)
  })
})

/**
 * The measured layout beats the estimate. This matters: on the first real
 * resume, the line estimate put twenty-two lines on the second page when the
 * rendered document held three, so the rule stayed silent on exactly the case
 * it was written for.
 */
describe('measured layout wins over the estimate', () => {
  it('flags a nearly empty last page even when the estimate disagrees', () => {
    const findings = barelySpillsOver(cleanAr, {
      ...ctx,
      layout: { pageCount: 2, lastPageShare: 0.04 },
    })
    expect(findings.map((f) => f.id)).toContain('layout/barely-spills')
  })

  it('stays quiet when the measured last page is genuinely full', () => {
    expect(
      barelySpillsOver(withJobs(6, 1), { ...ctx, layout: { pageCount: 2, lastPageShare: 0.45 } }),
    ).toEqual([])
  })

  it('trusts the measured page count for the market limit', () => {
    // The content estimate says one page; the rendered file says three.
    expect(lengthForMarket(cleanAr, ctx)).toEqual([])
    const findings = lengthForMarket(cleanAr, {
      ...ctx,
      layout: { pageCount: 3, lastPageShare: 0.5 },
    })
    expect(findings[0]?.problem).toContain('3 páginas')
  })
})

describe('lengthForMarket applies the limit of each market', () => {
  it('accepts two pages in Argentina and rejects them abroad', () => {
    const twoPages = withJobs(6, 1)
    expect(estimatePages(twoPages)).toBe(2)

    expect(lengthForMarket(twoPages, ctx)).toEqual([])
    expect(lengthForMarket(twoPages, { ...ctx, profile: INTL_PROFILE }).length).toBeGreaterThan(0)
  })

  it('rejects three pages everywhere', () => {
    const threePages = withJobs(12)
    expect(estimatePages(threePages)).toBeGreaterThan(2)
    expect(lengthForMarket(threePages, ctx).length).toBeGreaterThan(0)
  })
})
