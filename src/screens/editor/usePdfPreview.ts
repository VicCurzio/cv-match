import { useEffect, useRef, useState } from 'react'
import { layoutFacts, readPdf, type LayoutFacts } from '@/domain/export/readPdfText'
import type { Resume } from '@/domain/resume/resumeSchema'
import { buildPdf, type BuildOptions } from '@/templates/buildPdf'

const RENDER_DELAY_MS = 400

interface Rendered {
  key: string
  blob: Blob
  url: string
  layout: LayoutFacts | null
}

export interface PreviewState {
  /** The very Blob the download button saves. One artifact, no second layout. */
  blob: Blob | null
  url: string | null
  building: boolean
  error: string | null
  /**
   * Measured from the rendered file: how many pages it really is, and how full
   * the last one is. Fed to the analysis engine so the length rules judge the
   * document rather than a guess about it.
   */
  layout: LayoutFacts | null
}

/**
 * Renders the PDF on a delay and keeps exactly one object URL alive.
 *
 * Both halves matter. Re-rendering the PDF on every keystroke freezes the tab,
 * and forgetting to revoke the previous URL leaks a whole Blob per keystroke
 * until the tab crawls.
 *
 * `building` is derived from comparing the rendered key with the current one
 * rather than set from inside the effect, so a render never schedules another
 * render just to flip a flag.
 */
export function usePdfPreview(resume: Resume, options: BuildOptions): PreviewState {
  const key = JSON.stringify([resume, options.profile.id, options.atsMode, options.template])

  const [rendered, setRendered] = useState<Rendered | null>(null)
  const [error, setError] = useState<string | null>(null)
  const latestUrl = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const timer = setTimeout(() => {
      buildPdf(resume, options)
        .then(async (blob) => {
          /*
           * Measuring is an enrichment: it sharpens the length rules. The PDF is
           * the product. So a failure here costs the page count, never the
           * preview -- which is exactly what it cost the first time, when a
           * reader bug turned into "no se pudo armar el PDF".
           */
          let layout: LayoutFacts | null = null
          try {
            layout = layoutFacts(await readPdf(new Uint8Array(await blob.arrayBuffer())))
          } catch (cause) {
            console.warn('No se pudo medir el PDF; la vista previa sigue igual.', cause)
          }
          if (cancelled) return
          if (latestUrl.current) URL.revokeObjectURL(latestUrl.current)
          const url = URL.createObjectURL(blob)
          latestUrl.current = url
          setRendered({ key, blob, url, layout })
          setError(null)
        })
        .catch((cause: unknown) => {
          if (cancelled) return
          setError(
            cause instanceof Error
              ? `No se pudo armar el PDF: ${cause.message}`
              : 'No se pudo armar el PDF.',
          )
        })
    }, RENDER_DELAY_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
    // `key` already encodes the resume and every build option.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  useEffect(
    () => () => {
      if (latestUrl.current) URL.revokeObjectURL(latestUrl.current)
    },
    [],
  )

  return {
    blob: rendered?.blob ?? null,
    url: rendered?.url ?? null,
    building: rendered?.key !== key,
    error,
    layout: rendered?.layout ?? null,
  }
}
