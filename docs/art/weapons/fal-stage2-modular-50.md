# Fieldwork FN FAL — Stage 1C correction + Stage 2 modular 50.00

**Branch:** `feature/fal-stage2-modular-50` (forked from Stage 1 prototype branch)
**Status:** implemented on feature branch; not merged or deployed; execution and visual approval remain unverified.
**Art philosophy:** chunky, stubby, iconic, simplified, authentic, abstracted and **not** forced artificially apart from the real-world G3.

## Decision after historical/reference audit

The FN FAL and HK G3 are genuinely close in full-length 7.62 rifle outline.
Stage 1B overcorrected: extreme triangular forearm resembled the M16A1, overly long rear-raked grip and peaked stock were not faithful.
Stage 1C restores authentic proportional relationships without abandoning Fieldwork miniature styling.

S1C stock comb max Y about 1.43 (versus S1B 1.99); heel about -3.38 (versus -3.73);
grip heel about -6.58 (versus -7.14); fore-end Y approximately +1.40/-1.74
(versus +1.67/-2.22); front-sight ears to +3.02 (versus +3.38).
Muzzle X remains 22.00 and sight center remains ~14.70.
A deliberate 0.20 X-overlap seats the guard behind the receiver's nose.

## Stage 2 factory scope

**One factory preset:** `fal-5000` / **FN FAL 50.00** / rifle-class compatible.
**One FAL browse platform:** independent of HK/G3 despite similarities.
**Exactly six family core parts**, keyed to the six established slots:
- Receiver `fal-50-receiver` — slender stepped, long cover and compact carry frame
- Stock `fal-fixed-polymer` — solid, gently swept fixed stock
- Grip `fal-grip` — short, rearward-raked pistol grip
- Magazine `fal-mag20` — near-straight, one-piece 20-round *visual* magazine
- Handguard `fal-vented` — lightly tapered forearm, three broad simplified vents per side
- Barrel `fal-21-service` — 21-inch historical identity; game-art muzzle at X 22

No alternate receivers, repeated stocks/finishes, inconsequential muzzle versions, tiny controls, or country-specific duplicate geometry.
Only essential visible details are added: **6 vent shadows, one side handle and one ejection panel**.
Base **12** silhouette meshes + **1** compact carry-handle frame + **8** tiny exterior identity pieces = **21 total meshes**.
The side ventilation marks are intentionally flat graphic art, not costly through-holes.

## Shared, not duplicated

- `fal-core-silhouette.ts` is the **one true FAL shape source** for Stage 1 review and live Stage 2.
- `fal-stage1-blockout.ts` is now a thin one-material facade, preserving existing comparison lab and tests.
- `fal-silhouettes.ts` composes the approved contours with the existing global muted steel/polymer palette and minimal identity details.
- `fal-barrel-profiles.ts` owns barrel and handguard landmarks used in pose, muzzle and camera alignment.
- `fal-magazine-profiles.ts` owns carried/rendered FAL 20-round profile identity.
- Every part uses the existing `addOutline`, `addCuboid`, `addFacetedTube` or `addProfileFrame` helpers, with static shared materials.
- No new Three.js framework or per-frame geometry creation.

## Gameplay/asset integration

New `fal` and `fal762` type metadata are added to the catalog and six-slot compatibility checks; `fal-5000` is a recognized factory recipe.
Read-only Arsenal V2 and the legacy V1 conversion accept the model as a rifle-class appearance without changing purchased equipment or save schemas.
The exact muzzle tip, stock contact, magazine insertion location and support grip point are registered in the existing pose/presentation systems.
For now FAL shares the proven full-length G3 **low-ready pose archetype only**; it does **not** reuse G3 geometry or mechanical animations.
FAL uses existing **legacy** reload presentation rather than incorrectly performing an HK slap. FAL magazine body and straight insertion are included in the generic choreography.
Two 1970s/1980s South African/Rhodesian visual references use the model as **representative**, not exact historical configuration.

**Important known simulation discrepancy:** The FAL 20-round part is a historically nominal *visual* magazine. The current generic rifle class still simulates only 10 rounds in `breach-combat.ts`. We **do not** fake FAL-specific capacity or silently alter every rifle. A later isolated class-to-firearm-stat migration is needed.

## Validation/release gates

1. `npm run check` must pass on the branch.
2. Run focused tests: `node --experimental-strip-types --test tests/weapon-fal-stage1-blockout.test.mjs tests/weapon-fal-stage2-family.test.mjs tests/weapon-families-01.test.mjs tests/arsenal-v2-catalog.test.mjs tests/arsenal-r13-factory-recipes.test.mjs`
3. Inspect `/fal-stage1-lab.html` using the **Stage 2 factory details** toggle, compare actual M4A1/G3A3/FAL 50.00 in the same neutral material, same camera and scale.
4. Inspect actual Arsenal two-column thumbnail and operator firing, aiming, short-stock and reload poses. No hand-in-stock, floating fore-end, visible muzzle discrepancy or missing reload magazine.
5. Confirm G3/AR/AK silhouettes, saves and Campaign/Quick Play remain unchanged.
6. **Do not merge to main or deploy** until runtime/visual approval and a stable production checkpoint.

Tests have been written and legacy preset-count expectations made additive where appropriate, but passing runtime results should not be claimed until executed by a project environment with Three.js/Vite installed.

## Deferred, not lost

Para 50.63 and Israeli Romat remain the next distinct geometry packages.
Future stages may add a meaningful historic stock finish, accurate controls/charging-handle gestures, magazines with matching simulation capacities, and sight variants, **only if they pass a visual or functional difference test**.
