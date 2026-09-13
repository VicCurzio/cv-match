import { useMemo } from 'react'
import { comparePosting } from '@/domain/posting/comparePosting'
import type { Resume } from '@/domain/resume/resumeSchema'
import { copy } from '@/shared/config/copy'

/** How many missing words fit before the list stops being read. */
const MISSING_SHOWN = 12

/**
 * The words of the posting the resume never says, next to the posting itself.
 *
 * Shown as a list to review, never as a score: a percentage would invite people
 * to paste words in until it goes up. Each word is a question for the person --
 * whether they actually do that -- and the copy says so.
 */
export function PostingMatch({
  posting,
  resume,
  company,
}: {
  posting: string
  /** The version as it will be exported, so what the person adapts counts. */
  resume: Resume
  company: string
}) {
  const result = useMemo(() => comparePosting(posting, resume, { company }), [posting, resume, company])
  const total = result.covered.length + result.missing.length

  if (!posting.trim()) {
    return <p className="text-xs text-muted-foreground">{copy.posting.empty}</p>
  }
  if (total === 0) {
    return <p className="text-xs text-muted-foreground">{copy.posting.nothing}</p>
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-3" aria-live="polite">
      <p className="text-xs text-muted-foreground">
        {copy.posting.summary(result.covered.length, total)}
      </p>

      {result.missing.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium">{copy.posting.missing}</span>
          <ul className="flex flex-wrap gap-1.5">
            {result.missing.slice(0, MISSING_SHOWN).map((term) => (
              <li
                key={term.label}
                className="rounded-full border border-severity-warning/40 bg-severity-warning/10 px-2.5 py-0.5 text-xs"
              >
                {term.label}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">{copy.posting.missingHint}</p>
        </div>
      ) : (
        <p className="text-xs font-medium">{copy.posting.allCovered}</p>
      )}

      {result.covered.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium">{copy.posting.covered}</span>
          <ul className="flex flex-wrap gap-1.5">
            {result.covered.map((term) => (
              <li key={term.label} className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                {term.label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">{copy.posting.limit}</p>
    </div>
  )
}
