# G36 H2 — isolated reference-based handguard sculpture

**Status:** proposed art, isolated **review-only** study. Not integrated with Arsenal, save IDs, gameplay, current V13 stock, O3 dual optic or live H1 handguard. Do not merge H2 into the production builder automatically.

## Why H1 was rejected

After reviewing the user’s 8:57–8:58 phone screenshots from the deployed H1 handguard, the user found it still **too minimal**. H1 changed a rectangular prism into a six-corner prism, but kept a nearly featureless long box, four black rectangles across the broad middle of the side, a blunt solid nose, and no visually informative rear mounting feature. The screenshot’s full and close-up angles confirm the essential side/three-quarter identity is still missing; adding more bevels to that prism would not fix it.

The H2 study therefore **starts from new geometry** instead of modifying `g36-handguard-profiles.ts`. H1 remains live untouched and is imported into the lab for a genuine apples-to-apples comparison.

## Reference basis (visual exterior interpretation, not a manufacturing plan)

- [HKParts G36/SL8 original polymer forearm](https://hkparts.net/all-parts/h-k-g36-sl8-5-56-223-forearm-original-version/): three-quarter image clearly shows a full molded shell, a distinct front opening, side ventilation slots and a raised rear-area mounting shape.
- [HKParts original-style G36 handguard](https://hkparts.net/all-parts/h-k-g36-5-56-223-handguard-original-style-incomplete/): side image shows a vent row high near the shoulder, sloping front region, strong broad side and a separate bottom return.
- [HKParts handguard with heat shield](https://hkparts.net/hk-rifle-smg-parts/hk-g36-sl8-forearm-with-heat-shield/): underside/rear shows that real polymer handguards are open hollow shells, not solid rectangular brick fronts.
- Earlier user-provided HK G36 service rifle photographs remain the visual assembly reference; no G36C, G36K or railed aftermarket furniture is being copied.

## H2 first-pass identity grammar

### A. One visually dominant shell

Five longitudinal stations in isolated art units (rear X=0 to front X=10), never traced pixel-by-pixel from the photo:

| X | Top Y | Floor Y | Half-width Z |
|---|---|---|---|
| 0.00 | 1.20 | -1.38 | 1.34 |
| 0.45 | 1.48 | -1.58 | 1.50 |
| 7.90 | 1.48 | -1.58 | 1.50 |
| 9.20 | 1.43 | -1.54 | 1.44 |
| 10.00 | 1.06 | -1.32 | 1.30 |

Each station uses eight *meaningful* landmarks: broad roof corners at 76% half-width; diagonal shoulders near the top; broad flat sides through most of the height; lower returns; and a flat floor at 79% half-width. The long side is flat, the nose is decisively clipped, and the rear transitions into a broad lower root. These are **silhouette planes**, not a tessellated cylinder.

### B. Front open mouth

The front is a real annular rim (not a painted dark square). The opening follows an eight-sided silhouette inset about 33–37% from the outer contour. Its interior throat is shallow, leading to one dark, slightly recessed backing surface. No barrel, attachment socket geometry or internal weapon mechanisms are modeled in this cosmetic art study.

### C. One raised landmark

A single chunky rear-area lug/boss with a small visible hole. Its purpose is silhouette/recognition at mobile scale. It is one extruded shape; no fastener stacks, bolts or control details.

### D. High ventilation identity

Five long rounded-end dark slots on **each** broad upper side, at evenly spaced centers X=2.7, 4.02, 5.34, 6.66 and 7.98, near side Y=.53, instead of H1’s four black blocks centered at Y=.11. In the first study these are graphic markings on two sides, emitted as a single instanced mesh; true through-openings are not justified until the silhouette is approved.

### E. 100% / 85–120% width comparison

An isolated width slider varies transverse volume without moving its side/longitudinal length. Each of the three secondary elements (front mouth, rear boss, vents) can be independently toggled. Evaluate main shell alone first; then add one element at a time.

## Reviewer acceptance (before any live integration)

- H2 must differ *substantively* from H1 even with vents, boss and mouth disabled: heavier body, broader shoulders, better front and underside planes, stronger original molded-polymer silhouette.
- H1 baseline comes from the actual live builder geometry with H1 four-vent atlas silhouette reproduced for honest side comparison.
- Side, opposite, three-quarter, front, top and 64/128px views in the same orthographic camera; browser screenshots attached by the H2-only workflow.
- Prioritize proportions and recognizable forms over exact physical manufacturing measurements.
- User will review an H2 study before we replace H1. H1 is intentionally unchanged in production.

## Implementation location

- `src/weapons/geometry/g36-h2-handguard-study.ts`: self-contained Three.js study geometry
- `g36-h2-handguard-lab.html`, `src/g36-h2-handguard-lab.ts`: standalone interactive H1/H2 WebGL preview
- `tests/weapon-g36-h2-isolated-study.test.mjs`: mesh identity, contour, independent toggles, true front rim, unchanged live H1
- `vite.config.g36-h2.ts`: H2-only Vite bundle; separate from the production Pages entry list
- `scripts/smoke-g36-h2-study.mjs`: real WebGL side/quarter/front/top/opposite/mobile and toggle screenshots
- `.github/workflows/g36-h2-isolated-study.yml`: test and capture only, **no deployment**

**Next review question:** Is the fundamental chunky shell / front mouth / high vent row the right shape language, or does the lower-body silhouette need another rebuild before any production integration?

---

## H2.1 revision — 2026-11-17 — approved next study brief, not yet approved for factory

The user reviewed H2 and requested **strongly angled front AND rear** and a return to **fewer, bigger, more graphic vents**. The above H2 values document the superseded initial study for comparison. The following H2.1 table is now authoritative.

### H2.1 S1 — terminal angle and stable center

| Station | X base | Roof Y | Floor Y | Half-width Z | X roof lean | X floor lean |
|---|---:|---:|---:|---:|---:|---:|
| Rear root | 0.00 | +0.95 | -1.12 | 1.30 | +0.62 | 0.00 |
| Rear-main | 1.25 | +1.50 | -1.62 | 1.52 | 0.00 | 0.00 |
| Full center | 7.75 | +1.50 | -1.62 | 1.52 | 0.00 | 0.00 |
| Front transition | 8.80 | +1.39 | -1.46 | 1.45 | 0.00 | 0.00 |
| Angled nose | 9.85 | +0.81 | -1.01 | 1.31 | -0.26 | +0.15 |

The **rear top plane terminates at X=0.62 and rear floor at X=0.00**; the **front top stops at X=9.59 while the bottom lip extends to X=10.00**. These are actual non-perpendicular end planes; changing only the ring heights would have retained flat cutoff faces. Upper and lower envelope gradients make one strong slope at each end, and the entire X=1.25…7.75 (65% of the total 10-unit length) remains fully broad and parallel. Five stations and eight landmarks each are retained, but with only clear silhouette planes, not a smoothed tube.

### H2.1 S2 — four enlarged graphic side vents

Replace the H2 five small rounded vents (center X=2.70, 4.02, 5.34, 6.66, 7.98; dimensions 1.0×0.23) with **four bold slots per side**:

- Centers: X=**2.50, 4.27, 6.04, 7.81**.
- Size: **1.32 long × 0.40 tall**, upper-side center Y=**+0.43**.
- Squared-off profile with a tiny corner radius 0.045, not obvious rounded pill ends.
- Dark matte graphic marks, one instanced mesh for both sides (8 instances total). No vent trim, through-cut mesh, rivets, or frames.
- Layout has 1.84 units rear margin from X=0 before first vent, and 1.38 units of front margin from last vent to terminal base X=9.85. Equal center spacing 1.77 units, leaving a substantial 0.45 unit break between slots.

### H2.1 S3 — detail restraint

Keep the existing one raised rear lug with a small six-sided hole, without added screws/seams. The front mouth remains an actual **eight-sided recessed opening**, but remove the extra inner ring: it now has one large angled annular rim, with one dark face 0.272 units behind the outer angled nose. No fake technical detail.

### H2.1 S4 — review and test gate

- Reuse isolated H1/H2 comparison and five camera presets; mobile 390px capture, plus 64/128px thumbnail views, standalone HTML study build.
- New tests specifically enforce both inclined termination planes, floor/roof slope directions, central 65% flat width/height, four high vent centers/sizes/spacing, two-sided instancing, one front rim, and untouched deployed H1.
- The updated viewer names **H2.1** and the vent control **four bold upper vents**. Original H2 screenshots are superseded for aesthetic decisions.
- **Do not integrate or merge H2.1 into live factory** until user reviews the H2.1 screenshot/viewer. The existing PR remains draft and study-only; the actual H1 Arsenal model, O3 optic, V13 stock, gameplay, saves, stats, and material palette are unchanged.

### Acceptance criteria

A side view, with vents/lug/mouth disabled, should still clearly show a down-sloping angled nose and a rear wedge instead of two vertical brick ends; top and bottom contours should visibly converge toward both ends. With the four high vents enabled, the read must be large graphic slits, not five repeated tiny slots. The opened front must remain a single bold sculptural shape when viewed three-quarter. If any criterion is only readable at zoom but disappears at 64px, iterate the isolated study instead of adding details.
