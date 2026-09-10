"""
Tonal-Banding / Depth Service.

Photo -> adaptive tonal bands -> depth-indexed region map.

Shared by:
  - Mesh Generator (turns the depth map into a full relief/lithophane
    heightfield mesh)
  - Keychain tool's light-box backing (same depth map, applied to the
    backing panel behind the outline-extracted silhouette)

Design differentiator vs. typical lithophane tools: band count, band
boundaries, and depth-per-band are all user-controllable (adjustable slider,
adaptive per-photo thresholds, adjustable depth curve) rather than fixed
toward one fine-grain photorealistic look.

This module produces depth data only — no mesh/STL geometry. Turning a
depth map into an actual 3D mesh is downstream (Mesh Generator geometry
builder, or the Keychain backing builder), same separation of concerns as
the Segmentation service producing contours without writing DXF/STL itself.
"""

from dataclasses import dataclass

import cv2
import numpy as np


@dataclass
class BandingResult:
    band_index_map: np.ndarray      # int32, each pixel -> band index (0 = darkest band)
    band_thresholds: list[float]    # adaptive grayscale boundaries used
    depth_map_mm: np.ndarray        # float32, per-pixel depth in mm
    band_depths_mm: list[float]     # depth assigned to each band index, indexed 0..num_bands-1


def compute_adaptive_band_boundaries(gray: np.ndarray, num_bands: int) -> list[float]:
    """
    Adaptive band boundaries via 1D k-means clustering on pixel luminance.

    This is the reason a low-contrast, mostly-midtone photo still gets
    usable separation — fixed even-percentage thresholds (e.g. splitting
    0-255 into equal slices) barely differentiate such a photo, since most
    pixels fall in one or two slices. k-means finds where the ACTUAL
    luminance values in this photo cluster, so bands track the photo's real
    tonal structure instead of an arbitrary fixed grid.
    """
    if num_bands < 2:
        return []

    pixels = gray.reshape(-1, 1).astype(np.float32)
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 50, 0.5)
    _, _, centers = cv2.kmeans(
        pixels, num_bands, None, criteria, attempts=5, flags=cv2.KMEANS_PP_CENTERS
    )
    centers = sorted(centers.flatten().tolist())
    boundaries = [(centers[i] + centers[i + 1]) / 2 for i in range(len(centers) - 1)]
    return boundaries


def assign_bands(gray: np.ndarray, boundaries: list[float]) -> np.ndarray:
    """Each pixel -> band index (0 = darkest band, increasing with brightness)."""
    band_index_map = np.zeros(gray.shape, dtype=np.int32)
    for b in boundaries:
        band_index_map += (gray > b).astype(np.int32)
    return band_index_map


def bands_to_depth(
    band_index_map: np.ndarray,
    num_bands: int,
    min_depth_mm: float = 0.8,
    max_depth_mm: float = 3.2,
    invert: bool = True,
    curve: list[float] | None = None,
) -> tuple[np.ndarray, list[float]]:
    """
    Map band index -> depth in mm.

    invert=True (default, standard lithophane convention): darker bands get
    MORE depth (thin = lets more light through when backlit = appears as a
    highlight; thick = blocks more light = appears dark).

    curve: optional list of num_bands values in [0,1], one per band ordered
    dark-to-light, controlling relative depth. If omitted, bands are spaced
    linearly between min/max. This is the adjustable "fuller curve control"
    — e.g. [0, 0.1, 0.15, 1.0] pushes highlights dramatically deeper/thinner
    than a straight line would, instead of even steps.
    """
    if curve is None:
        curve = [i / (num_bands - 1) for i in range(num_bands)] if num_bands > 1 else [0.0]
    elif len(curve) != num_bands:
        raise ValueError(f"curve must have exactly num_bands ({num_bands}) values")

    if invert:
        curve = list(reversed(curve))

    band_depths_mm = [min_depth_mm + c * (max_depth_mm - min_depth_mm) for c in curve]

    depth_map = np.zeros(band_index_map.shape, dtype=np.float32)
    for band_idx, depth in enumerate(band_depths_mm):
        depth_map[band_index_map == band_idx] = depth

    return depth_map, band_depths_mm


def generate_banding(
    img_bgr: np.ndarray,
    num_bands: int = 4,
    min_depth_mm: float = 0.8,
    max_depth_mm: float = 3.2,
    invert: bool = True,
    curve: list[float] | None = None,
    smooth_before_banding: int = 3,
) -> BandingResult:
    """
    Full pipeline: photo -> grayscale -> (optional pre-smooth) -> adaptive
    bands -> per-pixel depth map.

    smooth_before_banding: Gaussian blur kernel size applied to luminance
    BEFORE banding (not after) — reduces sensor noise/fine texture from
    creating spurious tiny band regions, without softening the sharp
    band-edge look that's the actual visual style being aimed for. Set to 0
    to disable.
    """
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    if smooth_before_banding > 0:
        k = smooth_before_banding | 1  # force odd kernel size
        gray = cv2.GaussianBlur(gray, (k, k), 0)

    boundaries = compute_adaptive_band_boundaries(gray, num_bands)
    band_index_map = assign_bands(gray, boundaries)
    depth_map, band_depths_mm = bands_to_depth(
        band_index_map, num_bands, min_depth_mm, max_depth_mm, invert, curve
    )

    return BandingResult(
        band_index_map=band_index_map,
        band_thresholds=boundaries,
        depth_map_mm=depth_map,
        band_depths_mm=band_depths_mm,
    )


def render_shaded_preview(depth_map_mm: np.ndarray, light_dir=(-0.5, -0.5, 1.0)) -> np.ndarray:
    """
    Quick relief-shaded grayscale preview of a depth map (fake normal-mapped
    lighting), so the banding result can be sanity-checked visually without
    a full 3D viewer / mesh export.
    """
    gy, gx = np.gradient(depth_map_mm.astype(np.float32))
    normal = np.dstack([-gx, -gy, np.ones_like(depth_map_mm)])
    norm = np.linalg.norm(normal, axis=2, keepdims=True)
    normal = normal / (norm + 1e-6)

    light = np.array(light_dir, dtype=np.float32)
    light = light / np.linalg.norm(light)

    shade = np.clip(normal @ light, 0, 1)
    return (shade * 255).astype(np.uint8)
