# Glock family G1 — miniature visual-art lock (2026-11-19)

**Status:** Feature-branch appearance previews pending actual desktop/mobile WebGL visual approval. This document does **not** claim an equippable secondary weapon, measured deployment success, or exact service provenance.

## Scope
Build real low-poly Three.js external models of G19 Gen 3, G26, G19X and G19 Gen 5 MOS, and show them in the existing standalone Arsenal page as **appearance-only 3D references**. Do not use SMG/primary weapon gameplay classes to simulate handguns. Do not issue equipment, modify ammo, persist fake pistol recipes or change existing weapon art.

## Source and style contract
- Follows [Universal Weapon Art & Production Standard](weapon-production-standard.md), with approved 870 and G36 simplification lessons.
- Authentic **family silhouette**, not a fabricated mechanism or scaled engineering model.
- Four salient silhouette masses: blunt slide; shallow continuous dust-cover frame; strongly raked grip joined to frame; a single truly open rectangular trigger guard.
- Trigger guard is **present** for pistols although rifles commonly omit it: the large empty trigger gap matters disproportionately at compact sidearm scale.
- Minimal ancillary shapes: two enlarged blocks for sights; one magazine heel; at most one batched mark surface plus right-only port suggestion. No separate trigger mechanism, finger grooves, screws, rails, fake panel lines, edge glints, or high-segment rounded barrels.
- Use existing shared palette/lighting and profile primitives. No per-frame geometry or dedicated game renderer.

## Variant shape requirements
| Reference | Distinguishing anatomy |
| --- | --- |
| G19 Gen 3 | Standard compact slide, grip and matte black material baseline |
| G26 | Shortened front slide, shortened grip, no synthetic scaling of full G19 |
| G19X | Compact-length slide with distinctly longer grip and muted tan finish |
| G19 Gen 5 MOS | Compact baseline silhouette with front serration marks and optic-ready identity; a functional optic mount is **not** implied |

Factory/role exactness is not claimed by the model names. Gallery entries use their recognizably representative art identities.

