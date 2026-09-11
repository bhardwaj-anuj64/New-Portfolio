"""
Self-check for the get_top_level_islands / extract_contours id-consistency contract.

Regression test for a real bug: extract_contours (used by /segment/finalize) used to
smooth+pad the mask before numbering blobs, while get_top_level_islands (used by
/segment/islands) numbered the raw mask — so an island id picked in the review step could
silently point at a different, or no, blob by the time finalize ran. Both must now assign
ids from the identical (smoothed, unpadded) pass, with padding applied per-contour afterward.

Plain asserts, no framework — run directly: python test_segmentation.py
"""

import numpy as np

from segmentation import extract_contours, get_top_level_islands


def _mask_with_two_close_blobs_and_noise() -> np.ndarray:
    # Two blobs 6px apart (closer than a naive whole-mask pad could tolerate) plus a
    # sub-threshold noise speck — the exact shape that used to desync ids after padding.
    mask = np.zeros((200, 300), dtype=np.uint8)
    mask[50:150, 20:80] = 255
    mask[50:150, 86:146] = 255
    mask[10:12, 10:12] = 255  # noise speck, area 4px < min_area_px
    return mask


def demo() -> None:
    mask = _mask_with_two_close_blobs_and_noise()
    px_per_mm = 5.0

    islands = get_top_level_islands(mask, px_per_mm, min_area_px=200)
    assert len(islands) == 2, f"expected 2 real islands, got {len(islands)}"
    island_ids = {isl.id for isl in islands}

    for pad_mm in (0.0, 0.5, 2.0):
        contours = extract_contours(mask, px_per_mm=px_per_mm, min_area_px=200, pad_mm=pad_mm)
        outer_ids = {c.id for c in contours if not c.is_hole}
        assert island_ids <= outer_ids, (
            f"pad_mm={pad_mm}: island ids {island_ids} not a subset of finalize's "
            f"outer ids {outer_ids} — padding desynced the ids"
        )

    # Padding should grow each blob's own area without merging it into its 6px-away
    # neighbor or shifting which id is which.
    unpadded = {c.id: c.area_mm2 for c in extract_contours(mask, px_per_mm, pad_mm=0.0) if not c.is_hole}
    padded = {c.id: c.area_mm2 for c in extract_contours(mask, px_per_mm, pad_mm=0.5) if not c.is_hole}
    for island_id in island_ids:
        assert padded[island_id] > unpadded[island_id], f"id={island_id} did not grow under padding"

    print("OK: island/finalize ids stay consistent across padding")


if __name__ == "__main__":
    demo()
