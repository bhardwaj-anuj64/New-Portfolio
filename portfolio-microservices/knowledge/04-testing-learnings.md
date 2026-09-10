# Testing Learnings — Real Bugs Found & Fixed

Everything here was found by testing against REAL photos (not just
synthetic shapes), and each one changed the implementation. Listed so
future work doesn't silently reintroduce them.

## Segmentation Service

**1. `floodFill` defaults to floating-range comparison, which leaks
through soft edges.**
OpenCV's `floodFill` compares each new pixel to its already-filled
NEIGHBOR by default, not to the original seed color. On any real photo
with blur, JPEG compression, or a soft shadow gradient at an edge, this
lets the "background" fill walk through the gradient in small steps and
leak straight into the foreground. Fixed with `cv2.FLOODFILL_FIXED_RANGE`,
which compares every pixel back to the fixed seed color instead. Confirmed
empirically: background pixel count on a real test photo went from a
broken 997,719px (leaked through) to a correct 949,543px after the fix.
**This bug likely exists in the original desktop tool tracer script too**,
since it used the same default flag.

**2. GrabCut punches false "holes" through organic photo subjects.**
GrabCut classifies by color/texture statistics, not semantics — a dark
eye on a pet photo can statistically resemble a dark background (e.g. a
TV in the shot) and get classified as background, creating a "hole"
exactly where the hole-preserving pipeline (built for real manufacturing
holes like screw holes) would try to preserve it. Fixed by auto-filling
ALL interior holes specifically for the GrabCut path — organic photo
subjects essentially never have a genuine hole to preserve, unlike
manufactured parts. This is a per-method behavior difference, not a
universal setting: magic-wand/Tool-Tracer path must keep hole-preserving
behavior; GrabCut/Keychain path fills them.

**3. GrabCut on full photo resolution is far too slow.**
A 12MP photo (typical modern phone) made GrabCut time out entirely.
Downscaling to ~900px max dimension before running GrabCut got it to ~7s.
Always downscale before GrabCut; there's no reason to run it at full photo
resolution.

**4. 2-point scale calibration drifts with camera tilt; also, background
noise from non-uniform surroundings.**
A 2-point distance calibration is only accurate near the two clicked
points — any real handheld photo has some tilt, so scale actually drifts
across the frame. Fixed with 4-corner perspective rectification (warp the
reference rectangle to fronto-parallel). This ALSO turned out to fix a
second, separate problem: photos of tools-on-paper often show fabric/table
around the paper, and that surrounding background is a different color
from the paper — a magic-wand seed tuned for the paper won't correctly
classify it, producing frame-edge noise. Rectifying to just the paper
region eliminates this entirely, since the working image no longer
contains anything outside the calibrated rectangle. **Always run
rectification before segmentation, not just for scale.**

**5. "Touching objects merge into one blob" was mostly a false alarm —
investigate seeding before reaching for object-splitting algorithms.**
Initial testing on 3 brushes with touching-looking bristle heads appeared
to show a genuine touching-object limitation. Built a distance-transform +
watershed splitter to handle it. Then re-tested with the actual photo
zoomed in: there WAS a visible paper gap between the brushes — the
merging was because only the bright paper was seeded as background, not
the shadowed gaps between the tools. Once shadow-area seeds were added,
all 3 brushes separated correctly with a single-seed-tolerance approach,
matching the original desktop tool's real behavior. **Lesson: when
objects that clearly have a visible gap in the photo still merge in the
mask, suspect incomplete background seeding before assuming a genuine
touching-object case.** The watershed splitter is kept as a fallback for
cases with a genuine zero-gap touch, but it is NOT the primary fix and
won't recover a boundary that isn't visible in the photo at all (e.g. two
objects that visually overlap with literally no seam — that's an
unrecoverable case for any algorithm, not just this one).

**6. A seed placed in a very dark shadow can slightly overreach into
similarly-dark foreground nearby.**
Known remaining imperfection, not fully solved: with a single global
tolerance shared across all seeds, a seed placed in a dark shadow (to fix
issue #5 above) can have a tolerance radius that also captures some
genuinely dark foreground pixels nearby (observed as a small notch bitten
out of a black-bristled brush). This is why the original tool was
interactive — a live preview lets the user see this happening and adjust
tolerance or reseed. Any rebuild should preserve fast, live preview
feedback for this reason, not just a "submit and wait" flow.

## Tonal-Banding Service

**7. Depth direction must be verified numerically, not just by eye.**
A visual read of a normalized depth-map preview image was initially
misjudged as backwards. Direct pixel-value sampling at known dark/bright
photo locations confirmed the mapping was actually correct
(darker → more depth). **Don't trust a quick visual read of a normalized
grayscale depth image for correctness — sample actual values.**

## Mesh Generator Service

**8. "Looks right" is not the same as "is watertight" — always run the
structural check.**
A mesh can visually look correct in a render and still not be a valid
closed solid. `check_manifold()` (every edge must be shared by exactly 2
triangles) is a structural, not visual, definition of "printable solid."
Always run this and treat a non-zero `non_manifold_edges` count as a hard
failure, not a warning.

**9. Depth-map downsampling must use NEAREST interpolation, not smooth
interpolation.**
Both tonal banding and pocket depths are deliberately discrete-valued
(N bands, or per-tool pocket depth). Smooth interpolation (INTER_AREA/
LINEAR) during downsampling blurs values across band/pocket boundaries,
introducing depths that don't correspond to any real band or pocket —
defeating the intentionally posterized/discrete look. Verified: after
NEAREST downsampling, the exact same number of unique depth values
survived as bands that went in.

**10. A static matplotlib render is a poor tool for judging visual
quality, even though it's useful for structural sanity-checking.**
Flat default lighting in a one-off render doesn't show relief detail well
— the 2D shaded-relief preview (from Tonal-Banding's `/band/preview`)
is a much better indicator of "how will this actually look." The real
answer is a proper interactive 3D viewer (real lighting, rotate-and-inspect)
— that's frontend work, not something a backend test script substitutes for.
