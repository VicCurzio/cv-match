import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { useId } from 'react'
import { cn } from '@/shared/utils/cn'

const control =
  'w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 disabled:opacity-50'

/** Every input gets a real label. A placeholder is not a label. */
function Wrapper({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string
  hint?: string
  htmlFor: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

export function TextField({
  label,
  hint,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  const id = useId()
  return (
    <Wrapper label={label} hint={hint} htmlFor={id}>
      <input id={id} className={cn(control, 'h-10', className)} {...props} />
    </Wrapper>
  )
}

export function TextAreaField({
  label,
  hint,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string }) {
  const id = useId()
  return (
    <Wrapper label={label} hint={hint} htmlFor={id}>
      <textarea id={id} className={cn(control, 'min-h-28 resize-y leading-relaxed', className)} {...props} />
    </Wrapper>
  )
}

export function SelectField({
  label,
  hint,
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; hint?: string }) {
  const id = useId()
  return (
    <Wrapper label={label} hint={hint} htmlFor={id}>
      <select id={id} className={cn(control, 'h-10', className)} {...props}>
        {children}
      </select>
    </Wrapper>
  )
}
