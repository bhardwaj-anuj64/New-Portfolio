/**
 * Generic mm-polygon-to-mask-PNG rasterization, shared by Tool Tracer (per-tool pocket masks)
 * and Keychain Generator (silhouette + keyring-hole mask). Fills every subpath with the
 * `evenodd` rule in one pass, so any subpath after the first (a real hole, or a punched-in
 * keyring hole — geometrically the same thing to this function) cuts out of the ones before it.
 */

function addSubpath(path: Path2D, points: [number, number][]) {
  if (points.length === 0) return
  path.moveTo(points[0][0], points[0][1])
  for (let i = 1; i < points.length; i++) path.lineTo(points[i][0], points[i][1])
  path.closePath()
}

/** Rasterizes pixel-space subpaths into a full-size binary mask PNG. Returns raw base64 (no
 * data: prefix). The first subpath and every subsequent one are evenodd-combined — pass the
 * outer boundary first, holes after. */
export function rasterizePolygons(subpaths: [number, number][][], widthPx: number, heightPx: number): string {
  const canvas = document.createElement('canvas')
  canvas.width = widthPx
  canvas.height = heightPx
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')

  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, widthPx, heightPx)

  const path = new Path2D()
  for (const points of subpaths) addSubpath(path, points)

  ctx.fillStyle = '#fff'
  ctx.fill(path, 'evenodd')

  return canvas.toDataURL('image/png').split(',')[1]
}

// segmentation.py's extract_contours stores points_mm as (px_x / px_per_mm, -px_y / px_per_mm) —
// invert that back to pixel space.
export function mmContourToPixelPath(pointsMm: [number, number][], pxPerMm: number): [number, number][] {
  return pointsMm.map(([mmX, mmY]) => [mmX * pxPerMm, -mmY * pxPerMm])
}

export function circlePixelPath(centerPx: [number, number], radiusPx: number, segments = 24): [number, number][] {
  const points: [number, number][] = []
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2
    points.push([centerPx[0] + radiusPx * Math.cos(angle), centerPx[1] + radiusPx * Math.sin(angle)])
  }
  return points
}
