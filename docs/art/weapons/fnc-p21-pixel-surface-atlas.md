# FN FNC P21 — pixel detail atlas replacing surface-decoration meshes

## Goal
Demote the right-side receiver operating/ejection slot, receiver seam and stamp, lower-polymer handguard grooves, and 12 gas-cover vents to **actual authored low-resolution texture pixels** while keeping the real 3D masses, stylized material palette and physical silhouette.

## Implementation
- `src/weapons/geometry/fnc-pixel-details.ts` creates one lazily shared **512 × 256 RGBA8 DataTexture**, with six authored mask regions + an untouched white region. 128×128 tiles preserve independently tunable right/left receiver, handguard and gas roof/side pixel motifs.
- Each mark-bearing mesh receives deterministic **existing-triangle local UVs** (triangle outward-facing normal chooses side or roof). No geometry additions, no independent mark objects, no per-frame allocations, no custom shader patch or Canvas/DOM dependency; nearest filtering, clamp edges and sRGB color space.
- The atlas is **white outside authored marks**, so the existing shared steel/polymer colors and real scene lighting remain intact. Dark blocks multiply those existing base colors rather than emitting unnatural unlit overlays.
- Materials are cloned **once per original material** into a cached pixel-mapped variant. The original HK/FAL/AR palette remains unmodified. The same atlas is shared across factory, alternate-magazine, scene rig, Workbench and laboratory renders.
- Receiver upper has the right-side connected ejection slot, lower has seam on both sides and stamped graphic on right only. Polymer body holds two long molded-groove strokes per visible side. Gas cover has exactly four side vents on each side and four on the top.
- The big receiver and handguard, stock, front sights, metal gas spine, real charging lug, shared STANAG magazine, barrel and muzzle stay physical.

## Deleted construction
- P20's 5 batched handguard/gas mark meshes: left/right longitudinal lines, left/right four-vent strips, top four-vent strip.
- 3 extruded receiver graphics: seam, stamp and operating slot.
- **No dummy transparent decals or replacement planes**: surface graphics exist only in the shared atlas on the existing solid geometry.

## Verification
Run focused P21 pixel tests and all prior FNC silhouette/family tests, TypeScript, Vite build and real WebGL comparison/mobile Arsenal renders. Test:
1. Actual atlas texels at center and blank positions (including top/left/right vents, right-only stamping).
2. UV and material binding on the correct four solid meshes, untouched original material, all removed mesh names absent.
3. Stable magazine capacity/AR geometry, muzzle and stock endpoints, suppressor path.
4. Real GPU triangles/meshes using the existing production `audit-weapon-geometry.mjs`, compare against P20's **588 triangles / 32 meshes**. This conversion must reduce triangles and meshes, not only relocate aesthetic metadata.
5. Nearby FAL/G3/AR production geometry unaffected.

No release while previous Pages publication is pending or CI/browser captures fail.
