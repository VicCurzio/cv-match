import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-card border border-border bg-card', className)}
      {...props}
    />
  )
}

export function Section({
  title,
  description,
  action,
  children,
}: {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </Card>
  )
}

export function Notice({
  tone = 'info',
  live = false,
  children,
}: {
  tone?: 'info' | 'warning'
  /**
   * For a notice that APPEARS in reaction to something -- a save that failed, a
   * market that was just changed. Without it the text shows up on screen and a
   * screen reader says nothing, so the only people who learn that the photo will
   * not be exported are the ones who can see the box.
   */
  live?: boolean
  children: ReactNode
}) {
  return (
    <p
      role={live ? 'status' : undefined}
      className={cn(
        'rounded-lg border px-3 py-2 text-xs leading-relaxed',
        tone === 'warning'
          ? 'border-severity-warning/40 bg-severity-warning/10 text-severity-warning'
          : 'border-border bg-muted text-muted-foreground',
      )}
    >
      {children}
    </p>
  )
}
