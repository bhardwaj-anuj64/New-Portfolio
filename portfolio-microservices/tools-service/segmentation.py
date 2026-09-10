"""
Core segmentation + contour extraction logic for the Segmentation & Outline
Service. Shared by the Keychain tool and the Tool Tracer.

Two segmentation strategies, one shared post-processing pipeline:

  magic_wand_mask()  -> good for plain/controlled backgrounds (tool tracer's
                         original approach: click background seeds, flood-fill
                         with a tolerance)
  grabcut_mask()      -> good for busier backgrounds (keychain photos of
                         pets/subjects where background isn't flat)

Both produce a binary foreground mask (uint8, 255 = foreground). That mask
is then run through the SAME contour extraction pipeline, which:
  - preserves holes (RETR_CCOMP, not RETR_EXTERNAL)
  - filters noise by area
  - simplifies edges (approxPolyDP)
  - converts pixel coordinates to real-world mm using a caller-supplied scale

Nothing here does file export (DXF/SVG/STL) — that's the separate Export
service. This module's job ends at "here are the polygons, in mm, with
hole/outer relationships."
"""

from dataclasses import dataclass, field
from typing import Literal

import cv2
import numpy as np


# ---------------------------------------------------------------------------
# Segmentation strategies
# ---------------------------------------------------------------------------

def magic_wand_mask(
    img: np.ndarray,
    seeds: list[tuple[int, int]],
    tolerance: int,
) -> np.ndarray:
    """
    Flood-fill from one or more background seed points, tolerance-based.
    Returns a mask where 255 = FOREGROUND (i.e. NOT the flood-filled region).

    This is a direct port of the tool tracer's Phase 2 logic, minus the
    interactive cv2.imshow loop — the frontend now owns the click/slider UI
    and calls this once per adjustment.
    """
    h, w = img.shape[:2]
    flood_mask = np.zeros((h + 2, w + 2), np.uint8)
    work = img.copy()

    for seed in seeds:
        cv2.floodFill(
            work,
            flood_mask,
            seed,
            (255, 255, 255),
            (tolerance,) * 3,
            (tolerance,) * 3,
            # FIXED_RANGE: compare every pixel to the ORIGINAL seed color, not
            # to its already-filled neighbor (the default). Floating range
            # lets the fill walk through soft/anti-aliased edges one small
            # step at a time and leak into the foreground on any photo with
            # blur, compression artifacts, or shadow gradients at the edge.
            cv2.FLOODFILL_MASK_ONLY | (255 << 8) | cv2.FLOODFILL_FIXED_RANGE,
        )

    background_mask = flood_mask[1:-1, 1:-1]
    foreground_mask = cv2.bitwise_not(background_mask)

    kernel = np.ones((5, 5), np.uint8)
    foreground_mask = cv2.morphologyEx(foreground_mask, cv2.MORPH_OPEN, kernel)
    return foreground_mask


def _fill_interior_holes(mask: np.ndarray) -> np.ndarray:
    """
    Fill every interior hole in a foreground mask. GrabCut classifies by
    color/texture statistics, not semantics — a dark eye on an organic photo
    subject can statistically resemble a dark background and get punched out
    as a 'hole', the same way real noise specks do. For photographic subjects
    (pets, faces) there's essentially never a genuine hole to preserve, unlike
    manufactured parts (screw holes, wrench eyelets), so this fills all of
    them rather than trying to guess which ones are 'real'.
    """
    h, w = mask.shape[:2]
    flood_fill_input = mask.copy()
    flood_mask = np.zeros((h + 2, w + 2), np.uint8)
    # Flood fill background from a corner (0,0) is background as long as the
    # subject doesn't touch the frame edge, which holds for centered photos.
    cv2.floodFill(flood_fill_input, flood_mask, (0, 0), 255)
    reached_from_outside = flood_fill_input
    holes = cv2.bitwise_not(reached_from_outside)
    return cv2.bitwise_or(mask, holes)


