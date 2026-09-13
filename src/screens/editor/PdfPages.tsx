import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
import { X, ZoomIn } from 'lucide-react'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { Button } from '@/shared/ui/Button'
import { Dialog } from '@/shared/ui/Dialog'
import { copy } from '@/shared/config/copy'
import { canvasSize, loadPdfjs } from '@/shared/utils/pdfjs'

/**
 * The preview as the sheets themselves, drawn from the very Blob the download
 * button saves.
 *
 * It used to be the browser's PDF viewer in an iframe: a toolbar, a thumbnail
 * rail and grey chrome around a page too small to read. What someone checking
 * their resume wants is the page, and a way to look at it closely. Drawing the
 * same file keeps the one guarantee that matters -- what you approve on screen
 * is byte for byte what you send.
 */

/** A4 height over width, for the space a page takes before it is drawn. */
const A4_RATIO = 841.89 / 595.28

/**
 * Opens the Blob with pdfjs, keeping the previous document on screen until the
 * next one is ready: re-rendering on every edit must not blink the preview.
 */
export function usePdfDocument(blob: Blob | null): { doc: PDFDocumentProxy | null; failed: boolean } {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [failed, setFailed] = useState(false)
  // pdfjs frees a document through the task that loaded it, not the document.
  const current = useRef<PDFDocumentLoadingTask | null>(null)

  useEffect(() => {
    if (!blob) return
    let cancelled = false

    void (async () => {
      try {
        const pdfjs = await loadPdfjs()
        const data = new Uint8Array(await blob.arrayBuffer())
        const task = pdfjs.getDocument({ data })
        const next = await task.promise
        if (cancelled) {
          void task.destroy()
          return
        }
        const previous = current.current
        current.current = task
        setDoc(next)
        setFailed(false)
        void previous?.destroy()
      } catch (cause) {
        if (cancelled) return
        console.warn('No se pudo dibujar la vista previa; se muestra el visor del navegador.', cause)
        setFailed(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [blob])

  useEffect(
    () => () => {
      void current.current?.destroy()
    },
    [],
  )

  return { doc, failed }
}

/** The element's width in CSS pixels, updated on resize but not on every frame of it. */
function useWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    let timer: ReturnType<typeof setTimeout> | null = null
    const measure = () => setWidth(Math.round(element.clientWidth))
    measure()
    const observer = new ResizeObserver(() => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(measure, 120)
    })
    observer.observe(element)
    return () => {
      observer.disconnect()
      if (timer) clearTimeout(timer)
    }
  }, [ref])

  return width
}

function PdfPage({ doc, pageNumber, width }: { doc: PDFDocumentProxy; pageNumber: number; width: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ratio, setRatio] = useState(A4_RATIO)

  useEffect(() => {
    if (width <= 0) return
    let cancelled = false
    let task: RenderTask | null = null

    void (async () => {
      try {
        const page = await doc.getPage(pageNumber)
        if (cancelled) return
        const base = page.getViewport({ scale: 1 })
        const size = canvasSize(base.width, base.height, width, window.devicePixelRatio || 1)

        /*
         * Drawn off screen first, then copied in one step. Rendering straight
         * into the visible canvas would clear it at the start of every render,
         * and the sheet would flash white on each keystroke.
         */
        const buffer = document.createElement('canvas')
        buffer.width = size.pixelWidth
        buffer.height = size.pixelHeight
        task = page.render({ canvas: buffer, viewport: page.getViewport({ scale: size.scale }) })
        await task.promise
        if (cancelled) return

        const canvas = canvasRef.current
        if (!canvas) return
        canvas.width = buffer.width
        canvas.height = buffer.height
        canvas.getContext('2d')?.drawImage(buffer, 0, 0)
        setRatio(base.height / base.width)
      } catch (cause) {
        // Cancelled by a newer render or a replaced document is expected: the
        // pixels already on screen stay until the newer one lands. Anything
        // else is a real failure and must not disappear without a trace.
        const expected = cancelled || (cause instanceof Error && cause.name === 'RenderingCancelledException')
        if (!expected) console.warn('No se pudo dibujar la página', pageNumber, cause)
      }
    })()

    return () => {
      cancelled = true
      task?.cancel()
    }
  }, [doc, pageNumber, width])

  return (
    <canvas
      ref={canvasRef}
      className="block h-auto w-full bg-white"
      style={{ aspectRatio: `1 / ${ratio}` }}
      aria-hidden="true"
    />
  )
}

function pageNumbers(doc: PDFDocumentProxy): number[] {
  return Array.from({ length: doc.numPages }, (_, index) => index + 1)
}

/**
 * The sheets at the width of the preview column. Each one is a button: a click
 * opens it large.
 */
export function PdfPages({ doc, onOpen }: { doc: PDFDocumentProxy; onOpen: (page: number) => void }) {
  const box = useRef<HTMLDivElement>(null)
  const width = useWidth(box)

  return (
    <div ref={box} className="flex flex-col gap-4">
      {pageNumbers(doc).map((page) => (
        <button
          key={page}
          type="button"
          onClick={() => onOpen(page)}
          aria-label={copy.editor.openPage(page, doc.numPages)}
          className="group relative block w-full cursor-zoom-in overflow-hidden rounded-sm shadow-md ring-1 ring-black/5 transition-shadow duration-150 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <PdfPage doc={doc} pageNumber={page} width={width} />
          <span className="pointer-events-none absolute top-2 right-2 flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-xs text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
            <ZoomIn className="size-3.5" />
            {copy.editor.zoom}
          </span>
        </button>
      ))}
    </div>
  )
}

/** Room for a page before the first one is drawn, so the column does not jump. */
export function PdfPagePlaceholder() {
  return <div className="w-full animate-pulse rounded-sm bg-card" style={{ aspectRatio: `1 / ${A4_RATIO}` }} />
}

/**
 * The large view. Every page, one under the other, as wide as reads comfortably,
 * scrolled to the page that was clicked.
 */
export function PdfLightbox({
  doc,
  startPage,
  onClose,
}: {
  doc: PDFDocumentProxy
  startPage: number
  onClose: () => void
}) {
  const box = useRef<HTMLDivElement>(null)
  const width = useWidth(box)

  // Once, when the pages first have a size. Repeating it on every resize would
  // yank someone back to the page they clicked while they read another one.
  const scrolled = useRef(false)
  useEffect(() => {
    if (scrolled.current || width <= 0) return
    scrolled.current = true
    box.current?.querySelector(`[data-page="${startPage}"]`)?.scrollIntoView({ block: 'start' })
  }, [startPage, width])

  return (
    <Dialog label={copy.editor.preview} onClose={onClose} className="max-w-4xl" align="start">
      <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-3">
        <h2 className="text-sm font-semibold">
          {copy.editor.preview}
          <span className="ml-2 font-normal text-muted-foreground">
            {copy.editor.pageCount(doc.numPages)}
          </span>
        </h2>
        <Button variant="ghost" size="icon" aria-label="Cerrar" onClick={onClose}>
          <X />
        </Button>
      </div>
      <div className="max-h-[calc(100vh-8rem)] overflow-y-auto bg-muted p-4 sm:p-6">
        <div ref={box} className="mx-auto flex max-w-3xl flex-col gap-6">
          {pageNumbers(doc).map((page) => (
            <div key={page} data-page={page} className="scroll-mt-4 shadow-lg ring-1 ring-black/5">
              <PdfPage doc={doc} pageNumber={page} width={width} />
            </div>
          ))}
        </div>
      </div>
    </Dialog>
  )
}
