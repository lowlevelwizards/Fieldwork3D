# Fieldwork — S1 eleven-headgear coherent style comparison
Date: 2026-11-15. **Read-only art-direction audit; no models changed.**

## Evidence / reproducible method
- Current `main` at audit branch creation: `535a93a6be75a66b996e5fe69212c7729437ee6b`. Source: exact user-shared in-game iPhone screenshots, the main repository's canonical headwear registry, and **44 controlled screenshots** from `scripts/headwear-s1-eleven-comparison.mjs`.
- Action workflow: S1 eleven-headgear visual comparison; 430×920 iOS-like viewport @2 DPR; same operator, lighting, orientation presets, kit and canvas stage, front/side/back/FIT. Fixed crop for front/side; FIT uses a separate crop of the same camera view because the FIT camera frames the whole operator.
- Color: nearest **permitted muted solid**: olive drab (soft and most helmets), Soviet 4BO, M56 postwar green, police charcoal. This is **not identical paint** because each item's material restrictions are retained.
- The 11 are **uncovered + four soft + six helmet cards**. Ballistic ACH/MICH family is one top-level choice with multiple cuts in Details; these cuts deserve an additional internal comparison before any modern shell changes.
- The composited image is a presentation crop only; all source renders are kept in the artifact zip. No fake redraw or rescaling individual objects relative to other options.
- CI produced all 44 frames and no browser errors.

## Core diagnosis
The family shares chunky head proportions, low detail density and a common palette. **Coherence breaks at the relationship between primary mass, lower edge/band and side coverage**, rather than raw polycount alone. The models use separate geometrical systems: dedicated hollow faceted M1 and SSh steel shells; a continuous ACH/MICH hem-profile shell; and many greedy joined cuboids for soft caps, PASGT, M56 and police. This is not inherently wrong, but their perceptual weight diverges.
- **Strongest baseline**: M1 and SSh-40 (broad principal shell, legible edge).
- **Biggest outlier**: DDR M56 (many terraces; crown-to-rim width jump; difficult to parse as stamped steel).
- **Second outliers**: PASGT and ballistic ACH (flat rigid side guards dominate and appear as distinct blocks).
- **Soft fabric outliers**: beret (stacked tray), beanie (cuff almost larger than cap body), boonie (brim as rigid slab).
- **Police**: independent front/ear plates and smaller-looking rigid box; needs one integrated profile.
- **Patrol**: readable as cap but brim looks like a projecting hard block, not folded textile.

## Eleven-model action matrix — no change yet
| Item | Observed at matched zoom | Confidence and next action | Priority |
|---|---|---|---|
| Uncovered | Baseline square skull establishes common coordinate frame | Lock as reference, no geometry change | Lock |
| Patrol cap | Good 3-read but front bill and lower sewn band read like thick board slices | Narrow the bill's vertical thickness and join it more naturally to band; no loss of square cut | Low |
| Boonie | Strong wide brim and squared crown; doubled planar bands/brim look like a rigid tray | Preserve extent, reduce thickness and lower-band layering; slight edge droop possible | Medium |
| Beanie | Oversized rectangular cuff dominates, crown too stiff/short by comparison | Keep substantial fold, reduce box-within-box feel with modest inset/edge treatment; no round smoothing | Medium |
| Beret | The asymmetry is there, but flat slab atop separate side band reads like stacked trays | Single dominant asymmetric crown/drape, lower fitted band visually secondary; remove extra stacking | High |
| Soviet SSh-40 | Large cohesive flared bell, few clean planes; good silhouette difference from M1 | Lock approved shell; only inspect near-invisible upper strap segment in isolation | Lock |
| PASGT | Giant deep squared side slab visibly disconnected from shallow crown | Integrate side/ear/nape coverage into one protective shell with broad planes, not an attached rectangular ear plate; keep actual coverage | High |
| Ballistic / ACH | Similar slab sidewall to PASGT; ear/brow and molded outline not legible enough as separate modern family | Preserve six cut stations but reduce boxed ear mass and align one edge binding; compare full/mid/high before acceptance | High |
| US M1 | Clean broad bowl, convincing substantial rolled rim, easy recognition | Lock shape and strap; use edge weight and overall visual mass as art reference | Lock |
| East German M56 | Visibly many narrow stair-stepped horizontal tiers; silhouette looks like nested rectangular trays | High-impact one-piece broad shallow crown and flared skirt; remove decorative terraces, keep distinctive M56 geometry | **Highest** |
| Protective police helmet | Small hard square cap with clearly separate visor and side guard attachments | Integrate visor and side protection into one primary shell silhouette; modest scale comparison after, not by blindly enlarging | Medium-high |

## Shared aesthetic rules (acceptance rubric)
1. **Functional shapes:** 1 primary mass, 1 intentional edge or fabric fold, optional 1 functional protective detail. More is okay only for genuinely distinctive construction visible at gameplay zoom.
2. **Boxy is approved:** wide flats, consistent big corners, limited deliberate chamfers. Do not replace with smooth spheres or dozens of narrow polygon rings.
3. **Material changes geometry:** thin fabric brim, thick knitted fold, rolled steel edge and composite shell binding should be visually distinct, yet consistent in hierarchy.
4. **No added rectangular attachments pretending to be shell coverage:** side protection is continuous with the helmet wherever the real design is one piece.
5. **Scale is family-relative:** do not shrink M1/SSh or scale every soft hat to match; compare crown and brow positions against the unchanged skull and functional protection.
6. **Color-neutral comparison:** use approved muted swatches; do not force illegal shared colors or misrepresent category distinctions.
7. **Performance unchanged:** one authoritative rendered shell per headwear; no hidden legacy alternate and no per-frame rebuild; keep color/UV/camo/save schema, attachments, chinstrap clearance and physics intact.

## Implementation roadmap, separate PRs
**S1-A — hard helmet cohesion (in order):** DDR M56 → PASGT → ACH/MICH → police. Compare all six in the same frame after each pair; preserve M1/SSh geometry. First implement one anchor prototype, not a giant family-wide rewrite.

**S1-B — soft headgear:** beret → boonie → beanie → patrol. Preserve the 2/3-read and use material-specific thickness.

**S1-C — cross-family visual QA:** regenerate all 44, then capture strict 3/4 when supported, compare at both Studio and gameplay zoom. Reject changes that merely redistribute extra plates or add decorative ridges. Visual approval by user before staged release.

**Release policy:** no changes to game assets in this audit. Do not merge the capture-only PR to main unless there's a reason to retain a capture script; use results as baseline. Future geometry changes go on their own feature branch, with focused checks, grouped releases and public Pages verification.
