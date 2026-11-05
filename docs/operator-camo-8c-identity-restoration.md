# Camouflage 8C — Restore identity without undoing 8B's gains
**Goal:** selective correction of 8B regressions visible in the mobile operator screenshots; do **not** blanket-increase detail. Use existing Fieldwork 64×64 polygon-index masters, deterministic hash/nearest-neighbor, shared fabric/headgear path, fixed 54 IDs and saves.

## Art targets / nearest neighbors
| Pattern | Keep from 8B | Correct in 8C | Nearest neighbor / negative read |
|---|---|---|---|
| Greek Lizard | warm khaki/olive/russet palette, individually authored horizontal geometry | restore majority of continuous 8A ribbons; introduce only sparse broken ends, overlapping shorter brush accents and notches. Most lines should traverse many pixels rather than terminate halfway | Tiger Stripe / Urban Kamysh: Greek painterly interrupted bands, not tiny woodland shards |
| JGSDF Type II | green-forward colors, independent fleck family | increase tightly packed rounded 4–12px parent clusters and attached satellites at 1–3px, bringing back intermediate shapes; no enormous lone black/green spots | Flecktarn & Soldier 2000: fleck cloud, not brown-ground islands |
| South African Soldier 2000 | clear ~40% earth-brown backdrop, cool sage / grass greens | slightly expand green islands without losing the brown background; more contrasting internal dots and paired flecks clustered **inside** them | JGSDF: broad earth ground + internal green spotting, not separate dot cloud |
| Russian Izlom / Skol | dark forest palette, angular lozenge family, no Leto pea dots | reduce overlaid motif count ~30–40%, retain recognizable larger angular breaks, slightly soften harsh rust contrast | Leto / Flecktarn: distinct angular shards, no blotch noise |
| Urban Kamysh | wide navy and slate-gray stripes, bold blue read | preserve dark-band mass and add only a few shorter offshoots at band tips | Greek Lizard: unmistakable blue-black reed stripes, not smooth clouds |
| Norwegian M98 | 3 colors, rounded large lobes, no detail noise | add a few meaningful intermediate lobes (6–11px) so thighs aren't near-solid; preserve broad 18–35px silhouettes | Swedish M90: not sharp polygons or fourth color |
| PenCott MetroPolis | exact PenCott family index tile, balanced mineral palette | **freeze** | GreenZone / BadLands |
| Kryptek Typhon | exact Highlander family index tile, neutral dark graphite | **freeze** | Kryptek Highlander |
| SS-Leto | successful 7C oakleaf + pea dots | **freeze** | Izlom |

## Technical spec
- Keep `src/operator-camo-batch-8a.ts` as the canonical 64px indexed print generator; preserve the downstream headwear/fabric/rig path.
- Stage 8C-A: Greek Lizard, JGSDF, Soldier 2000. Use existing handcrafted polygons and random hash; replace generators selectively. Commit.
- Stage 8C-B: Izlom, Urban Kamysh, Norwegian M98. Touch only their generators and optional Izlom palette. Commit.
- Stage 8C-C: QA fixture to compare frozen deterministic 8B and 8C indices and nearest-neighbor output at 64/32/16px, and run focused prior 8A/8B/7C compatibility checks + production build. Commit.
- At *every* stage retain one cached 64×64 master, integer indices and palette unchanged except consciously documented Izlom rust tone; use no network/textures/images or per-frame sampling loops.
- Preserve `headwearCamoIndices` deterministic arrays, `HEADWEAR_CAMO_IDS` 54, garment compatibility, save/load schema, same fabric/headwear bytes, PenCott = GreenZone index equality, Typhon = Highlander index equality. No broad changes to other gameplay files.
- Release checkpoint: only after focused CI green, prior `main` Pages run successful and public build stamp verified, and no deploy active. Merge one compatible release batch; verify new public Pages stamp. If `main` advances, reconcile on branch and retest. If any gate fails, hold PR.

## Fixed-seed acceptance
- Greek: more horizontally linked runs than 8B; remains visually distinct from Kamysh.
- JGSDF: parent/satellite fill increases relative to 8B, smaller flecks visibly cluster and no single oversized ring-like dark spot.
- S2000: earth-brown field remains at least ~37% (acceptance tolerance), varied interior micro-spots on green.
- Izlom: fewer small angular overlay fragments; tan still under 23% and distinguishable from Leto.
- M98: exactly three inks; intermediate lobes break up clothing panels without adding micro speckling.
- Frozen prints: MetroPolis, Typhon and Leto 7C are byte-for-byte identical to preceding build.
- Preview identical clothing and UV phase across old/new art, plus menu swatches and in-round distance before another iteration. Avoid interpreting a single random clothing reroll as artwork regression.

Visual reference anchors preserved from 8B: [Greece](https://camopedia.org/index.php/Greece), [Russia](https://camopedia.org/index.php/Russia), [Japan](https://fareastmilsim.com/jsdf-equipment), [South Africa](https://camopedia.org/index.php/South_Africa), [Norway](https://www.joint-forces.com/kit-camo/33505-norwegian-army-m98-pattern).