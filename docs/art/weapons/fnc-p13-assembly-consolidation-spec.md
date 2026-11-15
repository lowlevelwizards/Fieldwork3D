# FN FNC P13 — unified stylized front-end (implementation record)

## User-visible problem
P12 screenshots show a short, disconnected-looking polymer handguard, a
visually elevated long box gas cover, a vertical fin-like stop, and front ears
rising from a high pedestal. Geometric overlap tests alone missed the issue.

## Single layout source and exact new ranges (local Fieldwork art units)
All coordinate owners are now in `fnc-front-layout.ts`.
- Polymer six-face mesh: X 3.45..10.70, full width starts 4.12 and ends
  10.10 (was 3.45..9.55). Two uninterrupted embossed lines extend
  X 4.49..10.05. Maintain the existing six-face grammar and width.
- Metal gas cover: X 5.05..13.95, still longer than the polymer, but now
  a six-sided tapered envelope instead of a box. Y -.68..+.40, half-depth
  at roof .52 / middle .68 / bottom .50. It physically overlaps polymer
  and front sight base. No hidden connector pieces.
- Metal ventilation: five broken slots per side row, **two rows on
  both sides** positioned above the polymer roof, and one five-slot
  row across the metal roof. Derived from the actual gas-cover surface.
  Five total batched decoration meshes include the polymer grooves.
- Polymer stop: one six-sided short faceted collar centered at X10.54,
  .55 longitudinal length, scale 1.18 versus polymer 1.065 at its
  thickest station. Real overlap with polymer and gas cover, no full
  rectangular fin. No new rings, screws or engraved micro-texture.
- Gas/sight seat: X 12.20..15.20, Y -.42..+.96, thickness 1.86.
  Rearward roof starts at Y .42 to follow the gas cover's +.40
  roof, then slopes modestly up at X12.80..13.30. This avoids
  a separate tall step.
- Two front sight ears (no third post): X 14.32, centerY 1.76,
  depth centers Z +- .68, each .82 longitudinal x 1.75 tall x .76
  side-width. Tops at Y2.635 (previous P12 Y3.09).
- Unchanged: complete P10 stock, FNC_P1 published weapon contact and
  muzzle datums, stock rear X -14.85, muzzle X 19.50, magazine, charging
  handle, rear sight, supressor/factory attachment contract, and
  unrelated FAL/HK/AR/AK artwork.

## Audit and safeguards
- This is artwork only, not weapon mechanics, assembly or ballistics.
- Layout is read only when creating a mesh on configuration changes;
  never compute geometry during normal frame rendering.
- Avoid duplicating layout constants in tests or part builders: P13
  source defines them; legacy P12 tests change thresholds to permit
  deliberately revised art without deleting contact-regression checks.
- New P13 acceptance checks distinguish AABB overlap from useful
  silhouette: roof exposed only moderately, side vent marks sit ABOVE
  the polymer roof, half-width actually narrows at metal roof, collar
  overhangs no more than .2, and ear tops are capped under 2.7.
- Existing browser CI captures side/three-quarter/opposite/mobile
  and desktop Arsenal to permit human visual review. These screenshots
  alone cannot objectively certify artistic quality; compare the
  front-end silhouette in them before considering another art pass.
- No new shared weapon geometry IDs; stable FNC P11/P12 userData aliases
  remain for tooling compatibility. Keep <=36 appearance meshes, no
  per-slot micro-vent render allocations.
- Do not change FAL; test it as a regression control.

## Release criteria
Focused P13 and earlier FNC/FAL geometry checks, TypeScript check,
production build, real WebGL multi-view comparison, mobile/desktop
Arsenal capture, repository Ground Zero regression, verified prior Pages
release, and verified new Pages build stamp after merge.
