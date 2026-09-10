import type { ContourOut } from '../../../types'
import { circlePixelPath, mmContourToPixelPath, rasterizePolygons } from '../shared/polygonRasterize'

export interface KeyringHole {
  diameterMm: number
  insetMm: number
}

function contourBoundsMm(contours: ContourOut[]) {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const c of contours) {
    for (const [x, y] of c.points_mm) {
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  return { minX, maxX, minY, maxY }
}

/**
 * Rasterizes the border-padded silhouette contours (grabcut auto-fills holes server-side, so
 * these are always top-level outlines, no separate hole handling needed) into a full-size mask,
 * with an optional keyring hole auto-placed at top-center. mm Y increases upward (CAD
 * convention, see segmentation.py), so "top" is the max-Y edge.
 */
export function rasterizeKeychainMask(
  contours: ContourOut[],
  pxPerMm: number,
  widthPx: number,
  heightPx: number,
  hole: KeyringHole | null,
): string {
  const subpaths = contours.map((c) => mmContourToPixelPath(c.points_mm, pxPerMm))

  if (hole) {
    const { minX, maxX, maxY } = contourBoundsMm(contours)
    const centerMm: [number, number] = [(minX + maxX) / 2, maxY - hole.insetMm]
    const centerPx: [number, number] = [centerMm[0] * pxPerMm, -centerMm[1] * pxPerMm]
    subpaths.push(circlePixelPath(centerPx, (hole.diameterMm / 2) * pxPerMm))
  }

  return rasterizePolygons(subpaths, widthPx, heightPx)
}
