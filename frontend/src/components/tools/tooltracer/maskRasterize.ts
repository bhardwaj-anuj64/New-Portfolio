import type { ContourOut } from '../../../types'

export interface ToolContourGroup {
  islandId: number
  outer: ContourOut
  holes: ContourOut[]
}

/** Groups a flat /segment/finalize contour list by top-level (outer) island id. Ids are stable
 * across /segment/islands and /segment/finalize calls on the same mask/params (same underlying
 * cv2.findContours indexing), so islandId here matches the id used for the island review step. */
export function groupContoursByTool(contours: ContourOut[], includedIds: number[]): ToolContourGroup[] {
  const includedSet = new Set(includedIds)
  const outers = contours.filter((c) => !c.is_hole && includedSet.has(c.id))
  return outers.map((outer) => ({
    islandId: outer.id,
    outer,
    holes: contours.filter((c) => c.is_hole && c.parent_id === outer.id),
  }))
}

// segmentation.py's extract_contours stores points_mm as (px_x / px_per_mm, -px_y / px_per_mm) —
// invert that back to pixel space.
function toPixelPath(pointsMm: [number, number][], pxPerMm: number): [number, number][] {
  return pointsMm.map(([mmX, mmY]) => [mmX * pxPerMm, -mmY * pxPerMm])
}

function addSubpath(path: Path2D, points: [number, number][]) {
  if (points.length === 0) return
  path.moveTo(points[0][0], points[0][1])
  for (let i = 1; i < points.length; i++) path.lineTo(points[i][0], points[i][1])
  path.closePath()
}

/**
 * Rasterizes one tool's outer contour (with its holes cut out) into a full-size binary mask PNG,
 * matching the pixel dimensions of the rectified image /mesh/from_pockets expects all tool masks
 * to share. Returns raw base64 (no data: prefix).
 */
export function rasterizeToolMask(group: ToolContourGroup, pxPerMm: number, widthPx: number, heightPx: number): string {
  const canvas = document.createElement('canvas')
  canvas.width = widthPx
  canvas.height = heightPx
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')

  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, widthPx, heightPx)

  const path = new Path2D()
  addSubpath(path, toPixelPath(group.outer.points_mm, pxPerMm))
  for (const hole of group.holes) addSubpath(path, toPixelPath(hole.points_mm, pxPerMm))

  ctx.fillStyle = '#fff'
  ctx.fill(path, 'evenodd')

  return canvas.toDataURL('image/png').split(',')[1]
}
