"""
Mesh Generator's geometry builder.

Consumes a depth map from the Tonal-Banding/Depth Service (photo -> adaptive
bands -> per-pixel depth in mm) and turns it into an actual PRINTABLE SOLID
mesh: front relief surface + flat back plate + side walls stitching them
together into one watertight manifold. A bare heightfield surface (just the
front) is NOT by itself something a slicer can print — it has zero
thickness at every point and isn't closed. This module is what makes it
actually printable.

Two-step pipeline:
  1. downsample_depth_map()  -- a photo has way more pixels than any sane
     mesh needs (2M+ px -> millions of triangles otherwise); downsamples to
     a target mesh resolution. Uses NEAREST interpolation deliberately, not
     smooth interpolation -- the whole point of tonal banding is sharp,
     posterized depth steps, and smooth interpolation would blur band edges
     into unwanted intermediate depths that were never in band_depths_mm.
  2. build_heightfield_solid() -- grid of quads (front surface, two
     triangles each) + matching flat back plate + side wall quads around
     the full perimeter loop, all stitched into one index buffer.

write_binary_stl() has no external dependencies (numpy-stl / trimesh are
not available in this environment) -- writes the standard binary STL format
directly, into an in-memory buffer (not a shared file path -- concurrent
requests must not race on the same temp file).
"""

import io
import struct
from dataclasses import dataclass

import cv2
import numpy as np


@dataclass
class Mesh:
    vertices: np.ndarray  # (N, 3) float32, mm
    faces: np.ndarray     # (M, 3) int32, indices into vertices


def downsample_depth_map(depth_map_mm: np.ndarray, max_mesh_dim: int = 250) -> np.ndarray:
    """
    Reduce a photo-resolution depth map to a sane mesh resolution.

    NEAREST interpolation is deliberate: the tonal-banding service produces
    discrete depth steps (one value per band, e.g. [0.8, 1.4, 2.0, 2.6, 3.2]).
    Smooth downsampling (INTER_AREA/LINEAR) would average adjacent band
    values at every boundary, introducing depths that don't correspond to
    any band and blurring the sharp posterized look that's the actual design
    goal here.
    """
    h, w = depth_map_mm.shape[:2]
    if max(h, w) <= max_mesh_dim:
        return depth_map_mm
    scale = max_mesh_dim / max(h, w)
    new_size = (max(1, int(round(w * scale))), max(1, int(round(h * scale))))
    return cv2.resize(depth_map_mm, new_size, interpolation=cv2.INTER_NEAREST)


def build_heightfield_solid(depth_map_mm: np.ndarray, px_per_mm: float) -> Mesh:
    """
    Build a watertight solid mesh from a depth map: front relief surface +
    flat back plate (z=0) + side walls around the full perimeter.

    Vertex layout: front vertices are grid-ordered (row-major), back
    vertices mirror the same grid at the same (x,y) with z=0. Index arrays
    for front/back are built directly from the grid shape rather than
    inferred later, which keeps the side-wall stitching simple and correct.
    """
    rows, cols = depth_map_mm.shape[:2]
    if rows < 2 or cols < 2:
        raise ValueError("depth map must be at least 2x2 to build a mesh")

    xs = np.arange(cols, dtype=np.float32) / px_per_mm
    ys = (rows - 1 - np.arange(rows, dtype=np.float32)) / px_per_mm  # flip Y: row 0 = back of image = max Y

    grid_x, grid_y = np.meshgrid(xs, ys)  # each (rows, cols)

    front_z = depth_map_mm.astype(np.float32)
    front_verts = np.stack([grid_x, grid_y, front_z], axis=-1).reshape(-1, 3)
    back_verts = np.stack([grid_x, grid_y, np.zeros_like(front_z)], axis=-1).reshape(-1, 3)

    n_grid = rows * cols
    vertices = np.concatenate([front_verts, back_verts], axis=0)

    def front_idx(r, c):
        return r * cols + c

    def back_idx(r, c):
        return n_grid + r * cols + c

    faces = []

    # Front surface: two triangles per quad, CCW winding when viewed from +Z
    for r in range(rows - 1):
        for c in range(cols - 1):
            a, b = front_idx(r, c), front_idx(r, c + 1)
            d, e = front_idx(r + 1, c), front_idx(r + 1, c + 1)
            faces.append((a, d, b))
            faces.append((b, d, e))

    # Back plate: same grid, reversed winding so normals point -Z (outward)
    for r in range(rows - 1):
        for c in range(cols - 1):
            a, b = back_idx(r, c), back_idx(r, c + 1)
            d, e = back_idx(r + 1, c), back_idx(r + 1, c + 1)
            faces.append((a, b, d))
            faces.append((b, e, d))

    # Side walls: stitch front perimeter to back perimeter, all 4 edges
    def add_wall(front_a, front_b, back_a, back_b):
        faces.append((front_a, back_a, front_b))
        faces.append((front_b, back_a, back_b))

    for c in range(cols - 1):  # top edge (r=0)
        add_wall(front_idx(0, c), front_idx(0, c + 1), back_idx(0, c), back_idx(0, c + 1))
    for c in range(cols - 1):  # bottom edge (r=rows-1)
        r = rows - 1
        add_wall(front_idx(r, c + 1), front_idx(r, c), back_idx(r, c + 1), back_idx(r, c))
    for r in range(rows - 1):  # left edge (c=0)
        add_wall(front_idx(r + 1, 0), front_idx(r, 0), back_idx(r + 1, 0), back_idx(r, 0))
    for r in range(rows - 1):  # right edge (c=cols-1)
        c = cols - 1
        add_wall(front_idx(r, c), front_idx(r + 1, c), back_idx(r, c), back_idx(r + 1, c))

    return Mesh(vertices=vertices.astype(np.float32), faces=np.array(faces, dtype=np.int32))


