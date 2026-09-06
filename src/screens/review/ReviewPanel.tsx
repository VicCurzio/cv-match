import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react'
import type { Finding, Severity } from '@/domain/analysis/findingModel'
import { SEVERITY_LABEL } from '@/domain/analysis/findingModel'
import { countBySeverity } from '@/domain/analysis/runAnalysis'
import { Card } from '@/shared/ui/Card'
import { copy } from '@/shared/config/copy'

/**
 * Severity is never carried by colour alone: each finding shows an icon and a
 * written label as well.
 */
const ICON: Record<Severity, typeof Info> = {
  error: CircleAlert,
  warning: TriangleAlert,
  suggestion: Info,
}

const TONE: Record<Severity, string> = {
  error: 'text-severity-error',
  warning: 'text-severity-warning',
  suggestion: 'text-severity-suggestion',
}

export function ReviewPanel({ findings }: { findings: Finding[] }) {
  const counts = countBySeverity(findings)

  return (
    <Card className="p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold">{copy.review.title}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {copy.review.counts(counts.error, counts.warning, counts.suggestion)}
        </p>
      </div>

      {findings.length === 0 ? (
        <div className="flex items-start gap-2 rounded-lg bg-muted p-3">
          <CircleCheck size={16} className="mt-0.5 shrink-0 text-severity-suggestion" />
          <p className="text-sm">{copy.review.empty}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {counts.error === 0 ? (
            <li className="flex items-start gap-2 rounded-lg bg-muted p-3">
              <CircleCheck size={16} className="mt-0.5 shrink-0 text-severity-suggestion" />
              <p className="text-sm">{copy.review.emptyErrors}</p>
            </li>
          ) : null}

          {findings.map((finding, index) => {
            const Icon = ICON[finding.severity]
            return (
              <li
                key={`${finding.id}-${finding.itemId ?? index}`}
                className="flex items-start gap-3 rounded-lg border border-border p-3"
              >
                <Icon size={16} className={`mt-0.5 shrink-0 ${TONE[finding.severity]}`} />
                <div className="min-w-0">
                  <p className={`text-[11px] font-medium uppercase ${TONE[finding.severity]}`}>
                    {SEVERITY_LABEL[finding.severity]}
                  </p>
                  <p className="mt-0.5 text-sm">{finding.problem}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {finding.action}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
