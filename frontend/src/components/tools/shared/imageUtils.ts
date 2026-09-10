export function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = reject
    img.src = url
  })
}

export function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = dataUrl
  })
}

/** Downscales to maxDimension (long edge) and returns raw base64 (no data: prefix) + pixel dims. */
export function downscaleToBase64(
  img: HTMLImageElement,
  maxDimension: number,
): { base64: string; width: number; height: number } {
  const scale = Math.min(1, maxDimension / Math.max(img.naturalWidth, img.naturalHeight))
  const width = Math.max(1, Math.round(img.naturalWidth * scale))
  const height = Math.max(1, Math.round(img.naturalHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')
  ctx.drawImage(img, 0, 0, width, height)

  return { base64: canvas.toDataURL('image/png').split(',')[1], width, height }
}

export function base64ToDataUrl(base64: string): string {
  return `data:image/png;base64,${base64}`
}

/**
 * Maps a click on an element displaying an image at its rendered size back to pixel coordinates
 * in the image's native (natural) space — needed since the displayed size is CSS-scaled.
 */
export function clickToPixel(
  e: { clientX: number; clientY: number },
  target: HTMLElement,
  naturalWidth: number,
  naturalHeight: number,
): [number, number] {
  const rect = target.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * naturalWidth
  const y = ((e.clientY - rect.top) / rect.height) * naturalHeight
  return [Math.round(x), Math.round(y)]
}
