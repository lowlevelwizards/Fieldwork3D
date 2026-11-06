# Breach operator gear: receiver-first baked shadows R4
**Release strategy:** isolated feature branch, staged commits, one grouped release when green and Pages is idle.
**Objective:** make dark, crisp, geometry-registered inter-layer shadows clearly visible at phone Studio zoom and normal game zoom, *without* darkening entire carrier surfaces or changing camouflage artwork, operator silhouettes, or runtime draw calls.

## Current defect diagnosis (verified in source)
1. `applyOperatorVisualKit()` only calls `bakeCastOnGear` on the selectable armor, rig, optional packs, and `clothTorso` groups. The actual main under-uniform receiver is `baseTorso` created by `block(chest,...cloth)` in `breach-operator-rig.ts`, **outside** those groups. Armor-over-uniform therefore never shades the most important surface. Remedy: pass and retain that exact mesh in `OperatorVisualKit` and light it as a receiver.
2. `garmentBoxUV()` currently segments an ordinary fabric cuboid only 2×2×2. Custom fitted armor bags/bands often use even fewer vertices. The existing R3 caster rays only evaluate vertex locations and cannot create crisp shadow features between those locations. Remedy: refine only *static* receiving surfaces based on triangle edge length; never change physical silhouettes, IK limbs, pattern UVs, or materials.
3. R3 computes a binary ray-hit average, with a 2.75-world-unit reach and a .36 shadow coefficient, but does not weight shadows by **distance from caster**. Remedy: compute actual ray entry depth, give strong near-contact occlusion within ~0.75 units and smooth taper to zero beyond 2.0–2.6 units.
4. Saved pre-merge caster bounding boxes are available via `fieldworkShadowVolumes`, but some large merged meshes may approximate their individual flaps/straps. Preserve per-part bounds and keep existing visibility/fit safeguards.

## Physical directions / receiver rules
**+X is operator front**, ±Z shoulder sides, +Y vertical.
A front strap/pouch can shadow the +X carrier face. A carrier can shadow the +X uniform chest. Lower pouch flaps shadow the pouch body and attachment face below. Collars shadow the neck, which already uses a separate grayscale map. Backpacks shadow the -X upper back and straps shade the upper shoulder, never the operator's full rear body.
Use the same fixed slightly forward overhead virtual light for all materials. The source mesh must lie on the positive light-facing ray from the receiving surface. Do not draw fake decals on top of the caster.

## Bake math
For receiver position `p` and local outward normal `n`:
- Transform to chest-local coordinates once.
- Start ray at `p + 0.045*n` to avoid self-intersection.
- Trace 3 tightly clustered fixed-key rays against *individual* source boxes, using slab entry distance `t`.
- Reject shadow if no box intersection, if ray leaves receiver (n·light ≤ 0.02), if t ≤ 0.04, or if caster is outside the family-specific reach.
- Near-contact strength `k(t)=0.48 * (1-smoothstep(0.35,2.25,t))`; weighted three-ray mean.
- Preserve existing construction AO. Multiply the **baseline** grayscale once by `(1-k)` and the subtle local gradient `(1-.035*lower)`.
- Retain luminance floor ≥0.59 for camouflage readability; never compound bakes on repeated appearance selections.
- Keep **exact authored camouflage RGB and UVs**. Only neutral AO vertex color attributes change.
- Per-part contact within a rig: preserve locally baked seam/cavity AO and improve geometric samples in big pouch bodies and lips, not giant diffuse field masks.

## Receiver precision / budgets
Refine **only static armor shell, rig shell, and underlying torso/collar receiver meshes** *after construction and before lighting*, not articulated arms/legs. Use selective barycentric triangle splitting with a maximum geometric sample spacing of ~0.95 world units on large receiver panels (a few screen pixels at enlarged Studio view); skip already-small triangles.
- Preserve original vertex position surface exactly, UVs, normals, material IDs, color/print channels and bounding box. No new visible meshes, no change in outfit geometry.
- Retain the same mesh count/draw-call consolidation.
- Limit subdivision to 10 subdivisions per triangle and 8,000 vertices per static group. A uniform torso max ~3,500 vertices. If a budget would be exceeded, choose a coarser safe threshold; log a nonfatal diagnostic.
- **IK safety**: leave one-unit animated arm and leg geometry and metric camouflage UV scaling untouched. Run all previously added Clothes Only tests.
- Compatible with indexed and non-indexed buffers, including custom armor bags/strap strips; normalize attributes and preserve normalized 8-bit grayscale color. Skip meshes with unsupported skinning or instancing.

## Stage implementation
**Stage A — wiring + spec**: add base torso receiver to `OperatorVisualKit`, cast armor/rig shadows on its visible cloth, and correct exclusion/visibility/pack policies. Save formal bake parameters here. Commit.
**Stage B — precision**: add geometry refinement module with unchanged world-space positions/UV and existing draw-call merges; apply selectively on base torso, armor and rig receiving faces before casting. Add low-cost caps. Commit.
**Stage C — physically directed shadow contrast**: adjust ray entry weighting and directional/local contact parameters, improve shading for straps/pouches/armor lips and keep broad gradient restrained. Commit.
**Stage D — focused visual/test gate**: test (a) a separate strap actually shades a carrier *underneath it* while free panel stays bright; (b) an armor carrier shades the real base uniform mesh; (c) pouch flap separation and lower edge; (d) boonie/helmet face stays correct; (e) solid Nutria, UCP, OCP and dense camo preserve pattern; (f) Clothes Only/IK non-distortion and frame-time/memory budgets. Capture mobile front, side, back renders. Commit.

## Acceptance / hold points
- On plain brown P83: the lower 1–3 screen pixels of pouch lips/bodies and shoulder strap attachments show darker recesses; front carrier faces remain close to their original color elsewhere.
- On UCP: visible lower and side contact shade behind at least two front pouches and under both strap landings at Studio zoom; uniform fabric under armor hem is darker than the exposed uniform.
- On OCP or French CCE: woven print remains readable and **not** replaced by large muddy dark blobs.
- On boonie/PASGT: brow shadow persists but lower cheeks are not darkened.
- Changing solid color or camo must not rebuild a per-print lightmap or change shadow geometry.
- No new lights, real-time raycasts, per-frame shade rebuilds, collision meshes, workflow queue piles, or newly visible shadow decal meshes.
- Critical tests, typecheck+production build and at least one mobile true screenshot capture must pass before merge.
- Stage commits remain on this branch; merge only one compatible batch at a checkpoint; verify prior Pages success/served build before merging and verify the new live build stamp afterwards.

## Unavoidable limitation
Baking onto vertex colors on procedural low-poly parts is not identical to a per-texel UV lightmap. Even with selective receiver refinement, minute 1-pixel creases on unrefined sloping geometry may remain under-sampled. If the phone captures do not satisfy the criteria, the *next* version should use native Three.js second-UV lightmaps per equipment family; do not mask failure by globally boosting darkness.
