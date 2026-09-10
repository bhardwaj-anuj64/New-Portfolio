"""
Segmentation & Outline routes.

Stateless by design: every request carries the image + the current
params (seeds / bbox / tolerance / calibration points). The frontend owns
interaction state (what the user has clicked so far); this service just
recomputes the mask/contours fresh each call, same as the original desktop
script did every frame.

Two endpoints matter for the interactive loop:
  POST /segment/preview   -> fast, returns a mask preview (base64 PNG) so the
                              frontend can show live feedback while the user
                              adjusts seeds/bbox/tolerance
  POST /segment/finalize  -> returns actual contour geometry (mm, with hole
                              hierarchy) once the user accepts the mask

Calibration is a separate small endpoint since both tools need it and it's
one-and-done per photo (unlike mask refinement, which happens many times).
"""

import base64

import cv2
import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from segmentation import (
    Contour,
    extract_contours,
    get_top_level_islands,
    grabcut_mask,
    magic_wand_mask,
    px_per_mm_from_reference,
    rectify_perspective,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# Shared request/response models
# ---------------------------------------------------------------------------

class CalibrationRequest(BaseModel):
    point_a: tuple[int, int]
    point_b: tuple[int, int]
    known_distance_mm: float


class CalibrationResponse(BaseModel):
    px_per_mm: float


class RectifyRequest(BaseModel):
    image_b64: str
    corners: list[tuple[int, int]]  # TL, TR, BR, BL, in that order
    width_mm: float
    height_mm: float
    target_px_per_mm: float = 10.0


class RectifyResponse(BaseModel):
    rectified_image_b64: str
    px_per_mm: float


class IslandsRequest(BaseModel):
    method: str
    image_b64: str
    px_per_mm: float
    seeds: list[tuple[int, int]] = []
    tolerance: int = 15
    bbox: tuple[int, int, int, int] | None = None
    fg_hints: list[tuple[int, int]] = []
    bg_hints: list[tuple[int, int]] = []
    min_area_px: float = 200


class IslandOut(BaseModel):
    id: int
    bbox_px: tuple[int, int, int, int]
    area_mm2: float
    thumbnail_png_b64: str


class IslandsResponse(BaseModel):
    islands: list[IslandOut]


class MagicWandParams(BaseModel):
    method: str = "magicwand"
    image_b64: str
    seeds: list[tuple[int, int]]
    tolerance: int = 15


class GrabCutParams(BaseModel):
    method: str = "grabcut"
    image_b64: str
    bbox: tuple[int, int, int, int]
    fg_hints: list[tuple[int, int]] = []
    bg_hints: list[tuple[int, int]] = []
    iterations: int = 5


class MaskPreviewResponse(BaseModel):
    mask_png_b64: str
    foreground_px: int


class FinalizeRequest(BaseModel):
    method: str
    image_b64: str
    px_per_mm: float
    pad_mm: float = 0.0
    min_area_px: float = 200
    simplify_eps_ratio: float = 0.0015
    # segmentation params, same shape as the preview call
    seeds: list[tuple[int, int]] = []
    tolerance: int = 15
    bbox: tuple[int, int, int, int] | None = None
    fg_hints: list[tuple[int, int]] = []
    bg_hints: list[tuple[int, int]] = []
    include_ids: list[int] | None = None  # from /segment/islands; None = keep all


class ContourOut(BaseModel):
    id: int
    parent_id: int | None
    is_hole: bool
    points_mm: list[tuple[float, float]]
    area_mm2: float


class FinalizeResponse(BaseModel):
    contours: list[ContourOut]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _decode_image(image_b64: str) -> np.ndarray:
    try:
        raw = base64.b64decode(image_b64)
        arr = np.frombuffer(raw, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    except Exception as exc:
        raise HTTPException(400, f"Could not decode image: {exc}")
    if img is None:
        raise HTTPException(400, "Could not decode image (unsupported format?)")
    return img


def _encode_mask_png(mask: np.ndarray) -> str:
    ok, buf = cv2.imencode(".png", mask)
    if not ok:
        raise HTTPException(500, "Failed to encode mask preview")
    return base64.b64encode(buf.tobytes()).decode("ascii")


def _run_segmentation(
    img: np.ndarray,
    method: str,
    seeds: list[tuple[int, int]],
    tolerance: int,
    bbox: tuple[int, int, int, int] | None,
    fg_hints: list[tuple[int, int]],
    bg_hints: list[tuple[int, int]],
    iterations: int = 5,
) -> np.ndarray:
    if method == "magicwand":
        if not seeds:
            raise HTTPException(400, "magicwand requires at least one seed point")
        return magic_wand_mask(img, seeds, tolerance)
    elif method == "grabcut":
        if bbox is None:
            raise HTTPException(400, "grabcut requires a bbox")
        return grabcut_mask(img, bbox, iterations, fg_hints or None, bg_hints or None)
    else:
        raise HTTPException(400, f"Unknown method: {method!r}")


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/calibrate", response_model=CalibrationResponse)
def calibrate(req: CalibrationRequest):
    px_per_mm = px_per_mm_from_reference(req.point_a, req.point_b, req.known_distance_mm)
    return CalibrationResponse(px_per_mm=px_per_mm)


@router.post("/segment/preview/magicwand", response_model=MaskPreviewResponse)
def preview_magicwand(params: MagicWandParams):
    img = _decode_image(params.image_b64)
    mask = magic_wand_mask(img, params.seeds, params.tolerance)
    return MaskPreviewResponse(
        mask_png_b64=_encode_mask_png(mask),
        foreground_px=int(np.count_nonzero(mask)),
    )


@router.post("/segment/preview/grabcut", response_model=MaskPreviewResponse)
def preview_grabcut(params: GrabCutParams):
    img = _decode_image(params.image_b64)
    mask = grabcut_mask(
        img, params.bbox, params.iterations,
        params.fg_hints or None, params.bg_hints or None,
    )
    return MaskPreviewResponse(
        mask_png_b64=_encode_mask_png(mask),
        foreground_px=int(np.count_nonzero(mask)),
    )


@router.post("/calibrate/rectify", response_model=RectifyResponse)
def calibrate_rectify(req: RectifyRequest):
    """
    Preferred calibration path: warps the photo so the reference rectangle
    (e.g. the paper) becomes fronto-parallel, so px_per_mm is uniform across
    the whole image rather than only accurate near the two calibration
    points. Run segmentation/finalize on the RETURNED rectified image.
    """
    img = _decode_image(req.image_b64)
    rectified, px_per_mm = rectify_perspective(
        img, req.corners, req.width_mm, req.height_mm, req.target_px_per_mm
    )
    ok, buf = cv2.imencode(".png", rectified)
    if not ok:
        raise HTTPException(500, "Failed to encode rectified image")
    return RectifyResponse(
        rectified_image_b64=base64.b64encode(buf.tobytes()).decode("ascii"),
        px_per_mm=px_per_mm,
    )


@router.post("/segment/islands", response_model=IslandsResponse)
def islands(req: IslandsRequest):
    """
    Lists top-level blobs only (no holes) with a cropped thumbnail each, so
    the frontend can show a grid the user taps to include/exclude — e.g.
    dust specks or shadow fragments that cleared the area filter but aren't
    actually a tool. Pass the chosen ids as include_ids to /segment/finalize.
    """
    img = _decode_image(req.image_b64)
    mask = _run_segmentation(
        img, req.method, req.seeds, req.tolerance, req.bbox,
        req.fg_hints, req.bg_hints,
    )
    found = get_top_level_islands(mask, req.px_per_mm, req.min_area_px)

    out = []
    for isl in found:
        x, y, w, h = isl.bbox_px
        crop = mask[y : y + h, x : x + w]
        ok, buf = cv2.imencode(".png", crop)
        if not ok:
            continue
        out.append(
            IslandOut(
                id=isl.id,
                bbox_px=isl.bbox_px,
                area_mm2=isl.area_mm2,
                thumbnail_png_b64=base64.b64encode(buf.tobytes()).decode("ascii"),
            )
        )
    return IslandsResponse(islands=out)


@router.post("/segment/finalize", response_model=FinalizeResponse)
def finalize(req: FinalizeRequest):
    img = _decode_image(req.image_b64)
    mask = _run_segmentation(
        img, req.method, req.seeds, req.tolerance, req.bbox,
        req.fg_hints, req.bg_hints,
    )
    contours = extract_contours(
        mask,
        px_per_mm=req.px_per_mm,
        min_area_px=req.min_area_px,
        simplify_eps_ratio=req.simplify_eps_ratio,
        pad_mm=req.pad_mm,
    )

    if req.include_ids is not None:
        keep_top_level = set(req.include_ids)
        contours = [
            c for c in contours
            if c.id in keep_top_level or c.parent_id in keep_top_level
        ]

    return FinalizeResponse(
        contours=[
            ContourOut(
                id=c.id, parent_id=c.parent_id, is_hole=c.is_hole,
                points_mm=c.points_mm, area_mm2=c.area_mm2,
            )
            for c in contours
        ]
    )
