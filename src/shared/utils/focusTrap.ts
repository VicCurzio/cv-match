/**
 * Where Tab should land inside a modal, as arithmetic.
 *
 * The trap itself is three lines of DOM calls; the part that is easy to get
 * wrong and impossible to check by reading is *when* to wrap and to which end.
 * Pulled out here for the same reason the photo crop is a pure function: a
 * browser cannot be asked about it in a test, and this decides whether someone
 * navigating by keyboard can leave a dialog they cannot see out of.
 */

/**
 * The item to focus, or `null` to let the browser do what it would anyway.
 *
 * `active` is the index of the currently focused item among the focusable ones,
 * or -1 when focus is on the dialog container itself (which is where it starts,
 * before anything inside has been tabbed to).
 */
export function wrapFocus<T>(items: T[], active: number, backwards: boolean): T | null {
  if (items.length === 0) return null

  // Going back from the first item -- or from the container -- lands on the last.
  if (backwards && active <= 0) return items.at(-1) ?? null

  // Going forward from the last item lands on the first.
  if (!backwards && active === items.length - 1) return items[0] ?? null

  return null
}
