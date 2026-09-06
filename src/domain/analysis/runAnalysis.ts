import { bySeverity, type Finding, type Rule, type RuleContext } from './findingModel'
import { atsRules } from './rules/atsRules'
import { contactRules } from './rules/contactRules'
import { contentRules } from './rules/contentRules'
import { marketRules } from './rules/marketRules'
import type { Resume } from '@/domain/resume/resumeSchema'

/**
 * Adding a rule is adding it to this list. Nothing else changes.
 */
export const ALL_RULES: Rule[] = [
  ...contactRules,
  ...contentRules,
  ...marketRules,
  ...atsRules,
]

/**
 * Pure: same resume plus same context always gives the same findings. No
 * network, no state, no clock -- which is what makes the core testable against
 * fixtures in milliseconds, and what keeps the resume on the user's machine.
 */
export function runAnalysis(resume: Resume, ctx: RuleContext): Finding[] {
  const findings = ALL_RULES.flatMap((rule) => rule(resume, ctx))
  return findings.sort(bySeverity)
}

export function countBySeverity(findings: Finding[]): {
  error: number
  warning: number
  suggestion: number
} {
  return {
    error: findings.filter((f) => f.severity === 'error').length,
    warning: findings.filter((f) => f.severity === 'warning').length,
    suggestion: findings.filter((f) => f.severity === 'suggestion').length,
  }
}
