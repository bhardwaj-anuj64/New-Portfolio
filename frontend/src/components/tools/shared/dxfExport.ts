import type { ContourOut } from '../../../types'

// Minimal ENTITIES-only DXF (R12 group codes, POLYLINE/VERTEX/SEQEND rather than the newer
// LWPOLYLINE entity) — same compatibility approach as the old DxfTool.tsx: most CAD/CNC tools
// accept this without the optional HEADER/TABLES/BLOCKS sections.
function push(out: string[], code: number, value: string | number) {
  out.push(String(code), String(value))
}

function writeClosedPolyline(out: string[], points: [number, number][]) {
  push(out, 0, 'POLYLINE')
  push(out, 8, '0')
  push(out, 66, 1)
  push(out, 70, 1)
  for (const [x, y] of points) {
    push(out, 0, 'VERTEX')
    push(out, 8, '0')
    push(out, 10, x.toFixed(3))
    push(out, 20, y.toFixed(3))
  }
  push(out, 0, 'SEQEND')
}

/** Builds a DXF from mm-space contour polygons (outlines + holes) returned by /segment/finalize. */
export function buildDxfFromContours(contours: ContourOut[]): string {
  const out: string[] = []
  push(out, 0, 'SECTION')
  push(out, 2, 'ENTITIES')
  for (const contour of contours) {
    writeClosedPolyline(out, contour.points_mm)
  }
  push(out, 0, 'ENDSEC')
  push(out, 0, 'EOF')
  return out.join('\n')
}
