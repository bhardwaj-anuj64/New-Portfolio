"""
Mesh Generator routes.

Shared 2D-to-3D geometry/preview backend, consumed by BOTH frontend demos:
  - Keychain: /mesh/from_silhouette (the assembled piece — border-padded
    subject outline, extruded to its own silhouette rather than a
    rectangle, with an optional tonal-band relief interior and an optional
    keyring hole) and /mesh/from_depth_map (a plain rectangular lithophane
    tile, kept for standalone depth-map-to-mesh use)
  - Tool Tracer: /mesh/from_pockets (holder/organizer, per-tool recessed
    pockets from the Segmentation routes' island masks)

/mesh/from_depth_map and /mesh/from_pockets funnel into the same rectangular
geometry builder (build_heightfield_solid) — a depth map is a depth map,
whether it came from continuous tonal bands or discrete per-tool pocket
depths. /mesh/from_silhouette uses the masked variant
(build_masked_heightfield_solid) instead, since a Keychain piece needs to be
cut to the subject's outline, not a rectangular tile with an image embossed
on it.

Stateless, same pattern as the other routes.
"""

import base64

import cv2
import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from mesh_builder import (
    build_heightfield_solid,
    build_masked_heightfield_solid,
    build_pocket_depth_map,
    check_manifold,
    downsample_depth_map,
    write_binary_stl,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# /mesh/from_depth_map -- lithophane / Keychain light-box backing
# ---------------------------------------------------------------------------

class FromDepthMapParams(BaseModel):
    depth_map_png_b64: str   # 16-bit grayscale PNG from Tonal-Banding /band/finalize
    depth_scale: float       # from that same response (divide pixel value by this for mm)
    px_per_mm: float
    max_mesh_dim: int = 250  # downsample target; use a lower value (e.g. 100) for live preview


class MeshResponse(BaseModel):
    stl_b64: str
    vertex_count: int
    face_count: int
    is_watertight: bool
    non_manifold_edges: int


def _decode_depth_png(png_b64: str, depth_scale: float) -> np.ndarray:
    try:
        raw = base64.b64decode(png_b64)
        arr = np.frombuffer(raw, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_UNCHANGED)
    except Exception as exc:
        raise HTTPException(400, f"Could not decode depth map: {exc}")
    if img is None:
        raise HTTPException(400, "Could not decode depth map (unsupported format?)")
    return img.astype(np.float32) / depth_scale


def _mesh_to_response(mesh) -> MeshResponse:
    check = check_manifold(mesh)
    stl_bytes = write_binary_stl(mesh)
    return MeshResponse(
        stl_b64=base64.b64encode(stl_bytes).decode("ascii"),
        vertex_count=len(mesh.vertices),
        face_count=len(mesh.faces),
        is_watertight=check["is_watertight"],
        non_manifold_edges=check["non_manifold_edges"],
    )


@router.post("/mesh/from_depth_map", response_model=MeshResponse)
def from_depth_map(params: FromDepthMapParams):
    depth_map_mm = _decode_depth_png(params.depth_map_png_b64, params.depth_scale)
    small_depth = downsample_depth_map(depth_map_mm, params.max_mesh_dim)
    px_per_mm = small_depth.shape[0] / (depth_map_mm.shape[0] / params.px_per_mm)
    mesh = build_heightfield_solid(small_depth, px_per_mm)
    return _mesh_to_response(mesh)


# ---------------------------------------------------------------------------
# /mesh/from_pockets -- Tool Tracer holder / gridfinity-style organizer
# ---------------------------------------------------------------------------

class PocketToolParams(BaseModel):
    mask_png_b64: str    # single binary mask (from Segmentation /segment/finalize-derived raster)
    pocket_depth_mm: float


class FromPocketsParams(BaseModel):
    tools: list[PocketToolParams]
    block_thickness_mm: float = 6.0
    px_per_mm: float = 3.0
    max_mesh_dim: int = 250


def _decode_mask_png(png_b64: str) -> np.ndarray:
    try:
        raw = base64.b64decode(png_b64)
        arr = np.frombuffer(raw, dtype=np.uint8)
        mask = cv2.imdecode(arr, cv2.IMREAD_GRAYSCALE)
    except Exception as exc:
        raise HTTPException(400, f"Could not decode mask: {exc}")
    if mask is None:
        raise HTTPException(400, "Could not decode mask (unsupported format?)")
    return mask


@router.post("/mesh/from_pockets", response_model=MeshResponse)
def from_pockets(params: FromPocketsParams):
    if not params.tools:
        raise HTTPException(400, "need at least one tool")

    island_masks = [_decode_mask_png(t.mask_png_b64) for t in params.tools]
    pocket_depths = [t.pocket_depth_mm for t in params.tools]

    shapes = {m.shape for m in island_masks}
    if len(shapes) != 1:
        raise HTTPException(400, "all tool masks must be the same size (same source photo/raster)")

    depth_map = build_pocket_depth_map(island_masks, pocket_depths, params.block_thickness_mm)
    small_depth = downsample_depth_map(depth_map, params.max_mesh_dim)
    px_per_mm = small_depth.shape[0] / (depth_map.shape[0] / params.px_per_mm)
    mesh = build_heightfield_solid(small_depth, px_per_mm)
    return _mesh_to_response(mesh)


# ---------------------------------------------------------------------------
# /mesh/from_silhouette -- Keychain's assembled piece
# ---------------------------------------------------------------------------

class FromSilhouetteParams(BaseModel):
    mask_png_b64: str                      # border-padded subject silhouette; keyring hole (if
                                            # any) already punched into it, built client-side
    px_per_mm: float
    depth_map_png_b64: str | None = None   # from Tonal-Banding /band/finalize; omit for light-box off
    depth_scale: float | None = None       # required alongside depth_map_png_b64
    flat_thickness_mm: float = 4.0         # used instead of a depth map when light-box is off
    max_mesh_dim: int = 250


def _downsample_paired(mask: np.ndarray, depth_map_mm: np.ndarray, max_mesh_dim: int, px_per_mm: float):
    """Downsamples mask + depth map together (NEAREST, same reasoning as downsample_depth_map)
    so they stay pixel-aligned at the reduced resolution."""
    h, w = mask.shape[:2]
    if max(h, w) <= max_mesh_dim:
        return mask, depth_map_mm, px_per_mm
    scale = max_mesh_dim / max(h, w)
    new_size = (max(1, int(round(w * scale))), max(1, int(round(h * scale))))
    resized_mask = cv2.resize(mask, new_size, interpolation=cv2.INTER_NEAREST)
    resized_depth = cv2.resize(depth_map_mm, new_size, interpolation=cv2.INTER_NEAREST)
    return resized_mask, resized_depth, new_size[0] / (w / px_per_mm)


@router.post("/mesh/from_silhouette", response_model=MeshResponse)
def from_silhouette(params: FromSilhouetteParams):
    mask = _decode_mask_png(params.mask_png_b64)

    if params.depth_map_png_b64 is not None:
        if params.depth_scale is None:
            raise HTTPException(400, "depth_scale is required when depth_map_png_b64 is given")
        depth_map_mm = _decode_depth_png(params.depth_map_png_b64, params.depth_scale)
        if depth_map_mm.shape[:2] != mask.shape[:2]:
            raise HTTPException(400, "mask and depth map must be the same pixel size")
    else:
        depth_map_mm = np.full(mask.shape[:2], params.flat_thickness_mm, dtype=np.float32)

    small_mask, small_depth, px_per_mm = _downsample_paired(mask, depth_map_mm, params.max_mesh_dim, params.px_per_mm)
    mesh = build_masked_heightfield_solid(small_depth, small_mask, px_per_mm)
    return _mesh_to_response(mesh)
