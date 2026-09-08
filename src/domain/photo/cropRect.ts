export interface CropRect {
  x: number
  y: number
  size: number
}

export interface Framing {
  /** Natural size of the source image, in pixels. */
  natural: { w: number; h: number }
  /** Side of the square preview, in CSS pixels. */
  view: number
  /** 1 means the shorter side exactly fills the square. */
  zoom: number
  /** Pan applied to the image inside the preview, in CSS pixels. */
  offset: { x: number; y: number }
}

/** The scale at which the shorter side exactly covers the square. */
export function baseScale(natural: { w: number; h: number }, view: number): number {
  return view / Math.min(natural.w, natural.h)
}

/**
 * How far the image may be panned before a corner of the square would be empty.
 * Zero when the image only just covers it.
 */
export function panLimits(framing: Omit<Framing, 'offset'>): { x: number; y: number } {
  const scale = baseScale(framing.natural, framing.view) * framing.zoom
  return {
    x: Math.max(0, (framing.natural.w * scale - framing.view) / 2),
    y: Math.max(0, (framing.natural.h * scale - framing.view) / 2),
  }
}

/** Keeps a pan inside those limits. */
export function clampOffset(framing: Framing): { x: number; y: number } {
  const limit = panLimits(framing)
  return {
    x: Math.min(limit.x, Math.max(-limit.x, framing.offset.x)),
    y: Math.min(limit.y, Math.max(-limit.y, framing.offset.y)),
  }
}

/**
 * Turns the on-screen framing into a square in source pixels.
 *
 * The preview shows the image centred, then panned by `offset`, then scaled.
 * So the point at the preview's top-left corner is half a viewport up and left
 * of the image centre, undoing the pan and the scale.
 *
 * Pure and unit-shaped on purpose: this is the part that decides whether the
 * photo lands on someone's face or on their chin, and it is the part a browser
 * cannot be asked about in a test.
 */
export function cropRectFor(framing: Framing): CropRect {
  const { natural, view, offset } = framing
  const scale = baseScale(natural, view) * framing.zoom
  const size = view / scale

  const x = natural.w / 2 - size / 2 - offset.x / scale
  const y = natural.h / 2 - size / 2 - offset.y / scale

  return {
    size,
    x: Math.min(Math.max(0, x), Math.max(0, natural.w - size)),
    y: Math.min(Math.max(0, y), Math.max(0, natural.h - size)),
  }
}
