import { describe, expect, it } from 'vitest'
import { clampOffset, cropRectFor, panLimits, type Framing } from './cropRect'

/** A portrait photo from a phone, and the 240px square preview. */
const portrait: Framing = {
  natural: { w: 300, h: 500 },
  view: 240,
  zoom: 1,
  offset: { x: 0, y: 0 },
}

describe('the default framing is the centred square', () => {
  it('takes the largest square it can from the shorter side', () => {
    const rect = cropRectFor(portrait)
    expect(rect.size).toBe(300)
    expect(rect.x).toBe(0)
    expect(rect.y).toBe(100)
  })

  it('does the same for a landscape photo, the other way round', () => {
    const rect = cropRectFor({ ...portrait, natural: { w: 800, h: 400 } })
    expect(rect.size).toBe(400)
    expect(rect.x).toBe(200)
    expect(rect.y).toBe(0)
  })

  it('handles an already square photo', () => {
    const rect = cropRectFor({ ...portrait, natural: { w: 500, h: 500 } })
    expect(rect).toEqual({ x: 0, y: 0, size: 500 })
  })
})

/**
 * The reason the control exists: on a phone portrait the head sits above centre,
 * so the automatic square lands on a chin. Panning down has to move the crop up.
 */
describe('panning moves the crop the way the image moved', () => {
  it('dragging the image down takes a square from higher up', () => {
    const centred = cropRectFor(portrait)
    const panned = cropRectFor({ ...portrait, offset: { x: 0, y: 60 } })

    expect(panned.y).toBeLessThan(centred.y)
    expect(panned.size).toBe(centred.size)
  })

  it('dragging up takes a square from lower down', () => {
    const centred = cropRectFor(portrait)
    const panned = cropRectFor({ ...portrait, offset: { x: 0, y: -60 } })
    expect(panned.y).toBeGreaterThan(centred.y)
  })

  it('never lets the crop leave the image', () => {
    for (const y of [-9999, -300, 0, 300, 9999]) {
      const rect = cropRectFor({ ...portrait, offset: { x: 0, y } })
      expect(rect.y).toBeGreaterThanOrEqual(0)
      expect(rect.y + rect.size).toBeLessThanOrEqual(portrait.natural.h)
    }
  })
})

describe('zooming takes a smaller square', () => {
  it('halves the crop side at double zoom', () => {
    expect(cropRectFor({ ...portrait, zoom: 2 }).size).toBe(150)
  })

  it('keeps the crop centred when nothing is panned', () => {
    const rect = cropRectFor({ ...portrait, zoom: 2 })
    expect(rect.x).toBe((300 - 150) / 2)
    expect(rect.y).toBe((500 - 150) / 2)
  })
})

describe('the square is never allowed to show empty space', () => {
  it('allows no horizontal pan when the image only just covers the square', () => {
    // A portrait at zoom 1 covers the width exactly: nothing to pan sideways.
    expect(panLimits({ natural: { w: 300, h: 500 }, view: 240, zoom: 1 }).x).toBe(0)
  })

  it('allows vertical pan on a portrait, because there is spare height', () => {
    expect(panLimits({ natural: { w: 300, h: 500 }, view: 240, zoom: 1 }).y).toBeGreaterThan(0)
  })

  it('clamps an offset that would expose a corner', () => {
    const clamped = clampOffset({ ...portrait, offset: { x: 500, y: 500 } })
    const limit = panLimits(portrait)
    expect(clamped.x).toBe(limit.x)
    expect(clamped.y).toBe(limit.y)
  })

  it('opens up horizontal pan once zoomed in', () => {
    expect(panLimits({ natural: { w: 300, h: 500 }, view: 240, zoom: 2 }).x).toBeGreaterThan(0)
  })
})
