# D2-R10–R15 — Minimum-shape protective mask release
Date: 2026-11-05. Baseline: 30ce4bed6fe2bea5b36b7afcbf4c3c7cf6476f05.

## Six distinct icon silhouettes
- Half tactical: broad thin lower guard, one front insert and one rear strap.
- Industrial half: one tapered silicone nose/chin body, two shallow OUTWARD filter pods; one compact mode preserved.
- GP-5: one tapered and fully enclosing rubber hood, two round lenses, one downward canister. No regular straps.
- M17: inflated cheek volumes integrated into one shell, two tear-shaped lenses, low round voice disc. No screw-on external filters.
- M40: narrower angular full-face shell, separate eye pair, ONE large asymmetric external side pod.
- M50: one panoramic wraparound visor and two low flush jaw filters, no separate binocular windows.

## Reference comparison and anatomy
Keep existing 8×8×8 skull (X ±4, Y -1 to 7, Z ±4, -Z forward). Major helmet/hood shapes enclose skull, not replace it. GP-5 hood must not show scalp at crown or side, nor resemble a cube box. Approximate guide family: GP-5 ShM-62, U.S. M17A2, M40, Avon M50, 3M 7500, tactical mesh half guard. Approval must be from front, ~45°, side and rear actual WebGL screenshots. Real photos establish silhouette only, not laboratory dimensional engineering.

## Render/complexity gates
- Hero shell is a single fitted shape with actual eyepiece/visor cutouts.
- Lenses: continuous thick rim. Filters: a few broad facets, no nested tube towers.
- Major forms: 3–6. Geometry <2,000 triangles per mask, generally far below.
- No eye/head intersection, z-fighting, unanchored straps, material loss in dark colors.
- Mask thumbnails must contrast against background at 160 px and have a tighter facewear-only frame.
- Sizing/cosmetic values are saved under pre-existing IDs; no hitbox, protection, weapon, AI or kit changes.

## Verification and release
R10: shared sculpted-shell and shallow-filter geometry; two half masks.
R11: GP-5 hood reformed with tapered loft and central downward filter.
R12: M17/M40 individual surfaces, integrated internal cheeks vs asymmetric canister.
R13: modern single wraparound M50 visor and low conformal twin filters.
R14: material separation, clear thumbnails and obsolete helper removal.
R15: topology/bounds/mode tests, actual mobile WebGL captures and release checkpoint.
All R10–R15 stages live on a feature branch; only critical tests. Merge at a single checkpoint after older GitHub Pages build is successful and publicly verified. If deployment fails, fix it, do not queue another build.

## Remaining human visual review criteria
Inspect cropped real gameplay screenshots and emitted WebGL captures. Formal automated topology/bounds tests do NOT certify aesthetic quality, especially reference resemblance. Reject if a mask needs a label to distinguish it or if a dark insert loses its hero shape.
