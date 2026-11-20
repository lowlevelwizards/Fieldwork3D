# Beretta D5 — surgical edit and visual acceptance contract
Date: 2026-11-20. Scope: art-only M9/92FS + M9A3, `src/weapons/geometry/beretta-m9-silhouettes.ts`.
Authority: [Universal Weapon Art & Production Standard](weapon-production-standard.md). Source of D5 priorities: direct user review of D4 mobile side / three-quarter / top / opposite screenshots, building on the D4 reference and art contract.

## Lock and exclusions
- Keep the D4 **long beavertail** and integrated frame; do not add a trigger.
- Preserve `M9_ART` IDs, muzzle endpoints, barrel radius 1.02, real open-top geometry, magazine floorplate contact and art-only semantics.
- No live Beretta issuance, ammunition, ballistics, magazine changes, operator animation, stored loadout migration or new weapon family.
- No per-frame allocations or new renderer. Use shared palette and the existing part slot and cleanup conventions.

## Edit-by-symbol checklist
| Symbol/code locus | D4 measured art datum | D5 authored change | Visual acceptance |
|---|---|---|---|
| `outer:Outline` | Lower-front frame edge `[5.92,-.70]→[1.58,-1.12]` | Make both bottom points Y=-.70 | Flat lower dust cover from side, separate from curved guard |
| `breech` / `rearSlide` | Upper depth=2.42 uniform | Inset both upper Z edges progressively by **14%** from Y1.91→Y3.17 by deforming the existing mesh vertices; recompute normals/bounds | Trapezoidal roof in top/quarter; no added bevel mesh |
| `skirt:Outline` | Broad lower band top Y1.39 | Top Y2.16 with existing depth 3.03 | Taller separate lower slide, still narrower upper above it |
| `sideRail:Outline` | Forward side-rail roof 1.61 | Roof 1.72; avoid covering upper barrel | Barrel remains independently exposed |
| `cross`, `wrapGeometry` | U-wrap along X depth=.70 | Enlarge front-to-back to **1.45** and anchor start `nose−1.37`, ending `nose+.08`; retain open top | Front reads like continuous side walls not short posts |
| `wrapCrown` | No connected front top | Shallow transverse bridge, center X `nose−.30`, Y3.22, X-length .78, width 3.26 | Cheeks join only at nose; open slide behind remains real |
| `frontSight` | Short thin block, hovering visually | 0.83 X-length, bottom overlaps top bridge | Sight physically attached to muzzle wrap |
| `hammer:Outline` | Wide low blade, max Y3.77 | Tall slim 6-point hook, max Y4.43, X width .63 | Taller/slimmer hammer without changing beavertail |
| `gripPanel:Outline` | Front of side panel overly vertical | 5-point per-variant profiles, top around Y−1.64, rearward rake by heel | Panels follow swept M9 vs straighter M9A3, no floating patch |
| Serration index batch | On Z±1.21 upper slide, x−6.82; Y1.50→2.82 | Z±1.543 on lower skirt, start x−5.97, pitch .58, Y.70→2.04 | Four short forward-raked grooves per side, visibly forward and down |
| `lever:Outline` | Upper face Z±1.30, Y1.98→2.65 | Lower band Z±1.605, Y1.34→1.98 | Paddles project from outer lower slide face on both sides |
| Red dot batch | Upper Z±1.24, Y1.79 | Lower Z±1.547, center x−8.13,Y1.06 | Dot below its lever, no upper-block floating accent |
| M9A3 `m9AccessoryRail` | Center Y−.55, buried in frame | Center Y−.86, height .51, plus 3 batched side slot marks | Railed M9A3 reads in side profile, while M9 remains unrailed |
| Optional iconic lower controls | Missing | One indexed batch of select oversized frame cues; intentionally asymmetric | Identity improves without micro-machining |

All coordinates are local **illustrative game-art units**, not real firearm dimensions or instructions for a functioning mechanism.

## Required smoke/release checks
- Exact assembled 3D side/opposite/quarter/top captures of both variants at **390px mobile and 1200px desktop** with actual WebGL. Do not approve art from code/ray tests alone.
- Geometry checks: upper roof Z width drops above Y1.91; lower skirt top=2.16; serrations and red safety indicators are on its true exterior faces; U-wrap length>=1.4 and crown/sight have bounding-volume contact; dust-cover underside horizontal; grip-panel top-to-heel rake; hammer taller/slimmer; M9A3 rail is visibly below frame.
- Guard remains physically open; no inserted trigger; M9 and M9A3 retain distinct grips, finish, rail and muzzle length; Glock equipment unchanged.
- Count **emitted triangles and mesh objects** (not just part metadata). Minimize added object/draw-call burden via batched markings. Document a tightly bounded exception to old 20-mesh/450-triangle art-review targets if unavoidable; never silently increase runtime allocations.
- Commit in feature branch and keep draft PR until exact-head focused tests, TypeScript/production build and critical integration are green.
- Before merge verify previous GitHub Pages deployed the current main SHA and no release is active. After merge verify the public build stamp equals the new main SHA; repair failed Pages deployment instead of stacking merges.

## Review cautions
- The narrow upper cannot be replaced with an extruded full-width slab or the Beretta will regress toward Glock mass logic.
- Nose crossbar must cover only the last segment of the muzzle, not create a long opaque top that hides the real barrel.
- Both grip panels must face outward, but side-correct controls may be asymmetrical.
- Avoid touching the long beavertail, trigger aperture or unrelated gameplay for this aesthetic pass.
