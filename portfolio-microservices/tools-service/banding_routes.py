"""
Tonal-Banding / Depth routes.

Stateless, same pattern as the Segmentation routes: every request carries
the image + current params, no server-side session state.

  POST /band/preview   -> fast, returns a color-coded band map + a shaded
                           relief preview (both base64 PNG) so the frontend
                           can show live feedback while the user drags the
                           band-count slider / adjusts the depth curve
  POST /band/finalize   -> returns the actual depth data (16-bit PNG, mm
                           encoded as 0.01mm/unit) + band metadata, for the
                           downstream Mesh Generator to consume
"""

import base64

import cv2
import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from tonal_banding import generate_banding, render_shaded_preview

router = APIRouter()


class BandingParams(BaseModel):
    image_b64: str
    num_bands: int = 4
    min_depth_mm: float = 0.8
    max_depth_mm: float = 3.2
    invert: bool = True
    curve: list[float] | None = None   # len == num_bands, each in [0,1], dark->light order
    smooth_before_banding: int = 3


class PreviewResponse(BaseModel):
    band_map_png_b64: str
    shaded_preview_png_b64: str
    band_thresholds: list[float]
    band_depths_mm: list[float]


class FinalizeResponse(BaseModel):
    depth_map_png_b64: str   # 16-bit grayscale PNG, value = depth_mm * 100
    depth_scale: float       # divide pixel value by this to recover mm (100.0)
    band_thresholds: list[float]
    band_depths_mm: list[float]
    width: int
    height: int


_PREVIEW_COLORS = np.array(
    [[40, 40, 180], [60, 140, 220], [80, 200, 200], [200, 200, 80], [230, 230, 230],
     [120, 60, 160], [60, 180, 100]],
    dtype=np.uint8,
)


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


def _encode_png(img: np.ndarray) -> str:
    ok, buf = cv2.imencode(".png", img)
    if not ok:
        raise HTTPException(500, "Failed to encode image")
    return base64.b64encode(buf.tobytes()).decode("ascii")


def _run_banding(params: BandingParams):
    img = _decode_image(params.image_b64)
    if params.curve is not None and len(params.curve) != params.num_bands:
        raise HTTPException(400, f"curve must have exactly num_bands ({params.num_bands}) values")
    return img, generate_banding(
        img,
        num_bands=params.num_bands,
        min_depth_mm=params.min_depth_mm,
        max_depth_mm=params.max_depth_mm,
        invert=params.invert,
        curve=params.curve,
        smooth_before_banding=params.smooth_before_banding,
    )


@router.post("/band/preview", response_model=PreviewResponse)
def preview(params: BandingParams):
    _, result = _run_banding(params)

    band_map = _PREVIEW_COLORS[result.band_index_map % len(_PREVIEW_COLORS)]
    shaded = render_shaded_preview(result.depth_map_mm)

    return PreviewResponse(
        band_map_png_b64=_encode_png(band_map),
        shaded_preview_png_b64=_encode_png(shaded),
        band_thresholds=result.band_thresholds,
        band_depths_mm=result.band_depths_mm,
    )


@router.post("/band/finalize", response_model=FinalizeResponse)
def finalize(params: BandingParams):
    _, result = _run_banding(params)

    depth_scale = 100.0  # store depth as hundredths of a mm in a 16-bit PNG
    depth_16u = np.clip(result.depth_map_mm * depth_scale, 0, 65535).astype(np.uint16)

    return FinalizeResponse(
        depth_map_png_b64=_encode_png(depth_16u),
        depth_scale=depth_scale,
        band_thresholds=result.band_thresholds,
        band_depths_mm=result.band_depths_mm,
        width=depth_16u.shape[1],
        height=depth_16u.shape[0],
    )
