# D2 R16–R20: minimum-shape facewear rebuild

Date: 2026-11-05. Base main: 62796d3f986df4874a4cef1634a2f9394db7d9f2.

## Primary art requirement
D2 masks must be readable as simple chunky field miniatures at actual mobile customization and gameplay sizes. No visible triangles stretched across masked faces, no floating side plates, no skin leaks, no eye-hole loopholes, no material alpha sorting.

## Construction contract
- HEAD: unmodified 8 × 8 × 8 cubic head (-Z front, +/-X cheeks, +Y crown).
- SHELLS: authored horizontal front/cheek/corner/temple stations joined by broad quads. Each visible quad uses one explicit flat normal, never a triangulated hole and then per-vertex displacement.
- GLASS: opaque inset polygons with single thick backing frame, no real physical openings. M50 has one three-panel contiguous surface and no separate left/right eye windows.
- CHEEKS: optional overlapping low poly wedges (M17/modern filter pods) penetrate their parent shell slightly to conceal attachment seams. This is intentional cosmetic geometry.
- BANDS: wide continuous ribbons grazing the skull, not dozens of separate rods.
- GP5: a solid enclosing low-poly hood above crown through neck and one downward center canister, no rear harness.
- SILHOUETTES: M40 largest asymmetric canister; M17 visibly fullest cheeks; M50 one panoramic lens; industrial half has two lateral filters; tactical guard is shallow and low profile.
- SIMPLICITY: target <=900 mask triangles and <=35 render meshes per family, including both prebuilt half-mask modes. Reuse material roles and saved IDs, maintain lazy rig creation.
- MATERIALS: black rubber and dark gray-green lens separated by value; opaque glass with depth-writing enabled.

## R16–R20 changes
R16: new simple geometry helpers; M40/M50 pilot family. R17: GP5/M17 family. R18: both half masks preserving variant modes. R19: replace renderer factory and outdated aperture tests; preserve cosmetics. R20: add focused CI and mobile 24-angle WebGL review. All stages committed to one feature branch; no main merge per stage.

## Critical release checks
Focused D2 catalog, mode/save, geometry bounds and signature tests, TypeScript/Vite production build, mobile Operator Studio smoke and actual mobile WebGL captures. Inspect artifacts for backface culling, floating filter ports, clipping, eyewear count, clean crown and black material separation. Tests prove topology and safety, not automatic artistic approval.
Before production merge, verify previous Pages deployment's public build-stamp step has succeeded, reconcile concurrent main, and use one release checkpoint. If anything fails, stop release queue and repair the blocker.
