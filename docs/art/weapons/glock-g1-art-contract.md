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
