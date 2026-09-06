/**
 * Handing a file to the user. Nothing here knows what a resume looks like, so
 * `domain` stays free of any dependency on `templates`.
 */

export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Revoking straight away cancels the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function downloadJson(data: unknown, name: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  downloadBlob(blob, name)
}
