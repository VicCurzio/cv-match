/**
 * A phone photo is 2-8 MB. Stored as a data URL it grows by a third, and the
 * whole `localStorage` quota is about 5 MB -- so an uncompressed photo fills it,
 * the browser stops saving, and the app looks fine until the tab reloads and the
 * resume is gone. Compression here is not an optimisation, it is a requirement.
 *
 * 400x400 JPEG lands around 30 KB, which is plenty for printing at 25 mm.
 */

export const PHOTO_SIZE = 400
export const PHOTO_QUALITY = 0.85

export type PhotoResult =
  | { ok: true; dataUrl: string }
  | { ok: false; message: string }

export async function compressPhoto(
  file: File,
  crop?: { x: number; y: number; size: number },
): Promise<PhotoResult> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
    return { ok: false, message: 'Usá una imagen .jpg, .png o .webp.' }
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return { ok: false, message: 'No se pudo leer la imagen. Probá con otro archivo.' }
  }

  // Default crop: the largest centred square.
  const side = crop?.size ?? Math.min(bitmap.width, bitmap.height)
  const sx = crop?.x ?? (bitmap.width - side) / 2
  const sy = crop?.y ?? (bitmap.height - side) / 2

  const canvas = document.createElement('canvas')
  canvas.width = PHOTO_SIZE
  canvas.height = PHOTO_SIZE
  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close()
    return { ok: false, message: 'El navegador no pudo procesar la imagen.' }
  }

  // White behind the image: a transparent PNG would go black once flattened to JPEG.
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, PHOTO_SIZE, PHOTO_SIZE)
  context.drawImage(bitmap, sx, sy, side, side, 0, 0, PHOTO_SIZE, PHOTO_SIZE)
  bitmap.close()

  return { ok: true, dataUrl: canvas.toDataURL('image/jpeg', PHOTO_QUALITY) }
}
