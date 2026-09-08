import { X, ZoomIn } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { compressPhoto } from '@/domain/photo/compressPhoto'
import { baseScale, clampOffset, cropRectFor } from '@/domain/photo/cropRect'
import { Button } from '@/shared/ui/Button'
import { Notice } from '@/shared/ui/Card'
import { Dialog } from '@/shared/ui/Dialog'
import { copy } from '@/shared/config/copy'

/** Side of the square preview, in CSS pixels. */
const VIEW = 240
const MAX_ZOOM = 3

interface Props {
  file: File
  onDone: (dataUrl: string) => void
  onError: (message: string) => void
  onClose: () => void
}

/**
 * Pick the square that will end up on the resume.
 *
 * The automatic centred square is wrong often enough to matter: phone photos are
 * portrait and heads sit above centre, so the default crop lands on a chin. The
 * controls are the two that solve it -- drag to frame, slider to zoom -- and
 * nothing else.
 */
export function PhotoDialog({ file, onDone, onError, onClose }: Props) {
  const [src, setSrc] = useState<string | null>(null)
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [busy, setBusy] = useState(false)
  const dragging = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const scale = (natural ? baseScale(natural, VIEW) : 1) * zoom

  /** Keep the square covered: the image may never expose an empty corner. */
  function clamp(next: { x: number; y: number }) {
    if (!natural) return next
    return clampOffset({ natural, view: VIEW, zoom, offset: next })
  }

  useEffect(() => {
    setOffset((current) => clamp(current))
    // Re-clamping on zoom keeps the frame filled when zooming back out.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, natural])

  async function confirm() {
    if (!natural) return
    setBusy(true)

    const result = await compressPhoto(file, cropRectFor({ natural, view: VIEW, zoom, offset }))
    setBusy(false)
    if (result.ok) onDone(result.dataUrl)
    else onError(result.message)
    onClose()
  }

  return (
    <Dialog label={copy.photo.frameTitle} onClose={onClose} className="max-w-sm" align="center">
      <div className="flex items-start justify-between gap-4 border-b border-border p-5">
        <div>
          <h2 className="text-base font-semibold">{copy.photo.frameTitle}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{copy.photo.frameHint}</p>
        </div>
        <Button variant="ghost" size="icon" aria-label="Cerrar" onClick={onClose}>
          <X />
        </Button>
      </div>

      <div className="flex flex-col items-center gap-4 p-5">
        <div
          className="relative overflow-hidden rounded-full bg-muted"
          style={{ width: VIEW, height: VIEW, cursor: dragging.current ? 'grabbing' : 'grab' }}
          onPointerDown={(e) => {
            dragging.current = { x: e.clientX - offset.x, y: e.clientY - offset.y }
            e.currentTarget.setPointerCapture(e.pointerId)
          }}
          onPointerMove={(e) => {
            if (!dragging.current) return
            setOffset(
              clamp({ x: e.clientX - dragging.current.x, y: e.clientY - dragging.current.y }),
            )
          }}
          onPointerUp={() => {
            dragging.current = null
          }}
        >
          {src ? (
            <img
              src={src}
              alt=""
              draggable={false}
              onLoad={(e) =>
                setNatural({
                  w: e.currentTarget.naturalWidth,
                  h: e.currentTarget.naturalHeight,
                })
              }
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                transformOrigin: 'center',
                maxWidth: 'none',
              }}
            />
          ) : null}
        </div>

        <label className="flex w-full items-center gap-3">
          <ZoomIn size={16} className="shrink-0 text-muted-foreground" />
          <span className="sr-only">{copy.photo.zoom}</span>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full"
          />
        </label>

        <Notice>{copy.photo.frameNote}</Notice>

        <div className="flex w-full gap-2">
          <Button variant="primary" className="flex-1" disabled={!natural || busy} onClick={() => void confirm()}>
            {busy ? copy.photo.saving : copy.photo.use}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
