# FNC P11 — two-zone fore-end and twin-ear sight

User reference and current Arsenal screenshot establish the shape language:
rear main polymer handhold = broad, short, two long side grooves; front vented
gas-cover assembly = longer, slimmer, distinct multiple broken vent rows.

## Exact visual geometry (art units, not engineering measurements)
- Poly body x3.45–9.55, six-face, max half-depth ~1.17; two long parallel
  grooves per side x4.49–8.90. No thin mechanical detail or round smoothing.
- Subtle polymer handstop: one shallow piece at x9.47; projects a little
  below/out from forearm and intersects the existing body; no enormous collar.
- Upper gas box x5.45–14.35, length 8.90 versus polymer length 6.10;
  width 1.34 in Z, height 1.08, smaller than polymer Z width.
- Vents are 5 broad disconnected dark slots per roof row and per each of
  two rows on BOTH gas-box sides. Side marks are two batched meshes, roof
  is one. No added hole-per-vent geometry or per-frame meshes.
- Front sight: single open concave U-shaped extruded cross-bore silhouette
  containing two chunky protective ears and shorter inner post. Retain
  integrated sight/gas seat; no mini pins or separate bolts.
- Barrel rendered from X8.55 within the polymer/cover intersection to the
  original 19.50 muzzle endpoint. Gameplay, contact datums, world mount
  offsets and weapon-family part IDs unchanged.

## Audit
Avoid (1) gas-cover/plastic ambiguity: separate their long and dotted visual
rhythms; (2) floating parts: test bounding intersections of gas/forearm,
gas/sight seat and barrel; (3) culled top vents: test normal +Y; (4) front
sight becoming a generic solid tower: test two separated upper ears and
shorter central post; (5) barrel/stock or other family regression: run
factory and suppressed tests, unchanged FAL acceptance and UI renders;
(6) performance drift: batch vent marks into five strip objects including
polymer lines and roof; no per-vent draw call.
