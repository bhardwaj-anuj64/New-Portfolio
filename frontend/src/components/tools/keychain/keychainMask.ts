import type { ContourOut } from '../../../types'
import { mmContourToPixelPath, rasterizePolygons } from '../shared/polygonRasterize'

/**
 * Rasterizes the subject's silhouette contours (grabcut auto-fills holes server-side, so these
 * are always top-level outlines, no separate hole handling needed) into a full-size binary mask.
 * Unpadded — the raised rim, hanger bar, and hook holes are built server-side from this, see
 * mesh_builder.build_holder_mask_and_depth.
 */
export function rasterizeSubjectMask(
  contours: ContourOut[],
  pxPerMm: number,
  widthPx: number,
  heightPx: number,
): string {
  const subpaths = contours.map((c) => mmContourToPixelPath(c.points_mm, pxPerMm))
  return rasterizePolygons(subpaths, widthPx, heightPx)
}
