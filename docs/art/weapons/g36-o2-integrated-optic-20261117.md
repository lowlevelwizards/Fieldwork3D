# G36 O2 — integrated original dual optic

**2026-11-17.** User-approved O2 JS mockup: main housing **125%**, upper hood **125%**, lower eyepiece projection **55%**. This applies to the existing `HK G36 · Original Dual Optic` factory appearance, not to ballistics or optical magnification.

## Geometry grammar

- Replaces the P8 block and cube optic with a photo-informed main **six-sided volumetric pod**, one integrated **six-sided upper hood**, one **eight-sided projecting lower ocular**, one **six-sided upper ocular**, and precisely two dark circular optical faces.
- Main and upper hood use two broad cross-sections each, with flat faceting and a slight forward taper. The upper crown ends at the existing 4.70 Y landmark; lower/upper sight contact datums remain 3.57/4.46.
- The lower eyepiece protrudes farther towards the stock than the upper, as in the approved 55% projection composition. Apertures are visible in rear and three-quarter views; no additional ring layers, glass transparency, adjustment dials, fine ribbing, or separate optics rail.
- Uses the same `family-receiver-...` naming, existing tagged finishes, retained six-slot recipe and original open carry handle. The existing P6/P7 optic review variants remain in the comparison lab and do not become separate saved parts.
- All geometry is built on configuration creation, not per frame.

## In-game review and acceptance

Inspect actual `Arsenal → G36 Original Dual Optic` side, rear and three-quarter angles at mobile/fullsize, compare to V13 stock and other HK miniatures. Check no lens backside disappears, no floating upper hood, no occlusion of carry handle gap, no excessive draw count. Cosmetic acceptance remains provisional pending user review.

Required checks: `tests/weapon-g36-o2-optic.test.mjs`, existing G36 P3–P8, real builder/browser lab, Ground Zero, typecheck/build. Before merge, verify current-main reconciliation and public Pages release/served stamp; do not create overlapping Pages deployments.
