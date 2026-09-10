# Backend Services — Endpoints & Implementation Notes

All three services are Python/FastAPI, stateless (every request carries the
image/data + current params — no server-side session state), OpenCV-based.
Each has its own `requirements.txt` and is meant to be its own container.

---

## 1. Segmentation & Outline Service

**Files:** `main.py`, `segmentation.py`

**Purpose:** photo → clean foreground outline(s), in real-world mm, with
holes handled correctly per use case.

**Two segmentation methods, one shared post-processing pipeline:**
- `magicwand` — flood-fill from user-clicked background seed points +
  tolerance. Good for controlled/plain backgrounds (Tool Tracer's paper
  background). Holes are REAL and preserved (a screw hole matters).
- `grabcut` — bounding-box-based foreground extraction. Good for busier
  backgrounds (Keychain photos of pets/subjects). Holes are auto-filled —
  GrabCut misclassifies dark features (eyes) as background on organic
  subjects; unlike a manufactured part, a photo subject essentially never
  has a genuine interior hole.

**Key endpoints:**
- `POST /calibrate/rectify` — 4-corner perspective correction. Warps the
  photo so a reference rectangle (e.g. the paper) becomes fronto-parallel,
  giving uniform mm-per-pixel across the whole image (a 2-point distance
  calibration alone drifts with any camera tilt). ALSO fixes background
  edge-noise from non-uniform surroundings (e.g. fabric behind the paper) —
  run this before segmentation, not just for scale.
- `POST /segment/preview/magicwand`, `POST /segment/preview/grabcut` —
  fast mask preview for live UI feedback while adjusting seeds/bbox/tolerance.
- `POST /segment/islands` — lists top-level (non-hole) blobs with
  thumbnails, for a "tap to include/exclude" UI step (restores a step the
  original desktop tool had that a naive rebuild dropped — see
  `04-testing-learnings.md`).
- `POST /segment/finalize` — full contour extraction: hole-preserving
  (`RETR_CCOMP`), hole-aware padding (outer grows, holes shrink — a real
  screw hole shouldn't get loose from print clearance padding), optional
  `include_ids` filter (from the islands step).

**Also includes** `split_touching_islands()` — distance-transform +
watershed splitting for genuinely touching objects (zero visible gap in
the photo). This is a LAST RESORT, not the primary fix for merged blobs —
see `04-testing-learnings.md` for why most apparent "touching object"
failures are actually a seeding bug, not a real touching-object case.

---

## 2. Tonal-Banding / Depth Service

**Files:** `main.py`, `tonal_banding.py`

**Purpose:** photo → adaptive posterized depth map. This is the
differentiator vs. typical online lithophane tools, which are fixed toward
one fine-grain photorealistic look — here, band count, band boundaries,
and the depth curve are all user-controllable.

**Core algorithm:**
- `compute_adaptive_band_boundaries()` — 1D k-means on pixel luminance,
  NOT fixed even-percentage thresholds. This is why a low-contrast,
  mostly-midtone photo still gets usable band separation.
- `bands_to_depth()` — band index → depth in mm. `invert=True` (default)
  is the standard lithophane convention: darker = thicker. Accepts an
  optional custom `curve` (list of values in [0,1], one per band) instead
  of even linear spacing, for the "push extremes further apart" control.

**Key endpoints:**
- `POST /band/preview` — color-coded band map + a fake-normal-mapped
  shaded relief preview (both PNG), for live UI feedback while dragging
  the band-count slider.
- `POST /band/finalize` — actual depth data as a 16-bit grayscale PNG
  (value = depth_mm × `depth_scale`, scale returned in the response;
  verified zero precision loss round-trip). This is what feeds Mesh
  Generator's `/mesh/from_depth_map`.

---

## 3. Mesh Generator Service

**Files:** `main.py`, `mesh_builder.py`

**Purpose:** the shared "depth data → real printable solid" builder.
Neither Segmentation nor Tonal-Banding produce anything printable on their
own — a depth map or an outline alone has no thickness/closure. This
service is what makes the output an actual watertight STL.

**Core algorithm (`build_heightfield_solid`):** front relief surface (from
the depth map) + flat back plate at z=0 + stitched side walls around the
full perimeter = one watertight manifold. Verified via `check_manifold()`
— every edge must be shared by EXACTLY 2 triangles for a mesh to be
slicer-valid; this is checked structurally, not just "does it look right."

**Downsampling (`downsample_depth_map`)** uses NEAREST interpolation
deliberately — smooth interpolation would blur sharp band edges (tonal
banding) or pocket boundaries (tool holders) into unwanted intermediate
depths that don't correspond to any real band/pocket value.

**Two depth-map sources, same builder:**
- `bands_to_depth` output (Tonal-Banding) — continuous-ish (N discrete
  bands), used for lithophane relief.
- `build_pocket_depth_map()` — NEW, built for Tool Tracer: takes one
  binary mask + one pocket depth per tool, produces a depth map where the
  base block sits at `block_thickness_mm` everywhere except each tool's
  footprint, recessed by that tool's own depth. Deliberately reuses the
  exact same `build_heightfield_solid` — a depth map with 2 levels per
  tool is not a special case, just a simpler input.

**Key endpoints:**
- `POST /mesh/from_depth_map` — Keychain's lithophane backing. Takes
  Tonal-Banding's 16-bit depth PNG + `px_per_mm` + a `max_mesh_dim`
  (lower for live preview, higher for final export — a full-photo-resolution
  mesh is far too heavy to redraw on every UI interaction).
- `POST /mesh/from_pockets` — Tool Tracer's holder/organizer. Takes a list
  of `{mask, pocket_depth_mm}` per tool + overall `block_thickness_mm`.
  All tool masks must be the same pixel dimensions (same source raster).
- Both return `{stl_b64, vertex_count, face_count, is_watertight,
  non_manifold_edges}` — the frontend should treat `is_watertight: false`
  as a hard error state, not a warning; it means the STL will fail to
  slice.

**Not yet built:** the pocket organizer currently takes pocket depth as an
input per tool (per the project owner's explicit choice — see
`03-frontend-flows.md`), NOT auto-computed from anything. The frontend/UI
needs a way to collect that per-tool depth from the user.
