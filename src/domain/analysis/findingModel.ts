import type { MarketProfile } from '@/domain/market/marketProfile'
import type { Resume } from '@/domain/resume/resumeSchema'

/** Ordered worst-first. The panel sorts by this. */
export const SEVERITIES = ['error', 'warning', 'suggestion'] as const
export type Severity = (typeof SEVERITIES)[number]

export const SEVERITY_LABEL: Record<Severity, string> = {
  error: 'Error',
  warning: 'Advertencia',
  suggestion: 'Sugerencia',
}

export type Section =
  | 'personal'
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'languages'
  | 'layout'

export interface Finding {
  /** Stable rule id. Tests assert on these, so they do not change casually. */
  id: string
  severity: Severity
  section: Section
  /** What is wrong, in plain language. */
  problem: string
  /**
   * What to do about it. A finding without a concrete action is not worth
   * showing: it just makes someone feel bad without telling them how to fix it.
   */
  action: string
  /** The specific experience/education entry this points at, when it has one. */
  itemId?: string
}

export interface RuleContext {
  profile: MarketProfile
  atsMode: boolean
  template: 'harvard' | 'modern'
  /**
   * Measured from the rendered PDF, when one exists. Rules prefer these over
   * their own estimates: a line-count guess was off by a factor of seven on the
   * first real resume it met. Absent in tests that only care about content.
   */
  layout?: {
    pageCount: number
    /** Share of the document's text that sits on the last page, 0 to 1. */
    lastPageShare: number
  }
}

/**
 * A rule is a pure function. No network, no state, no clock -- which is what
 * makes the whole engine testable in milliseconds against fixtures.
 */
export type Rule = (resume: Resume, ctx: RuleContext) => Finding[]

export function bySeverity(a: Finding, b: Finding): number {
  return SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity)
}
