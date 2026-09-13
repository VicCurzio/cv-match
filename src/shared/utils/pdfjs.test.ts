import { describe, expect, it } from 'vitest'
import { MAX_CANVAS_SIDE, canvasSize } from './pdfjs'

/** An A4 page in PDF points. */
const A4 = { width: 595.28, height: 841.89 }

describe('how big a page is drawn', () => {
  it('fits the page to the width it is shown at, keeping the A4 proportion', () => {
    const size = canvasSize(A4.width, A4.height, 500, 1)
    expect(size.cssWidth).toBe(500)
    expect(size.cssHeight).toBeCloseTo(500 * (A4.height / A4.width), 5)
  })

  it('draws with every real pixel of a dense screen, so the text is sharp', () => {
    const one = canvasSize(A4.width, A4.height, 500, 1)
    const two = canvasSize(A4.width, A4.height, 500, 2)
    expect(two.pixelWidth).toBe(one.pixelWidth * 2)
    // The size on screen does not change: only the sharpness does.
    expect(two.cssWidth).toBe(one.cssWidth)
    expect(two.cssHeight).toBe(one.cssHeight)
  })

  it('never draws below one pixel per CSS pixel, even if the browser reports less', () => {
    expect(canvasSize(A4.width, A4.height, 500, 0.5).pixelWidth).toBe(
      canvasSize(A4.width, A4.height, 500, 1).pixelWidth,
    )
  })

  it('caps the bitmap on a large preview on a dense screen', () => {
    const size = canvasSize(A4.width, A4.height, 1400, 3)
    expect(Math.max(size.pixelWidth, size.pixelHeight)).toBeLessThanOrEqual(MAX_CANVAS_SIDE)
    // Capped bitmap, same place on screen.
    expect(size.cssWidth).toBe(1400)
  })

  it('the scale it returns produces the pixel size it reports', () => {
    const size = canvasSize(A4.width, A4.height, 420, 2)
    expect(size.pixelWidth).toBe(Math.floor(A4.width * size.scale))
    expect(size.pixelHeight).toBe(Math.floor(A4.height * size.scale))
  })
})
