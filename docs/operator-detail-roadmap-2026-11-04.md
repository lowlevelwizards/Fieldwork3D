# Operator Visual Details — staged implementation plan
Date: 2026-11-04
Branch: feature/operator-visual-details-2026-11-04
Status: D0 audit and D1 complexion/hair implementation in this release. D2 and subsequent visual work remain on their feature branch.

## Source audit (main as of 2026-11-04)
- `operator-wardrobe-data.ts` already exposes slots for facewear, eyewear, headset, footwear, gloves, beltStyle, wrist and headwear. Keep these slots, migrate saved appearances defensively.
- `operator-wardrobe-head-visuals.ts` contains prototype balaclavas, gaiter, shemagh, scarves, masks, eyewear and earmuffs. Approved main helmet shells are built through canonical -Z silhouettes; many prototype accessories remain authored in legacy +X head coordinates.
- `operator-wardrobe-data.ts` exposes only a foundation field boot and glove. `operator-visual-kit.ts` still derives foot accents from the older shared boot/shoe mesh.
- `operator-wardrobe-gear-visuals.ts` offers plain, light, duty, battle and padded belts, but most differences are superficial overlays. Keep the already stabilized torso armor and rig fits out of scope.
- `operator-visual-kit.ts` currently creates three seeded haircut shapes and picks muted hair colors by appearance seed; no authored per-person skin-tone / haircut override is in wardrobe data.
- Operator Studio already provides 3D style previews, comparison, undo, and defensive appearance persistence; extend the existing editor instead of a new mode.

## Locked constraints
1. Maintain chunky/stubby miniature proportions, approved seven headwear silhouettes and strong minimum voxel step; avoid micro-geometry noise.
2. Preserve motor, feet IK, planted foot contacts, weapon hand sockets, aiming, muzzle origin, hitboxes, injury, armor protection and inventory semantics.
3. Cosmetics never grant NVG capabilities, hearing protection bonuses, gear ownership, ammunition or carrying capacity.
4. One coordinate/fit contract per body region. Shared **head anchor** under canonical -Z forward, explicit brow/ear/temple/cheek/chin/nape/helmet-shell attachment points. Compatible forehead geometry must not float through established helmet shells. Foot, wrist and hip attachment frames attach to moving parts without shifting joints.
5. Materials use contextual solid/cloth/camo channels, no arbitrary copy of a uniform pattern onto skin/leather/hard lenses; visually discernible family before surface detailing.
6. Respect cosmetic persistence (Quick Play) vs gameplay progression (Campaign); preserve version-1 wardrobe reads.

## Stages

### D0 — shared fit and reference matrix
- Capture baseline head and full-body front, side, back, isometric and default gameplay distance, bare/clothed/armored, stand/crouch/aim/reload.
- Define model-local frame + mounting zones for face, ears, eye bridge, helmet front/side/rear, neck, ankle, wrist and pelvis.
- Build compatibility matrix: shell style x mounts x earmuffs x eye protection x mask; footwear x trouser finish; glove x rolled sleeves; belt x armor/rig.
- Review five target material families and cap voxel detail density.
- Gate: no layer movement, no outward floating, no body scale changes. Docs-only stage can be committed separately but not released alone.

### D1 — human identity: complexion + hair
- Selectable explicit skin-tone palette, seeded initial selection and overridable identity, same tone on face/neck/exposed arms/hands.
- At least six physically distinct haircut silhouettes: buzz, short crop, side part, textured short/curly, tied-back, close afro; optional quiet facial hair variants.
- Hair must tuck under shell/hat/hood using occlusion masks, not disappear merely because any hat is selected. Full balaclava covers visible hair.
- Gate: face reads at normal zoom and nothing penetrates approved headwear.

### D2 — masks/facewear + eyewear
- Separate masks and textiles: one-/three-opening balaclava, low/high gaiter, wrapped shemagh, scarf, half-face respirator, gas mask.
- Eye choices: clear, dark, protective wraparound, low goggles, parked goggles, with readable bridge/temple/strap and less coplanar geometry.
- Fit all to canonical face anchors, preserve eye and skin aperture cutouts; gas mask overrides competing goggles and microphone layouts.
- Gate: side and quarter views with each of seven headwear shapes.