def grabcut_mask(
    img: np.ndarray,
    bbox: tuple[int, int, int, int],
    iterations: int = 5,
    fg_hints: list[tuple[int, int]] | None = None,
    bg_hints: list[tuple[int, int]] | None = None,
) -> np.ndarray:
    """
    GrabCut-based foreground extraction. bbox = (x, y, w, h) drawn by the
    user around the subject. Optional fg_hints/bg_hints let the user scribble
    corrections (definite foreground / definite background points) for a
    second refinement pass — useful for tricky edges like fur.

    Returns a mask where 255 = FOREGROUND.
    """
    mask = np.zeros(img.shape[:2], np.uint8)
    bgd_model = np.zeros((1, 65), np.float64)
    fgd_model = np.zeros((1, 65), np.float64)

    cv2.grabCut(img, mask, bbox, bgd_model, fgd_model, iterations, cv2.GC_INIT_WITH_RECT)

    if fg_hints or bg_hints:
        for pt in fg_hints or []:
            cv2.circle(mask, pt, 8, cv2.GC_FGD, -1)
        for pt in bg_hints or []:
            cv2.circle(mask, pt, 8, cv2.GC_BGD, -1)
        cv2.grabCut(img, mask, None, bgd_model, fgd_model, 2, cv2.GC_INIT_WITH_MASK)

    foreground_mask = np.where(
        (mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0
    ).astype(np.uint8)

    kernel = np.ones((3, 3), np.uint8)
    foreground_mask = cv2.morphologyEx(foreground_mask, cv2.MORPH_OPEN, kernel)
    foreground_mask = _fill_interior_holes(foreground_mask)
    return foreground_mask


# ---------------------------------------------------------------------------
# Perspective rectification
# ---------------------------------------------------------------------------

def rectify_perspective(
    img: np.ndarray,
    corners: list[tuple[int, int]],
    width_mm: float,
    height_mm: float,
    target_px_per_mm: float = 10.0,
) -> tuple[np.ndarray, float]:
    """
    corners: four points clicked in the photo, IN ORDER (top-left, top-right,
    bottom-right, bottom-left), marking a reference rectangle of known
    real-world size (e.g. the sheet of paper the tools are laid on).

    A single global px_per_mm from two points only holds if the paper is
    perfectly fronto-parallel to the camera. Any real handheld photo has some
    tilt, so scale actually drifts across the frame — objects near the far
    edge of the paper come out the wrong size. This warps the photo so the
    reference rectangle becomes an exact axis-aligned rectangle first, which
    makes px_per_mm genuinely uniform across the whole rectified image.

    Returns (rectified_img, px_per_mm) — do segmentation/contour extraction
    on the RECTIFIED image, not the original.
    """
    if len(corners) != 4:
        raise ValueError("corners must have exactly 4 points: TL, TR, BR, BL")

    out_w = int(round(width_mm * target_px_per_mm))
    out_h = int(round(height_mm * target_px_per_mm))

    src = np.array(corners, dtype=np.float32)
    dst = np.array(
        [[0, 0], [out_w - 1, 0], [out_w - 1, out_h - 1], [0, out_h - 1]],
        dtype=np.float32,
    )
    matrix = cv2.getPerspectiveTransform(src, dst)
    rectified = cv2.warpPerspective(img, matrix, (out_w, out_h))
    return rectified, target_px_per_mm


# ---------------------------------------------------------------------------
# Shared contour pipeline (hole-preserving)
# ---------------------------------------------------------------------------

@dataclass
class Contour:
    id: int
    parent_id: int | None          # None = outer/top-level contour
    is_hole: bool
    points_mm: list[tuple[float, float]] = field(default_factory=list)
    area_mm2: float = 0.0


@dataclass
class Island:
    """A top-level (non-hole) blob — one candidate 'is this actually a tool,
    or noise?' unit for the user to include/exclude before finalizing."""
    id: int
    bbox_px: tuple[int, int, int, int]  # x, y, w, h
    area_mm2: float


def _smooth_mask(mask: np.ndarray) -> np.ndarray:
    """
    Reduce jagged/stair-stepped edges before contour extraction. A binary
    mask from flood-fill or GrabCut is pixel-exact and noisy at the boundary;
    a small close+open pass smooths that out without materially changing
    shape, giving approxPolyDP cleaner input to simplify.
    """
    kernel = np.ones((3, 3), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    return mask


def get_top_level_islands(
    mask: np.ndarray,
    px_per_mm: float,
    min_area_px: float = 200,
) -> list[Island]:
    """
    List only the top-level (outer) blobs — i.e. candidate individual tools —
    for a selection UI, restoring the tool tracer's original 'click to
    include/exclude' step that got dropped when this became a stateless
    service. Same RETR_CCOMP call/mask as extract_contours, so ids line up
    between a call to this and a subsequent extract_contours/finalize call
    on the same mask.
    """
    contours, hierarchy = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    if hierarchy is None:
        return []
    hierarchy = hierarchy[0]

    islands: list[Island] = []
    for idx, (cnt, h) in enumerate(zip(contours, hierarchy)):
        if h[3] != -1:
            continue  # has a parent -> it's a hole, not a top-level island
        area = cv2.contourArea(cnt)
        if area < min_area_px:
            continue
        x, y, w, ht = cv2.boundingRect(cnt)
        islands.append(Island(id=idx, bbox_px=(x, y, w, ht), area_mm2=area / (px_per_mm ** 2)))
    return islands


def extract_contours(
    mask: np.ndarray,
    px_per_mm: float,
    min_area_px: float = 200,
    simplify_eps_ratio: float = 0.0015,
    pad_mm: float = 0.0,
) -> list[Contour]:
    """
    Extract contours from a binary mask, PRESERVING HOLES via RETR_CCOMP.

    Padding is hole-aware: positive pad_mm grows outer contours (clearance /
    print fitment) and SHRINKS hole contours (so friction fit doesn't go
    loose) — dilating an outer boundary and eroding an inner one are both
    "add pad_mm of material," which is the physically correct behavior.
    """
    pad_px = int(round(pad_mm * px_per_mm))

    working_mask = _smooth_mask(mask.copy())
    if pad_px > 0:
        working_mask = _apply_hole_aware_padding(working_mask, pad_px)

    raw_contours, hierarchy = cv2.findContours(
        working_mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE
    )

    if hierarchy is None:
        return []
    hierarchy = hierarchy[0]  # cv2 wraps it in an extra dim

    results: list[Contour] = []
    for idx, (cnt, h) in enumerate(zip(raw_contours, hierarchy)):
        area = cv2.contourArea(cnt)
        if area < min_area_px:
            continue

        parent_idx = h[3]
        is_hole = parent_idx != -1  # has a parent -> it's a hole in RETR_CCOMP

        peri = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, simplify_eps_ratio * peri, True)

        points_mm = [
            (pt[0][0] / px_per_mm, -pt[0][1] / px_per_mm)  # invert Y for CAD convention
            for pt in approx
        ]

        results.append(
            Contour(
                id=idx,
                parent_id=parent_idx if parent_idx != -1 else None,
                is_hole=is_hole,
                points_mm=points_mm,
                area_mm2=area / (px_per_mm ** 2),
            )
        )

    return results


def _apply_hole_aware_padding(mask: np.ndarray, pad_px: int) -> np.ndarray:
    """
    Dilate outer boundaries, erode holes, by finding holes first (via a
    hierarchy pass) and padding each region in the correct direction.
    """
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (pad_px * 2 + 1, pad_px * 2 + 1))

    contours, hierarchy = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    if hierarchy is None:
        return cv2.dilate(mask, kernel)
    hierarchy = hierarchy[0]

    outer_layer = np.zeros_like(mask)
    hole_layer = np.zeros_like(mask)
    for cnt, h in zip(contours, hierarchy):
        target = hole_layer if h[3] != -1 else outer_layer
        cv2.drawContours(target, [cnt], -1, 255, -1)

    outer_grown = cv2.dilate(outer_layer, kernel)
    hole_shrunk = cv2.erode(hole_layer, kernel)

    # Final solid = grown outer region, minus the (now smaller) holes
    return cv2.bitwise_and(outer_grown, cv2.bitwise_not(hole_shrunk))