def check_manifold(mesh: Mesh) -> dict:
    """
    Sanity check: in a watertight manifold mesh, every EDGE must be shared
    by exactly 2 triangles. This is the actual definition of "closed solid"
    that a slicer / 3D-print pipeline requires — not just "looks right".
    Returns counts; non_manifold_edges should be 0 for a printable mesh.
    """
    from collections import Counter

    edge_counts = Counter()
    for tri in mesh.faces:
        for i in range(3):
            a, b = int(tri[i]), int(tri[(i + 1) % 3])
            edge = (a, b) if a < b else (b, a)
            edge_counts[edge] += 1

    non_manifold = sum(1 for count in edge_counts.values() if count != 2)
    return {
        "total_edges": len(edge_counts),
        "non_manifold_edges": non_manifold,
        "is_watertight": non_manifold == 0,
    }


def write_binary_stl(mesh: Mesh, name: bytes = b"mesh") -> bytes:
    """
    Minimal binary STL writer (no external mesh library available in this
    environment). Binary STL format: 80-byte header, uint32 triangle count,
    then per triangle: 3x float32 normal + 3x (3x float32 vertex) + uint16
    attribute byte count (0).

    Returns the bytes directly rather than writing to a path -- this is a
    stateless service handling concurrent requests, and every caller needs
    its own mesh, not whatever the last request happened to write to disk.
    """
    verts = mesh.vertices
    faces = mesh.faces

    tri_verts = verts[faces]  # (M, 3, 3)
    v0, v1, v2 = tri_verts[:, 0], tri_verts[:, 1], tri_verts[:, 2]
    normals = np.cross(v1 - v0, v2 - v0)
    norm_len = np.linalg.norm(normals, axis=1, keepdims=True)
    norm_len[norm_len == 0] = 1.0
    normals = normals / norm_len

    buf = io.BytesIO()
    buf.write(name[:80].ljust(80, b"\0"))
    buf.write(struct.pack("<I", len(faces)))
    for i in range(len(faces)):
        buf.write(struct.pack("<3f", *normals[i]))
        buf.write(struct.pack("<3f", *v0[i]))
        buf.write(struct.pack("<3f", *v1[i]))
        buf.write(struct.pack("<3f", *v2[i]))
        buf.write(struct.pack("<H", 0))
    return buf.getvalue()


def build_pocket_depth_map(
    island_masks: list,
    pocket_depths_mm: list,
    block_thickness_mm: float,
) -> np.ndarray:
    """
    Builds a depth map for the Tool Tracer holder/organizer case — same
    geometry builder as the lithophane, different semantics: instead of
    "thickness of light-blocking material," z here is literal top-surface
    height. Base block top sits at block_thickness_mm everywhere; each
    tool's footprint (from its segmentation mask) is recessed down by its
    own pocket depth. This is deliberately a 2-level-per-tool depth map
    (not continuous like tonal banding) — build_heightfield_solid() doesn't
    care, it builds a valid watertight solid either way.

    island_masks: one binary mask per tool (already rasterized at the
    target resolution — apply any clearance/buffer padding, via the
    Segmentation service's pad_mm, BEFORE calling this).
    pocket_depths_mm: one depth per tool, same order as island_masks.
    """
    if len(island_masks) != len(pocket_depths_mm):
        raise ValueError("island_masks and pocket_depths_mm must be the same length")
    if not island_masks:
        raise ValueError("need at least one island")

    shape = island_masks[0].shape[:2]
    depth_map = np.full(shape, block_thickness_mm, dtype=np.float32)
    for mask, pocket_depth in zip(island_masks, pocket_depths_mm):
        if pocket_depth >= block_thickness_mm:
            raise ValueError(
                f"pocket depth {pocket_depth}mm must be less than block thickness {block_thickness_mm}mm"
            )
        depth_map[mask > 0] = block_thickness_mm - pocket_depth
    return depth_map
