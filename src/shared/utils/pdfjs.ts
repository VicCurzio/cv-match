import type * as Pdfjs from 'pdfjs-dist'

/**
 * pdfjs, loaded once and on demand.
 *
 * It weighs more than the rest of the app, so it is never in the first bundle.
 * Both the importer and the preview use it; loading it through one function
 * keeps the worker configured in one place.
 */
let loading: Promise<typeof Pdfjs> | null = null

export function loadPdfjs(): Promise<typeof Pdfjs> {
  loading ??= (async () => {
    const pdfjs = await import('pdfjs-dist')
    // The worker must come from this same site. Loaded from a CDN it works in
    // development and fails in production, which is the worst way to find out.
    const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
    return pdfjs
  })().catch((cause: unknown) => {
    // A failed chunk load (a flaky connection, a deploy mid-session) must not
    // be cached forever: the next call gets to try again.
    loading = null
    throw cause
  })
  return loading
}

/** Canvas bitmaps past this size fail silently on some mobile browsers. */
export const MAX_CANVAS_SIDE = 4096

export interface CanvasSize {
  /** Scale to pass to `page.getViewport`. */
  scale: number
  pixelWidth: number
  pixelHeight: number
  cssWidth: number
  cssHeight: number
}

/**
 * How big to draw a page so it is sharp and fits.
 *
 * The page is laid out at `cssWidth` on screen, but drawn with as many real
 * pixels as the screen has -- two or three per CSS pixel on a phone or a
 * retina laptop. Drawing at one pixel per CSS pixel is what makes a PDF
 * preview look blurry. The bitmap is capped, so a large preview on a dense
 * screen does not ask for a canvas the browser refuses to allocate.
 */
export function canvasSize(
  pageWidth: number,
  pageHeight: number,
  cssWidth: number,
  devicePixelRatio: number,
): CanvasSize {
  const fit = cssWidth / pageWidth
  const density = Math.max(1, devicePixelRatio)
  const wanted = fit * density
  const cap = MAX_CANVAS_SIDE / Math.max(pageWidth, pageHeight)
  const scale = Math.min(wanted, cap)

  return {
    scale,
    pixelWidth: Math.floor(pageWidth * scale),
    pixelHeight: Math.floor(pageHeight * scale),
    cssWidth,
    cssHeight: pageHeight * fit,
  }
}
