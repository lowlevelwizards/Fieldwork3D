# G36 compact family — curated release specification

## Intent / hard exclusions
Build exactly **4 factory presets total**: preserved `g36-service` plus `g36-k-dual`, `g36-c-classic`, and `g36-ka4`. Keep the single-scope carry-handle as a selectable receiver/top assembly part, **not** a fifth preset. Do not introduce G36V, G36KV, A1/A2/A3, support/launcher variants or visual duplicate muzzle SKUs.

## New parts (8 essential + 1 optional)
- K: `g36-barrel-318`, `g36-handguard-k`
- C: `g36-barrel-228`, `g36-handguard-c`, `g36-rail-receiver`, original `g36-stock` (compact stock remains custom/legacy only)
- K A4: `g36-handguard-k-rail`, `g36-stock-adjustable`; reuses K barrel + C flat rail
- Optional: `g36-single-receiver` removes only the original upper reflex housing/lens, retaining lower magnified optic and carry handle. No extra factory preset.

Original 6-slot service part IDs remain immutable. Existing smoked polymer magazine, magazine coupling marks, receiver, SEF legibility, V13 frame stock, O3 integrated dual optic and 30-round proprietary feed remain the master.

## Geometry (Fieldwork stylized coordinates; not fabrication dimensions)
- Original: guard front 13.45, muzzle 19.50, outer stock -15.05. Original 476 triangles / 23 meshes.
- K: guard front 11.00, muzzle 15.50. The shell shares H3's six-point front/back solid 3D section; existing atlas renders three untrimmed side vent impressions.
- C (Nov 18 second visual follow-up): guard front 10.10 (previous 9.65, initial 8.80), muzzle remains 12.15; same 6-facet H3 shell with unchanged strong nose rake; two complete rescaled atlas vents. The compact-specific low rail spans -5.855..7.695 at tooth top Y=1.96, with seven broad teeth batched into one mesh. Two low, tapered integrated sights replace the block posts (front centre 7.00). K A4 retains its previously approved rail geometry and Y=2.225.
- Modern K: K front shell plus one actual upper, lower and bilateral support rail. Corresponding PartMountInterfaces are backed by matching physical mount surfaces and 3D geometry; no imagined rack or accessory faces.
- The factory G36C now reuses the unscaled, approved V13 two-opening folder from G36/G36K. The previously released short skeletal stock is retained as an optional/legacy saved part, but no longer appears on a factory preset. Adjustable folding stock adds a large simple cheek rest and buttpad, using original hinge.
- Reuse the R3 eight-corner tapered flash-hider *grammar* with correct endpoint, and project its existing pooled atlas UVs along the shorter body. Never scale the receiver.
- All variants preserve common operator grip/magazine control, 5.56 receiver, charging tab and SEF glyph positions.

## Gameplay/handling integration
- `resolveWeaponAssembly` and `riflePoseContacts` share the length-specific front and contact extents with the visual builder, so both muzzle and support hand follow the actual front shell. Compact muzzle endpoint stays 12.15 and the rear shoulder contact uses the original stockX -15.05.
- Original G36 retains exact preexisting contact `4.15+.65` and `13.45-1.35`, its sight height and original gameplay data.
- `g36-rail-receiver` exposes physical Picatinny optic positions on the real bridge span: C -5.855..7.695 at top Y=1.96, K A4 -5.855..6.295 at top Y=2.225. Dual/single optics cannot accept duplicate detachable sights. Rail front `g36-handguard-k-rail` enables mounted foregrips/lights where built.
- A factory default flat bridge uses irons; single-scope and dual-scope configurations have distinct fixed optic metadata, no fake scope.
- Presets are selectable for the appropriate existing gameplay class without migrating a carbine into a rifle or inventing a seventh save slot.
- Magazine capacity, feed and ammo definitions unchanged; no automatic campaign equipment ownership changes.

## Release gate
- New tests: `tests/weapon-g36-family-variants.test.mjs` assert exact 4 presets, original R6 476/23 census and unchanged save, K/C geometry endpoints & support datums, KA4 rails and selector, and single-scope option.
- Include original R6 and all historical G36 regression tests in dedicated real WebGL audit. Run Arsenal M2/M3 mounting + resource and Ground Zero critical checks.
- Merge only after latest main Pages deployment verified and no active production release; verify public Pages build stamp matches merge commit.

## Nov 18 G36C visual correction and acceptance
User screenshot review preferred more fore-end polymer relative to exposed barrel and the approved full V13 folding stock rather than a squeezed stock. The compact guard grows about 17% from its previous modeled length (rear floor 3.75; old front 8.80, new front 9.65) with no change to barrel/muzzle or the G36/K/KA4 fore-end. Two large side ventilation impressions remain fully inside the C shell via UV-only re-projection in the pooled G36 atlas; no additional materials, draw calls or saved slots. The forward compact rail and backup sight follow its new proportion and mount interfaces report the same drawn physical span. Historical short-stock saves remain readable. The C factory preset uses the original approved folding stock and folding behavior. Focused family, mounts, visual and Pages release checks gate the release.

## Nov 18 second visual follow-up: compact-only low sight rail
Real HK early G36C catalogs distinguish the low-built Picatinny rail with deeply integrated sights from elevated folding sight options. The prior factory C in-game bridge was a broad 0.53-tall cuboid with two 0.55-tall rectangular sight blocks; at mobile scale it read as an elevated block. Replace only the C's bridge with a 0.30-tall 1.16-wide flush base and seven 0.14-tall broad teeth in one merged geometry (highest contact 1.96), plus two low tapered silhouette sights capped at 2.19. K A4 geometry remains untouched. Align only C's optical mounting Y to that real rail; all existing slots/presets/save IDs/ballistics remain. The second 0.45-unit C handguard extension narrows exposed polymer-to-muzzle separation from 2.50 to 2.05; two side vents still come from pooled atlas with no new texture. Test G36C exact extents/contact, KA4 isolation, and G36 original 476-triangle census, then pass dedicated visual CI, Arsenal mounts and Pages verification.
