import { describe, expect, it } from 'vitest'
import { wrapFocus } from './focusTrap'

const items = ['a', 'b', 'c']

describe('focus wraps at both ends of a dialog', () => {
  it('sends Tab from the last item back to the first', () => {
    expect(wrapFocus(items, 2, false)).toBe('a')
  })

  it('sends Shift+Tab from the first item to the last', () => {
    expect(wrapFocus(items, 0, true)).toBe('c')
  })

  /**
   * Focus starts on the dialog container, not on an item. Without this case,
   * the first Shift+Tab of a dialog escapes to the page underneath -- which is
   * the whole failure being prevented.
   */
  it('sends Shift+Tab from the container itself to the last item', () => {
    expect(wrapFocus(items, -1, true)).toBe('c')
  })
})

describe('it does not interfere anywhere else', () => {
  it('leaves Tab in the middle of the list alone', () => {
    expect(wrapFocus(items, 0, false)).toBeNull()
    expect(wrapFocus(items, 1, false)).toBeNull()
    expect(wrapFocus(items, 1, true)).toBeNull()
    expect(wrapFocus(items, 2, true)).toBeNull()
  })

  it('leaves Tab from the container alone: the browser already goes first', () => {
    expect(wrapFocus(items, -1, false)).toBeNull()
  })

  it('does nothing when there is nothing to focus', () => {
    expect(wrapFocus([], -1, true)).toBeNull()
    expect(wrapFocus([], 0, false)).toBeNull()
  })

  it('keeps a single focusable element on itself, both ways', () => {
    expect(wrapFocus(['only'], 0, true)).toBe('only')
    expect(wrapFocus(['only'], 0, false)).toBe('only')
  })
})
