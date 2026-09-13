import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist'
import { useEffect, useRef, useState } from 'react'
import { loadPdfjs } from '@/shared/utils/pdfjs'

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
