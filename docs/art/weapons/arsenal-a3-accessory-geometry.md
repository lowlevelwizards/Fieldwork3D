# Arsenal A3.0 — Accessory geometry and runtime inventory

## Baseline (observed on A2/main)
- Reflex: 3 separate cuboids.
- Magnified: 6 separate cuboids.
- Muzzle bare/hider/brake/suppressor: 0/1/2/1 cuboids.
- Handstop and generic vertical: 1 and 2 cuboids, respectively.
- Compact light: 4 cuboids including hidden `weapon-light-lens`.
- Sling rigid fittings: 2 cuboids.
- HK claw mount: 8 distinct box meshes (four feet, rail, three ribs).
- **Confirmed issue:** `buildWeaponSilhouette()` adds an extra MP5 tri-rail vertical grip
  while `buildWeaponAccessories()` constructs the generic grip for the same slot.
- Legacy shotgun must retain caller-owned materials, and the light lens must
  retain its unique visibility/name contract.
- Current body and accessory geometry is individually allocated at configuration
  creation and individually disposed at model teardown. Reusable *material* caching
  is established in A2. Reuse *geometry* only with explicit ownership semantics.

## Acceptance
1. Exactly one displayed accessory instance for each accepted saved attachment.
2. The muzzle device occupies the exact configured extension from the barrel tip.
3. Optic/sight origin, weapon sockets, support-hand X, flashlight emission and
   compatibility are not modified for art reasons.
4. Reduced mesh/draw-call submissions for representative full loadouts; no
   per-frame allocations or new textures/shader permutations.
5. Use actual accepted configurations in capture; never count requested-but-refused
   attachment IDs. Cover AR/AK/G3/HK33/HK53/MP5/FAL/FNC and legacy shotgun.
6. All geometry remains **per-instance owned and disposed** by existing cleanup
   until a separate explicit reference-counted cache is warranted. Immutable A2
   finish materials are globally owned and never disposed by those cleanups.
7. Keep geometry authored for stylized game visuals only; no mechanical build data.

## Stage sequencing
A3.0 inventory; A3.1 shared primitives/placement; A3.2 optics; A3.3 muzzle;
A3.4 grips/duplicate owner fix; A3.5 lights; A3.6 HK mount/sling;
A3.7 optimize; A3.8 tests and contact sheet; A3.9 release checkpoint.

## Release discipline
Commit each compatible stage on `feat/arsenal-a3-accessory-unification`.
Run only critical focused checks until batch checkpoint. Do not merge to main if
the previous Pages deployment has not verified its exact served build or if a
Pages deployment is running.
