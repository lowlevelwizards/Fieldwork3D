# FAL S1 — FN FAL 50.00 silhouette blockout contract

**Status:** isolated review prototype; **not** a weapon family, factory preset, inventory item or live game feature.
**Branch:** `feature/fal-stage1-silhouette-blockout`
**Review page (Vite dev server):** `/fal-stage1-lab.html`

## Objective

Make a recognizably FN FAL 50.00 using the **least possible exterior geometry** under Fieldwork's established chunky, stubby, abstracted, iconic weapon-art rules. Compare with the **actual** M4A1 and G3A3 meshes under one monochrome material, one camera and unchanged model scale. No fake G3/AR meshes, highlights, color-coding or camera tricks.

## Non-goals

No production Arsenal catalog insertion; no FAL preset; no family, ammunition, damage, or inventory migration; no grip/pose changes; no firing mechanics; no surface vents; no wood, polymer, textures, engravings, selector marks, or spare parts; no Para or Israeli variants; no folding-stock animation; no merge/deploy at this checkpoint.

## Ground-truth landmarks in current repo

All coordinates are **model-local**, with +X to muzzle, +Y up, +Z sideways. These are **game art units**, not millimeters.

| Landmark | M4A1 | G3A3 | Target FAL 50.00 |
| --- | ---: | ---: | ---: |
| Stock rear X | -14.25 | -15.30 | **-15.00** |
| Front handguard begins X | 3.55 | 4.05 | **3.80** |
| Handguard ends X | ~12.20 | 14.05 | **14.10** |
| Front sight X | 13.17 | 17.40 | **14.70** |
| Muzzle end X | 18.40 | 22.40 | **22.00** |
| Approx. total X span | 32.65 | 37.70 | **37.00** |

References: `ar-barrel-profiles.ts`, `hk-barrel-profiles.ts`, `ar-silhouettes.ts`, `hk-silhouettes.ts`, `profile-primitives.ts`.

Real FN 50.00: 533mm (21-inch) barrel, approximately 1090mm overall. Those measurements establish the *model identity*, not a literal-to-game coordinate scale.

## Silhouette hierarchy (high to low)

1. **Long, stepped upper and angular lower receiver:** 8-vertex upper outline + 9-vertex lower, plus one distinctive 5-vertex magazine-well wedge. Not the G3's straight, raised cocking-tube structure. Not an AR split upper/magwell wedge.
2. **Fixed swept/humpback buttstock:** 9-vertex outline and one thick buttplate. Rear X=-15.0. The upper stock shoulder forms a visible swell approaching the receiver; underside sweeps toward butt. Avoid the M4 buffer tube or the G3's simple wedge contour.
3. **FAL handguard and forward anatomy:** a single 8-vertex broad flattened tapered shroud from X=3.8 to 14.1. It must not read as a G3 tube or M4 quad rail. Gas-block front sight at X=14.7, with 7.3 art units of muzzle region after it.
4. **Magazine placement:** one near-vertical steel-box silhouette (6 points), center X=1.35, top Y=-2.98 and bottom Y=-8.05. Do not make it curved like AK or absurdly broad. Character comes from the receiver/magwell and insertion relationship.
5. **Pistol grip and sights:** one deeply raked broad 6-point grip, one thick rear blade and one protective-ear front sight profile. No tiny selector, mechanical pivots, top rail, or ring sight matching the G3.
6. **Carry handle:** one optional raised open-frame shape centered above the front receiver/handguard transition. Hidden by default to ensure recognizability is independent of a potentially misleading AR-like accessory.

## Minimum mesh breakdown

| Shape | Primitive | Meshes | Mandatory? |
| --- | --- | ---: | --- |
| Fixed FAL stock silhouette | extruded outline | 1 | yes |
| Buttplate | cuboid | 1 | yes |
| Upper receiver/dust cover | extruded outline | 1 | yes |
| Angular lower | extruded outline | 1 | yes |
| Magazine-well step | extruded outline | 1 | yes |
| Pistol grip | extruded outline | 1 | yes |
| 20-round magazine | extruded outline | 1 | yes |
| Standard fore-end | extruded outline | 1 | yes |
| Exposed barrel | 6-sided tube | 1 | yes |
| Front sight/gas-block silhouette | extruded outline | 1 | yes |
| Muzzle device | extruded outline | 1 | yes |
| Rear sight | extruded outline | 1 | yes |
| Raised carry handle | one extruded frame with real void | +1 | optional |

**Target: 12 meshes without handle / 13 with handle.** These include silhouette-bearing mechanical landmarks only. Don't spend this saved budget on more details.

Geometry shares one monochrome material and the existing geometry primitives; no per-frame mesh allocation. The optional handle is a review-only switch, not a registered part or material variant.

## Model-specific negative-space rules

- Keep a genuine open angle between FAL pistol grip and magazine; a contiguous lower must not fill it in.
- Expose a visually substantial section of barrel *after* the gas-block/front sight. This is the strongest distinction from the G3.
- Maintain the absence of raised G3 cocking tube. The receiver roof must be clean.
- The raised handle is not permitted to provide the only distinctive recognizable silhouette.

## Review and approval gates

1. **Side monochrome:** default handle OFF. FAL is recognizably distinct from the G3A3 and M4A1 without labels, palette or detail.
2. **3/4 monochrome:** all shapes retain substantial depth without ugly crossed planes, black seams, hollow mass or Z fighting.
3. **Thumbnail:** compare at the actual Arsenal card preview size, not just the enlarged inspection view.
4. **Shape-removal test:** if a subshape doesn't change silhouette or necessary spatial comprehension at card size, delete it.
5. **Profile data:** min X and max X must match the contract; M4 total length < FAL length < G3 total length.
6. **Performance:** no render-loop geometry creation, valid geometry disposal, only existing primitives/materials.
7. **Stability:** new code remains unreachable from production game routes and does not change existing AR/AK/HK catalog, saves, poses, or simulation.

Stage 1 should receive *visual* approval after actual screenshot inspection. Numeric tests and code review alone cannot establish recognizability.

## Build/review steps

- Run `npm run dev`; open `/fal-stage1-lab.html`.
- Leave **Raised carry handle** unchecked; judge SIDE view at equal scale.
- Switch to THREE-QUARTER; compare depth and silhouette.
- Toggle carry handle to verify it improves, rather than invents, identity.
- Capture 3-way SIDE and 3/4 view screenshots; separately inspect against actual Arsenal thumbnails.
- Refine only primary vertices and proportions; do not add tiny mechanical details to solve a silhouette problem.
- Once approved, stage 2 promotes the approved shape into the **six-slot FAL family** with correct muzzle, stock, pose and inventory contracts. Until then it does not appear in live Arsenal.

## Implemented files

- `src/weapons/geometry/fal-stage1-blockout.ts`: shape builder and immutable target landmarks.
- `fal-stage1-lab.html` and `src/fal-stage1-lab.ts`: standalone same-scale monochrome comparison.
- `tests/weapon-fal-stage1-blockout.test.mjs`: baseline spatial, detail-budget and cleanup assertions.

No test run or visual approval is claimed solely by adding these files.
