# R10 — construction-aware colors and silhouette identities

## Material ownership

Rig backing uses the gear fabric channel. Textile pouches use a separate
material and follow the rig's SOLID/CAMO by default, except if the particular
model has detachable pouches and the operator explicitly sets a pouch override.
Pouch textile flaps follow the pouch material, not an arbitrary permanent
Olive Drab trim. All authored front/side/rear webbing and rebuilt harnesses
share the ownable strap textile material. Structural metal/hardware mouth
openings remain dark/neutral and never inherit fabric camouflage.

Only genuinely detachable assemblies expose advanced options:
- Detachable pouch bodies: micro, placard, split-front, full bib, PLCE field kit.
- Replaceable harness: micro, placard, split-front, full bib and PLCE field kit.
- Sewn/fixed: Chicom Type-56, classic X-harness, bandolier, LBV, P83.

Solid color switches recolor all textile pieces on a fixed sewn rig. On printed
historical load systems, webbing may be neutral plain nylon instead of using
the cloth print. Individual explicit pouch/harness choices survive switching
styles but are ignored while viewing a sewn one. No inventory/capacity changes.

## Armor read, in ascending protective visual mass

Slick: 8.95-wide slim bag / .90 side band / 1.50 shoulder, minimal seams.
JPC: 9.35-wide open dual-band skeletal sides, split yokes.
Standard: 10.50-wide / continuous 3.28-height side band / 2.32 shoulder
and three obvious horizontal sewn panel rows.
Assault: 11.65-wide / 4.78-height substantial cummerbund / 3.18 shoulder,
5.10-height side plate, raised chest reinforcement and lower lip.

The plates are stylized face widths and overall protective textile envelopes,
not real armor plate sizing, plate count, or ballistics.

## Pouch identity language

Open elastic cells (placard), short bungee cells (micro), snapped full flaps
(classic X), tall toggled canvas (Chicom), short diagonal sleeves (bandolier),
wide utility-buckle wings (split-front), tall admin bib (full chest),
double-stacked pockets (LBV) and deep weather flaps (P83/PLCE). The backing
panel, pocket positions, straps and rear cargo remain their respective unique
authored rigs. We do not model extra ammunition to suggest more capacity.

## Acceptance and release

Run only R10 material/silhouette tests and existing contact/magazine/fit
regressions plus one mobile rig/armor capture pass. Release in ONE compatible
PR only after runner success, current Pages SHA verification and no other
production deploy. Preserve the original camouflage masters and wardrobe
save compatibility.

Reference baselines include original Type 56 sewn canvas, USGI LBV-88,
PLCE individual pouches, P83 Nutria Battle Jacket, Crye JPC 2.0, modular
MAV/placard and modern minimal slick carrier archetypes.
