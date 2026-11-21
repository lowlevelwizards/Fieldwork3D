# Beretta D8 — silhouette-first miniature correction + mobile study framing

**2026-11-20 | M9 / 92FS and M9A3 art-only previews**  
**Baseline:** D7 merged art (M9 **368 triangles / 14 meshes**, M9A3 **388 triangles / 15 meshes**).  
**Sources:** user's D7 side / 3⁄4 / reverse / top screenshots in Fieldwork project; [universal weapon production standard](weapon-production-standard.md); [D7 surgical spec](beretta-d7-silhouette-rebalance-spec.md).

## Art principles / acceptance hierarchy

The weapon must read as a Beretta 92/M9 against the existing Glock family *without* text, finish, micro-labels, or close camera distance. The goal is a **chunky, stubby, iconically simplified caricature**: a few bold surfaces and recognizable voids, not a technically realistic high-poly pistol.

**Do not** add a trigger (explicitly excluded), mechanical/equipment authority, marks that disappear at gameplay scale, duplicated preview renderers, perpetual RAF, or new material palette. Keep the physical empty trigger guard, genuinely open barrel channel, barrel crown projecting beyond the front cap, factory IDs, contacts, side-on first-view defaults and 6-facet barrel. Avoid changes to the Glock production workbench.

## Staged implementation / source anchors

| Stage | Existing code anchor | D8 surgical operation | Poly/mesh policy |
|---|---|---|---|
| A1 | `hammer:Outline` | Bend crown backward in a horizontal 9-station hook, shorten from D7 Y4.02 to Y3.85 and enlarge horizontal sweep to X−10.03; 1.05 Z-depth | Same 9 silhouette stations, same single mesh |
| A2 | `outer:Outline` | Retire the shovel projection: tang tip X−10.65 (D7 X−11.40) with larger physical thickness and blunt return into frame web | Six original frame-tang stations, no new part |
| A3 | `gripPanel:Outline` | Two six-point side outlines. Break straight front/back panel edges at Y≈−5.1 while keeping classic M9 pronounced sweep vs A3's more vertical Vertec geometry | Same single planar batch; +1 meaningful station per panel per side |
| B1 | `m9UnifiedFrontShell` | Reprofile the *existing* 12-station U: rounded/octagonal beveled cheeks, tapered lower nose, more inward front-facing shoulder. Maintain real barrel channel. No side posts | Same 12-station shell, same 1 mesh |
| B2 | `m9UnifiedFrontShell` roof/sight | Replace box-like roof bridge with five broad sloped quad faces, narrow upper Z corners from ±1.21 to ±.97; stubby connected sight top Y3.94 | Same number of crown and sight faces, same mesh |
| B3 | `railProfile:Outline` A3 only | One more worthwhile profile station; extend embedded span X2.35–6.35, lower visible rail face Y−1.40 with blended sloping ends | Still one A3-only mesh, no rail teeth/slots |
| C1 | `GlockViewport.useTightArtFraming / quarter` | M9-only fit multiplier .83 (from .89); quarter preset receives .89 extra zoom **only on wide stages (aspect ≥1.15)**. Portrait stage keeps the safe fit so the nearer muzzle does not clip. Side/top/opposite presets return to correct fit. No change to ordinary Glock defaults | No GPU resource cost, still demand-render |
| C2 | `arsenal.css` M9 mobile block | Limit portrait art viewport to near-square `min(104vw,60dvh,520px)`, centered in the screen, eliminating giant empty grey area. Preserve 44px controls and pinch/drag | Scoped to `.arsenal-m9-inspector` |

## Focused acceptance and regressions

1. Side M9 and A3 must have **clear non-upright hammer heads**, a shorter *connected* beavertail with blunt tip, and angled/curved panels. The classic grips slope farther aft; the A3 keeps an upright grip but a more prominent frame rail.
2. At matching scale front / quarter, the muzzle front reads as one sculpted chamfered cast nose, not four posts and a bar. Open U cutout and exposed large 6-facet barrel remain physical.
3. 64px/128px thumbnail plus matched-scale G19 side comparison: do not spend tris on invisible pins/markings or exaggerate the sights beyond recognition.
4. D8 triangle audit uses actually emitted `index.count/3` and nonindexed `position.count/3`; retain **14 M9 / 15 M9A3 meshes**, target **≤376 M9 / ≤400 M9A3 triangles**. D8 can only exceed D7 by the one meaningful panel contour/railed profile additions. No new detail material.
5. Real Chromium/phone viewport screenshots at 390px and desktop for side, opposite, quarter, top for both variants. Compare canvas fill and actual fit; no clipping on mobile/landscape and no flash of wrong view after opening.
6. Critical geometry art tests, TypeScript production build, secondary parity, smoke for mobile and desktop, and core game regression tests only. Do not enqueue unrelated test fan-out. Keep D7 contracts that still describe functional behavior and explicitly amend obsolete shape specifics.
7. Do not merge until exact-head checks pass, PR has no conflict, previous production Pages build equals current `main` and no Pages run is underway. One grouped squash merge checkpoint; Pages deploy/status check to confirm the new `main` stamp before declaring live.

## Scope limits

These are art-only studies; not issued, no ammunition or gameplay. Other secondary families and saved Glock builds remain untouched. Operator holster sockets and muzzle positions must remain the existing authoritative values. No new low-level render helper is necessary.
