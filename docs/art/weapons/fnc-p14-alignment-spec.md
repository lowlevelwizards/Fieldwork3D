# FNC P14 — rear alignment and silhouette integration

## Evidence and rationale
The user's post-P13 side and oblique Arsenal screenshots show a visible gap at
the receiver–fore-end junction, a stacked upper gas box, an abrupt molded stop,
an overly tall front sight and little tonal separation between steel and polymer.

The gap is NOT a rendering illusion: the existing upper receiver ends at X3.20
and the lower receiver reaches X3.28 while the P13 fore-end starts at X3.45,
leaving respectively .25 and .17 art-unit longitudinal gaps. P14 extends
the SAME polymer extrusion rearward; no cover-up connector mesh is added.

## P14 coordinate-level changes (art geometry, not firearm engineering)
- Polymer start X3.45 -> 3.00, full-profile start X4.12 -> 3.96. The
  X10.10 full-width end, X10.70 final end, all other dimensions and
  grooves are kept. This creates .20 overlap with upper receiver and .28
  overlap with the lower in X, and the fore-end is also volumetrically
  overlapping those parts in Y/Z.
- Metal gas cover stays X5.05..13.95 and retains six-sided faceting,
  five broken vent marks per row and one top row. Its top Y.40 -> .30,
  shoulder Y-.22 -> -.28 and bottom Y-.68 -> -.74, decreasing exposed
  vertical mass. Side vent center rows shift from .075/.275 to -.005/.155
  to stay on the new angled wall above the polymer top. The rows remain
  batched dark decals with unchanged bold mark height .155.
- One polymer endstop retains center X10.54 and longitudinal length .55,
  but tapers from section scale 1.13 at its rear face to 1.07 at its
  front, replacing the previously constant scale 1.18. It is shorter,
  smaller, and visibly attached without adding screws, rings or panels.
- Integrated front sight base becomes X12.40..15.15 (was 12.20..15.20),
  top Y.83 (was .96), with rear roof Y.31 tracking the gas roof.
  Width becomes 1.76 (was 1.86).
- Two existing unmodeled FAL-language ears remain cuboids, now center
  (X14.26,Y1.50), height 1.63 -> maximum Y2.315 (was 2.635).
  The gap and front sight family tags remain; no third miniature post.
- Fore-end material uses existing immutable FAL_DARK_POLYMER rather than
  HK_DARK_POLYMER to give the FNC polymer a tiny muted color/value shift,
  while steel, muzzle, P10 butt, grip and every other weapon family are
  unchanged. No new materials or draw calls.

## Acceptance
1. Assert positive 3-axis volume overlap at receiver upper/lower and
   polymer, not merely touching bounding edges.
2. Check gas roof above polymer but reduced from P13 and both broken
   side-vent rows exposed. Check roof vents ride above the actual roof.
3. Validate handstop profile tapers rear-to-front, remains one six-sided
   mesh and overlaps gas cover and polymer.
4. Check the flatter sight seat intersects gas cover and both ears,
   remains below previous height, and uses the unchanged open gap.
5. Check factory and no-muzzle variants, original P1 datums, P10 stock,
   unchanged FAL/HK geometry, material identity, mesh budget, TypeScript
   and real browser Arsenal/mobile captures. No per-frame processing.
6. Release only on green focused and Ground Zero checks; verify prior
   Pages release completed and then verify the published P14 build ID.

Avoid compensating by translating the entire front group: that would break
the exact stock/receiver/muzzle lengths and undo P13's good fore-end span.
