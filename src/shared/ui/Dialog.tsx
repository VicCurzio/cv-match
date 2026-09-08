import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'
import { wrapFocus } from '@/shared/utils/focusTrap'

/**
 * The shell every modal in the app uses.
 *
 * The three dialogs each drew their own overlay, and all three were keyboard
 * traps in the wrong direction: no Escape, no focus containment, and focus left
 * behind the overlay when they closed. Someone navigating by keyboard could open
 * the import dialog and then tab through the editor underneath it, filling in a
 * form they could not see.
 *
 * Doing it once here is also what keeps the behaviour identical in all three.
 *
 * Escape closes; clicking the backdrop does NOT. Every way out of the letter
 * dialog throws away the paragraph the person typed, so the only ones offered
 * are the deliberate ones -- the close button, "Cerrar", and Escape. A stray
 * click beside the panel is not a decision to discard anything.
 */

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

interface Props {
  /** Names the dialog for screen readers. */
  label: string
  onClose: () => void
  /** Extra classes for the panel -- its width, mostly. */
  className?: string
  /** A short panel is centred; a tall one starts at the top so it can scroll. */
  align?: 'start' | 'center'
  children: ReactNode
}

export function Dialog({ label, onClose, className, align = 'start', children }: Props) {
  const panel = useRef<HTMLDivElement>(null)

  /*
   * `onClose` is a fresh arrow function on every render of the parent. Kept in
   * the dependency list it would re-run the effect -- and re-focus the first
   * field -- on every keystroke typed inside the dialog.
   */
  const close = useRef(onClose)
  useEffect(() => {
    close.current = onClose
  })

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const items = () =>
      [...(panel.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])].filter(
        (element) => element.offsetParent !== null,
      )

    /*
     * Focus lands on the panel, not on the first control inside it. The first
     * control is the close button in all three dialogs, and putting focus there
     * means the first Enter someone presses closes what they just opened.
     */
    panel.current?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        close.current()
        return
      }
      if (event.key !== 'Tab') return

      // Wrap at both ends, so Tab never reaches the page behind the overlay.
      const focusable = items()
      const active = focusable.indexOf(document.activeElement as HTMLElement)
      const target = wrapFocus(focusable, active, event.shiftKey)
      if (!target) return

      event.preventDefault()
      target.focus()
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      // Back to the button that opened it, not to the top of the page.
      opener?.focus()
    }
  }, [])

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex justify-center overflow-y-auto bg-black/50 p-6',
        align === 'center' ? 'items-center' : 'items-start',
      )}
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <div
        ref={panel}
        tabIndex={-1}
        className={cn('w-full rounded-card border border-border bg-card outline-none', className)}
      >
        {children}
      </div>
    </div>
  )
}
