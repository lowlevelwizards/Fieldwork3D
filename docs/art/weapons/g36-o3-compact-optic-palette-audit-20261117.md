# G36 O3 — compact integrated dual optic + complete factory palette audit

**Scope:** production `HK G36 · Original Dual Optic` only, directly following approved O2 and V13 stock, based on user's 2026-11-17 in-game side, rear-quarter and close-up screenshots compared with the attached reference photographs. This is an exaggerated **interpretation**, not a manufacturing diagram or a separate reference/lab mesh.

## Stage-by-stage changes and exact target numbers

| Stage | Before O2 | O3 production | Required reason |
| --- | --- | --- | --- |
| S1: main X length | 4.95 (-5.83 to -0.88) | 4.33 (-5.83 to -1.50), -12.5% | stubby pod, not stretched through handle |
| S1: upper hood X length | 3.00 (-5.57 to -2.57) | 2.43 (-5.57 to -3.14), -19% | visibly compact secondary housing |
| S1: ocular projection | lower 0.62, upper 0.43 | lower 0.51, upper 0.30 | big lenses, fewer projecting rings |
| S2: upper hood crown | 4.70 | 5.03 | upper module stands proud above lower housing |
| S2: upper ocular center | 4.30 | 4.54 | clear stacked rear optical apertures |
| S2: upper hood base | 3.68 | 3.94 | retain slight housing interpenetration, not two floating optics |
| S3: lower housing rear bottom | 2.69 | 1.94 | optically continuous into handle's rear root |
| S3: lower housing front bottom | 2.69 | 2.24 | subtle underside rise, still one rectangular molded body |
| S3: lower housing roof | 4.08 | 4.12 | short broad roof, overlaps upper hood at 3.94 |
| S4: primary cross-sections | six each with subtle front taper | six each, same width front/rear | broad graphic planes without incidental micro-tapers |
| S4: lens faces | one dark circle each | one dark circle each, retained | no concentric glass overlays, ribs, screws or dials |
| S4: mesh/triangle gate | at most 22 / 600 | unchanged caps | no extra decorative geometry |

The O3 optic crown art landmark `G36_B_ART.opticTopY` is 5.03, while the functional sight datums `G36_E0_FACTORY.lowerSightY=3.57` and `upperSightY=4.46` remain **unchanged**. This is deliberately a visual-only change. Historical P6/P7 comparison shapes continue using their original 4.70 art height in the comparison lab and are not altered/saved as production variants.

## S5: full G36 scoped finish audit

| Component group | Finish token | RGB hex | Roughness / Metalness | Why |
| --- | --- | --- | --- | --- |
| Receiver upper/lower, stock frame, grip, carry handle, handguard, main and upper optical shells | `g36-polymer` | `#3B423E` | 0.96 / 0.012 | common charcoal green-gray silhouette, slightly more legible than dark legacy HK polymer |
| Optical sleeves / ocular rims only | `g36-optic-rim` | `#303832` | 0.96 / 0.012 | low-contrast inset differentiation, not a metal scope |
| Both eyepiece faces | `g36-lens` | `#141C18` | 0.99 / 0 | near-black, intentionally matte graphic circles; no transparency, reflections, glass shaders |
| Buttpad, selector hardware | `g36-rubber` | `#252D29` | 0.99 / 0.005 | subtle soft-black details, not spotlighted |
| Magazine | `g36-smoked-mag` | `#525F59` | 0.95 / 0.008 | restrained, opaque smoky-polymer identifier; existing broad pixel atlas retained |
| Charging handle / hinge / barrel | existing `hk-steel` | `#3E4441` | 0.82 / 0.12 | muted exposed metal, no contrast exaggeration |
| Muzzle | existing `hk-muzzle-metal` | `#2F3533` | 0.78 / 0.16 | restrained dark muzzle |

The material palette is scoped to G36: `hk-polymer`, HK33/G3/MP5 and other family palettes remain untouched. G36-specific materials use the global `weaponFinish` signature cache (no per-render material allocations). All surfaces are opaque and use existing flat shading; no textures were added. G36's existing 384×192 atlas continues to serve vent, ejection and magazine marks. Real Arsenal adapter and G36 lab use the *same* palette.

## Release acceptance

1. **S1:** Factory main and hood X dimensions, preserved 125% transverse bulk, short eyepieces, rear mounting datum.
2. **S2:** upper ocular stays visibly above the main lower roof; hood is visibly proud; functional aiming datums unchanged.
3. **S3:** lower housing intersects real carry-handle root while original physical handle opening at (3,2.58) remains open and top roof (3,3.65) remains solid.
4. **S4:** exactly six outer cross-section facets per shell, 8/6-sided short ocular sleeves, one dark circle each, no additional microhardware, meshes <=22 and triangles <=600.
5. **S5:** verify real *factory adapter* surfaces, no global HK recolor, opaque magazine, shared/pool-based material identity; full scope color labels and measured color code above.
6. **S6:** run exact-head G36 focused tests, Ground Zero, Arsenal browser and production visual/build; compare side, quarter, front, opposite and 64px/128px in actual WebGL captures; reconcile main before merging; allow new Pages deployment only after the previous completed and public served-build stamp matches.

## Deliberate exclusions

No equipment choice changes, new attachment slot, stat/balance change, reticle work, optics FOV changes, hit geometry, sight calibration or pose/contact migrations. No further stock modification; the V13 rear silhouette remains approved.
