import type { ContourOut } from '../../../types'
import { mmContourToPixelPath, rasterizePolygons } from '../shared/polygonRasterize'

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

/**
 * Rasterizes one tool's outer contour (with its holes cut out) into a full-size binary mask PNG,
 * matching the pixel dimensions of the rectified image /mesh/from_pockets expects all tool masks
 * to share. Returns raw base64 (no data: prefix).
 */
export function rasterizeToolMask(group: ToolContourGroup, pxPerMm: number, widthPx: number, heightPx: number): string {
  const subpaths = [
    mmContourToPixelPath(group.outer.points_mm, pxPerMm),
    ...group.holes.map((hole) => mmContourToPixelPath(hole.points_mm, pxPerMm)),
  ]
  return rasterizePolygons(subpaths, widthPx, heightPx)
}