## Modeling / integration
- Authoritative real geometry: \`src/weapons/geometry/glock-family-silhouettes.ts\`, \`buildGlockAppearance()\`.
- Viewer: \`src/arsenal/glock-gallery.ts\`. One lazily created WebGL renderer builds screenshots from actual geometry and uses the existing Arsenal inspection light, with side/three-quarter/opposite/clay controls.
- The preview has no physical inventory binding and is separately distinguished from primary family recipe/workbench cards. The existing family/save schema remains unchanged.
- All gun-owned BufferGeometry instances are disposed after snapshot; global shared palette materials are never disposed.
- Slide is separately named and marked for later action animation; no slide animation, draw/holster, reload or hand-contact contract is introduced by G1.

## Acceptance and release gate
- Pass focused \`tests/weapon-glock-family-art.test.mjs\`, TypeScript and production build.
- Validate **actual** desktop/mobile Arsenal snapshots, specifically right/left three-quarter, clay side profile, 64/128px readability, actual open hole, grip seam, G26 handle and G19X long grip.
- Compare to existing actual 870 and compact MP5K (not the concept sketch) under native model-scale presentation.
- Do not call visually approved from tests alone. No main merge while an older production deployment remains pending. Verify public Pages serves expected build hash after merge.

## Future work (separate scope)
A true \`secondary\` weapon class, sidearm ownership/holster, safe and typed magazines/capacity, draw/holster states, shoulderless hand contacts, pistol reload poses, accessories and workbench configuration require an independently reviewed gameplay/interface migration. Current four appearances must not pretend to deliver those capabilities.


## G2 Fieldwork Proportion Reset (2026-11-19) — replacement art contract

**Reason:** Actual user-reviewed G1 Arsenal captures showed a slide too long/thin,
a pencil-like grip, weak frame/dust-cover relationship and a dangling box guard.
The closest Fieldwork neighbors (compact HK/MP5K, AK and R870) communicate
identity through a few BIG, connected volumes, not firearm-realistic ratios.
G2 deliberately restores the miniature language. Human aesthetic sign-off
remains pending the updated native WebGL comparison screenshots.

### Absolute G2 art datums (visual units, not weapon manufacturing specs)

| Anatomical landmark | G19 Gen3 / Gen5 MOS | G26 | G19X |
| --- | ---: | ---: | ---: |
| Slide rear X | -8.17 | -8.17 | -8.17 |
| Slide nose X | 7.52 | 5.10 | 7.52 |
| Slide bottom/top Y | .34 / 3.24 | .34 / 3.24 | .34 / 3.24 |
| Slide half-depth | 1.575 | 1.575 | 1.575 |
| Polymer half-depth | 1.36 | 1.36 | 1.36 |
| Grip heel Y | -7.22 | -5.73 | -8.20 |
| Grip heel rear/front X | -7.76 / -3.52 | -7.49 / -3.70 | -7.78 / -3.54 |
| Trigger-guard opening X | -2.37 to .87 | same | same |
| Trigger-guard opening Y | -2.94 to -1.93 | same | same |

**Intended G19 changes versus G1:** slide length ~18.8 to 15.69 art units
(about 17% shorter); height 2.16 to 2.90 (about 34% taller); depth 2.45
to 3.15 (about 29% thicker). Grip heel rises from -8.50 to -7.22
(roughly 15% shorter in the side view) and grows broader at the heel.
These values are identity exaggerations. No local scale transform shortens
the G26 or lengthens the G19X: every variant has its own authored profile.

### Positive shape and negative space
1. One **blunt low-vertex slide** with tiny nose bevels, separate named
   transform identity for future moving slide. Oversized slide-height and
   depth are intentional relative to the gun's shorter length.
2. **One connected polymer shell** for frame, raked grip and trigger-guard
   perimeter, not stacked boxes. Its one real 3D aperture must remain empty
   under all views. No floating frame wedge, duplicated handle, or
   independently drawn dangling guard.
3. One blunt magazine heel, two small enlarged sights; one optional
   batched shallow serration mesh, plus at most one MOS appearance inset.
4. **No ejection-port rectangle** in G2. No micro trigger, finger grooves,
   screws, top rails, extra guard trim, specular accents, model-specific lights
   or material-colored geometry used to rescue silhouette mistakes.
5. G26 is short and squat; G19X remains distinctly fuller without the
   long thin handle; Gen5 MOS remains compatible with the compact silhouette.
   Its shallow top inset denotes an *appearance cue*, **not** an optic mount.

### Mesh economy / audit
Factory G2 appearances target five primitive meshes in clay (slide, integrated
polymer body including guard opening, magazine heel, two sights), six with
batched serrations, seven only for the MOS top identity. Automated checks
measure actual emitted triangles with a review ceiling of 220 and validate
the 3D trigger opening via geometry raycasts. This is deliberately stricter
than the generic rifle budgets while preserving the pistol's essential hole.

### Arsenal presentation and peer comparison
- Hero/card screenshots come from the identical real Three.js builder with
  the shared Arsenal material/lighting profile. Pistol-specific close-fit
  distance and 2:1 viewport fix the prior distant long-rifle crop.
- Side, three-quarter, opposite and clay remain available.
- **MP5K PEER** mode renders the existing actual MP5K model and Glock
  with one shared camera and art-unit scale. This is an honest provisional
  art-size comparison, **not** a claim of final in-operator physical scale,
  because playable secondary rig/pose authority does not exist yet.
- Compare at desktop and mobile, actual tactical/Arsenal pixel sizes, and
  64/128px; inspect rear slide thickness, grip/guard negative space and
  G19X/G26 differentiated proportions. Only visual review may certify art.

### Protected integration
G1 appearance-only IDs remain stable; no old weapon family, primary weapon,
ammunition, inventory, simulation or save schema is migrated. This release
does **not** add functional pistol/holster/secondary interactions. Keep
separate stages for that future system.
