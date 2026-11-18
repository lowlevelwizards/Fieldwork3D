# G36 compact family — curated release specification

## Intent / hard exclusions
Build exactly **4 factory presets total**: preserved `g36-service` plus `g36-k-dual`, `g36-c-classic`, and `g36-ka4`. Keep the single-scope carry-handle as a selectable receiver/top assembly part, **not** a fifth preset. Do not introduce G36V, G36KV, A1/A2/A3, support/launcher variants or visual duplicate muzzle SKUs.

## New parts (8 essential + 1 optional)
- K: `g36-barrel-318`, `g36-handguard-k`
- C: `g36-barrel-228`, `g36-handguard-c`, `g36-rail-receiver`, `g36-stock-short`
- K A4: `g36-handguard-k-rail`, `g36-stock-adjustable`; reuses K barrel + C flat rail
- Optional: `g36-single-receiver` removes only the original upper reflex housing/lens, retaining lower magnified optic and carry handle. No extra factory preset.

Original 6-slot service part IDs remain immutable. Existing smoked polymer magazine, magazine coupling marks, receiver, SEF legibility, V13 frame stock, O3 integrated dual optic and 30-round proprietary feed remain the master.

## Geometry (Fieldwork stylized coordinates; not fabrication dimensions)
- Original: guard front 13.45, muzzle 19.50, outer stock -15.05. Original 476 triangles / 23 meshes.
- K: guard front 11.00, muzzle 15.50. The shell shares H3's six-point front/back solid 3D section; existing atlas renders three untrimmed side vent impressions.
- C: guard front 8.80, muzzle 12.15. Same H3 section; two visible vents; flat roof bridge and two folding iron posts.
- Modern K: K front shell plus one actual upper, lower and bilateral support rail. Corresponding PartMountInterfaces are backed by matching physical mount surfaces and 3D geometry; no imagined rack or accessory faces.
- Short skeletal stock compresses only V13 frame and buttpad X about the original hinge. Adjustable folding stock adds a large simple cheek rest and buttpad, using original hinge.
- Reuse the R3 eight-corner tapered flash-hider *grammar* with correct endpoint, and project its existing pooled atlas UVs along the shorter body. Never scale the receiver.
- All variants preserve common operator grip/magazine control, 5.56 receiver, charging tab and SEF glyph positions.

## Gameplay/handling integration
- `resolveWeaponAssembly` and `riflePoseContacts` share the length-specific front and contact extents with the visual builder, so both muzzle and support hand follow the actual front shell.
- Original G36 retains exact preexisting contact `4.15+.65` and `13.45-1.35`, its sight height and original gameplay data.
- `g36-rail-receiver` exposes physical picatinny optic positions. Dual/single optics cannot accept duplicate detachable sights. Rail front `g36-handguard-k-rail` enables mounted foregrips/lights where built.
- A factory default flat bridge uses irons; single-scope and dual-scope configurations have distinct fixed optic metadata, no fake scope.
- Presets are selectable for the appropriate existing gameplay class without migrating a carbine into a rifle or inventing a seventh save slot.
- Magazine capacity, feed and ammo definitions unchanged; no automatic campaign equipment ownership changes.

## Release gate
- New tests: `tests/weapon-g36-family-variants.test.mjs` assert exact 4 presets, original R6 476/23 census and unchanged save, K/C geometry endpoints & support datums, KA4 rails and selector, and single-scope option.
- Include original R6 and all historical G36 regression tests in dedicated real WebGL audit. Run Arsenal M2/M3 mounting + resource and Ground Zero critical checks.
- Merge only after latest main Pages deployment verified and no active production release; verify public Pages build stamp matches merge commit.