# ---------------------------------------------------------------------------
# Scale calibration
# ---------------------------------------------------------------------------

def px_per_mm_from_reference(
    point_a: tuple[int, int],
    point_b: tuple[int, int],
    known_distance_mm: float,
) -> float:
    """
    Same calibration approach as the tool tracer: user clicks two points a
    known real-world distance apart (e.g. the two top corners of an A4/Letter
    sheet), we derive pixels-per-mm from that.
    """
    pixel_dist = np.linalg.norm(np.array(point_a) - np.array(point_b))
    return pixel_dist / known_distance_mm


# ---------------------------------------------------------------------------
# Touching-object splitting
# ---------------------------------------------------------------------------

def split_touching_islands(
    mask: np.ndarray,
    min_separation_px: int = 25,
    peak_threshold_ratio: float = 0.3,
) -> np.ndarray:
    """
    Separates touching/overlapping foreground blobs (e.g. tools photographed
    too close together, so their outlines merge into one connected region)
    using a distance-transform + watershed split. Classical CV, no ML.

    How it works: for each foreground pixel, compute distance to the nearest
    background pixel (distanceTransform). Object CENTERS are local maxima of
    that distance map — even if two tools touch at their edges, their centers
    are still two separate peaks, generally far enough apart to be found as
    distinct local maxima. Each peak seeds one watershed region; watershed
    then grows each seed outward and draws a boundary at the touching point.

    This is NOT guaranteed to correctly split every touching case — objects
    that overlap heavily (not just touch at an edge) or have very similar
    thickness throughout can still confuse it. It's a genuine improvement
    over "one giant merged blob" for many practical cases, not a full fix.

    Returns a labeled mask (int32): each separated region gets a unique
    positive label, 0 = background/split boundary.
    """
    dist = cv2.distanceTransform(mask, cv2.DIST_L2, 5)
    if dist.max() == 0:
        return np.zeros(mask.shape, dtype=np.int32)

    kernel = np.ones((min_separation_px, min_separation_px), np.uint8)
    local_max = (dist == cv2.dilate(dist, kernel)) & (dist > peak_threshold_ratio * dist.max())

    # markers: 1 = known background, 0 = unknown (watershed fills this in),
    # 2..N = one unique label per detected peak (each a watershed seed).
    markers = np.zeros(mask.shape, dtype=np.int32)
    markers[mask == 0] = 1
    num_seed_components, seed_labels = cv2.connectedComponents(local_max.astype(np.uint8))
    for lbl in range(1, num_seed_components):  # 0 = not a seed, skip it
        markers[seed_labels == lbl] = lbl + 1

    color_img = cv2.cvtColor(mask, cv2.COLOR_GRAY2BGR)
    cv2.watershed(color_img, markers)

    markers[markers == -1] = 0  # watershed boundary pixels -> treat as background
    markers[markers == 1] = 0   # background label -> 0
    return markers