### D3 — headsets and reference-led helmet setups
- Earpiece, standalone behind/over-head earmuffs, boom mic, rail-mounted earmuffs; same ear and microphone attachment rules, no absurd band through shell.
- Helmet family presets, not a new helmet family:
  * steel pot: plain, period fabric/net cover, field band/chin strap
  * PASGT: fabric cover, goggle strap/parked goggles, identification band
  * ACH/MICH: cloth-covered plain, goggle strap, NVG bracket, identification tabs, chinstrap
  * high-cut: shroud, side rails, headset adapters, rear counterweight/battery, small marker/strobe/light, optional stowed NVG
- Saved setup should contain independently compatible parts; no modern rail systems added to historical shells by default.
- Presets first, advanced slot customization second. NVG units are cosmetic only.
- Real-world reference direction: Gentex Ops-Core FAST XP / FAST Bump helmet integration and approved era examples. Original references supplied by the user should supersede generic reference imagery.
- Gate: each setup matches its shell's actual mounting surfaces and remains recognizable at gameplay distance.

### D4 — footwear family
- Distinct black leather field boot, jungle boot, tan/desert combat boot, modern tactical boot, rugged hiking boot, light low-profile shoe; bare feet remain supported.
- Real shaft height, heel/toe proportions, deep vs shallow soles, simplified lacing and materials; not generic mesh scaling.
- Respect bloused/unbloused/cuffed trousers and maintain identical foot planting/IK contacts and collision.
- Gate: both planted feet during locomotion, crouch, turns, vaults and reload.

### D5 — glove family
- Bare, thin field, fingerless, reinforced/impact, insulated, utility/work glove silhouettes.
- Cuffs, reinforced knuckles, thumb/palm color blocks, minimal stitching; both hands independently track the fixed existing weapon grip targets.
- Resolve sleeve roll/cuff and skin visibility. No glove choice alters gripping geometry.
- Gate: first-person close inspection and full-body weapon poses.

### D6 — belts and mounted accessories
- Plain clothing belt, thin service/utility, duty, battle, padded war belt; dimensional differences, real wrap around fitted garment/hip.
- Buckles, load-bearing webbing, restrained pouch and empty holster holders, optional suspenders only where physically applicable.
- Carried magazines, med/utility items and holsters must reconcile to real ledger; avoid duplicated gear and armor/pouch intersections.
- Gate: all armor + rig families with 3 trouser types and waist twist/crouch.

### D7 — authored microdetails and polish
- Intelligible patch zones, blank/team tabs, ID panels, glove/boot wear, zip/pull tabs, radio PTT, wires, small straps, watch, ID tape, minor face/hair variation.
- No automatic logo, rank, nationality or real team patches. Include quiet/no-patch choices.
- Draw-call and geometry budget per material; merge static geometry. Compare camouflage pixel density with established garment/headwear scale.
- Gate: close-up detail remains secondary to silhouette at actual gameplay zoom.

### D8 — integration and release gates
- D0-D2 can be reviewed as an identity/head-soft-goods batch; D3 as a dedicated helmet setup batch; D4-D6 as lower-body/accessory batch; D7+D8 as final polish.
- Commit completed stages separately to feature branch, merge only compatible release batches.
- Before every release, confirm prior GitHub Pages deployment completed and serves the expected commit. Do not queue multiple productions.
- Critical tests only: TypeScript/Vite build, wardrobe save/load round trip, equipment-kit cosmetics compatibility, selector smoke tests, and targeted capture diff for affected body zone.
- Manual acceptance: exposed skin continuity; face mask+goggles+headset compatibility; helmet/no-hair clipping; planted foot contacts; gloves on rifle/pistol; belts against every armor/rig silhouette; mobile default-zoom legibility.


### D2 first-wave scope lock — Nov 4
The broad D2 candidate exploration has been narrowed to **19 distinct base models** (6 fabric, 6 masks, 4 glasses and 3 goggles), plus grouped variants. Use the [D2 First-Wave Implementation Plan](./operator-d2-first-wave-implementation-plan-2026-11-04.md) as the historical first-wave D2 build specification, migration matrix, and fit/compatibility rationale; later D2 releases supersede its implementation checklist. The [broader reference catalog](./operator-d2-facewear-eyewear-catalog-2026-11-04.md) remains exploratory and reference-only.


### Release checkpoint — D0 + D1
Only D0 planning and D1 explicit complexion (10 choices), hairstyle (6 choices), and hair color (8 choices) with old seeded defaults are included. All D2 models and configuration changes remain on the feature branch. No equipment gameplay mechanics were changed.
