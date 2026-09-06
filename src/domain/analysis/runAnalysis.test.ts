import { describe, expect, it } from 'vitest'
import { AR_PROFILE, INTL_PROFILE } from '@/domain/market/marketProfile'
import { administrativeAr, cleanAr } from '@/test/fixtures'
import { ALL_RULES, runAnalysis } from './runAnalysis'
import type { RuleContext } from './findingModel'

const arContext: RuleContext = { profile: AR_PROFILE, atsMode: false, template: 'modern' }
const intlContext: RuleContext = { profile: INTL_PROFILE, atsMode: false, template: 'modern' }

const ids = (findings: { id: string }[]) => findings.map((f) => f.id)

describe('the engine finds the defects of a real resume', () => {
  const findings = runAnalysis(administrativeAr, arContext)

  it('flags a summary nobody will read', () => {
    expect(ids(findings)).toContain('summary/too-long')
  })

  it('flags experience described without a single number', () => {
    expect(ids(findings)).toContain('experience/no-numbers')
  })

  it('flags bullets that open with "Encargada de" instead of a verb', () => {
    expect(ids(findings)).toContain('experience/no-action-verb')
  })

  it('flags the unexplained gap between jobs', () => {
    expect(ids(findings)).toContain('experience/gap')
  })

  it('flags too few skills', () => {
    expect(ids(findings)).toContain('skills/too-few')
  })
})

describe('a well built resume comes out clean', () => {
  const findings = runAnalysis(cleanAr, arContext)

  it('produces no errors', () => {
    expect(findings.filter((f) => f.severity === 'error')).toEqual([])
  })

  it('does not complain about the summary, the numbers or the verbs', () => {
    expect(ids(findings)).not.toContain('summary/too-long')
    expect(ids(findings)).not.toContain('experience/no-numbers')
    expect(ids(findings)).not.toContain('experience/no-action-verb')
  })
})

/**
 * The test that protects the product's differentiator: the same resume gets a
 * different diagnosis depending on where it is being sent.
 */
describe('the same resume is judged differently by market', () => {
  it('accepts the photo in Argentina and rejects it abroad', () => {
    expect(ids(runAnalysis(administrativeAr, arContext))).not.toContain('market/forbidden-photo')
    expect(ids(runAnalysis(administrativeAr, intlContext))).toContain('market/forbidden-photo')
  })

  it('only warns about the document number in Argentina, but forbids it abroad', () => {
    expect(ids(runAnalysis(administrativeAr, arContext))).toContain('market/discouraged-documentId')
    expect(ids(runAnalysis(administrativeAr, intlContext))).toContain('market/forbidden-documentId')
  })

  it('raises errors abroad that do not exist locally', () => {
    const local = runAnalysis(administrativeAr, arContext).filter((f) => f.severity === 'error')
    const abroad = runAnalysis(administrativeAr, intlContext).filter((f) => f.severity === 'error')
    expect(abroad.length).toBeGreaterThan(local.length)
  })
})

describe('findings are usable', () => {
  it('never shows a problem without a concrete action', () => {
    const all = [
      ...runAnalysis(administrativeAr, arContext),
      ...runAnalysis(administrativeAr, intlContext),
      ...runAnalysis(cleanAr, arContext),
    ]
    for (const finding of all) {
      expect(finding.action.trim(), `rule ${finding.id} has no action`).not.toBe('')
      expect(finding.problem.trim(), `rule ${finding.id} has no problem`).not.toBe('')
    }
  })

  it('sorts errors before warnings before suggestions', () => {
    const order = { error: 0, warning: 1, suggestion: 2 }
    const severities = runAnalysis(administrativeAr, intlContext).map((f) => order[f.severity])
    expect(severities).toEqual([...severities].sort((a, b) => a - b))
  })
})

/**
 * A control that can switch itself off needs its own test. A run with no
 * findings does not prove the engine works -- it looks exactly like an engine
 * that is not running. So: give it something it MUST reject.
 */
describe('the engine is actually switched on', () => {
  it('rejects a resume that ATS mode has to reject', () => {
    const mustFail = runAnalysis(administrativeAr, {
      profile: AR_PROFILE,
      atsMode: true,
      template: 'modern',
    })
    expect(ids(mustFail)).toContain('ats/unsafe-template')
    expect(ids(mustFail)).toContain('ats/photo-present')
  })

  it('has every rule wired into the engine', () => {
    expect(ALL_RULES.length).toBeGreaterThan(10)
    for (const rule of ALL_RULES) {
      expect(typeof rule).toBe('function')
    }
  })

  it('is pure: the same input twice gives the same output', () => {
    expect(runAnalysis(administrativeAr, arContext)).toEqual(
      runAnalysis(administrativeAr, arContext),
    )
  })
})
