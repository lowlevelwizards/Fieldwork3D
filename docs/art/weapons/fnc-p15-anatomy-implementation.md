# FNC P15 — anatomical proportion reconstruction

Implemented as a visual-only FNC-specific front-end and receiver update.

## P14 to P15 coordinates
- Receiver roof remains Y1.60; front becomes flat X2.75 (previously an upper slope ending X3.20 at Y.45). The lower terminates X2.75, retaining a separate magwell and original magazine feed position.
- Polymer starts X2.45, full width X3.35..10.10, terminates X10.70; vertical transform uses a Y=-1.11 pivot, 1.30x height and +.38 lift. Two side grooves use the same transform.
- Upper vented metal spine X2.55..13.95; roof Y1.52, bottom Y-.45, shoulder Y.35. Taller ~1.9x, stays narrow in Z (maximum half width .68). Side slots at Y.82 and 1.15; five broken slots per row starting X3.65, pitch2.05; roof slots follow Y1.575.
- Polymer handstop uses the exact same Y transform and retains a single six-face tapered mesh.
- Sight base top Y1.52 at its rear, 1.48 at front, bottom -.55. Two chunky FAL-style cuboid ears centered X14.26,Y1.95, height1.30, top2.60, with true center void.
- Existing pistol grip outline shifts +.90X, preserving rake and dark material. Existing primary-hand anchor remains inside its contour.
- Bore and all factory/muzzle attachment anchors remain at X19.50,Y0. Service barrel stays Y0, positioned BELOW the newly enlarged upper spine.

## Scope and audit
Retain P10 folding stock, magazine placement, side operating port, charging knob, sight family, all modular IDs, material reuse, and other weapon families. No new accessory sockets, no per-frame geometry generation, no extra vent/connector meshes. Coordinate acceptance distinguishes correct receiver/gas roof alignment and true volumetric overlaps from cosmetic adjacency. Legacy P11-P14 tests with superseded proportions are updated without dropping stock, muzzle, FAL, or other functional checks.

## Release
FNC/FAL focused geometry, TS check, build, five-rifle browser visual comparisons, desktop/mobile Arsenal, Ground Zero regressions and build-stamp public Pages verification are required before declaring live. Artistic merit of screenshots remains a separate manual review.
