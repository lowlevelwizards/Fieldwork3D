# Operator Lighting R5 – staged implementation ledger

Branch: `feature/operator-lighting-r5-hybrid-20261105`
Base: `0cf8a9f1737b1327cbb15c11b4f30e718cd73b98`

## R5.1 Studio proof (implemented)
- One real directional shadow light for the full-size operator preview.
- Fixed operator-local key direction (.46,.88,.07), explicitly fitted 3D shadow frustum.
- 1024 px default, 512 px query option; Basic hard shadows, low bias.
- Reduced hemisphere/fill, with fully reversible `?operatorLighting=legacy` preset.
- `?operatorLighting=live` diagnostic preset alongside default hybrid.
- Shadow invalidation only on outfit/geometry update, not camera/orbit.
- Shared thumbnail renderer still owns its one pooled offscreen scene.
- Focused tests and a dedicated conditional PR CI gate.

## Not yet accepted for release
- Physical iPhone screenshots comparing R4/hybrid/live.
- Dynamic shadows in gameplay (existing game scheduler remains unchanged).
- Per-piece bake architecture and a top-to-bottom gradient rework.
- No merge or Pages deploy permitted solely from this feature branch.

## R5.4-A root-relative vertical gradient (implemented)
- Shared 0–50 operator-space height curve: boots .82, lower legs .86,
  upper legs .92, shoulders .97, head 1.00.
- Applies once per actual outfit/cut key to every visible AO-enabled
  garment/gear mesh across complete operator root.
- Recomposition starts from ungraded 8-bit baseline, never cumulatively
  shades repeated wardrobe selections.
- No UV edits or IK geometry changes, and fast root stamp on pose ticks.
- Dedicated continuity/camouflage/visibility critical tests.

## Deferred from this stage
- Gradual cel shader variants and standalone texture atlases are separate
  review gates; do not imply the current vertex solution is a UV lightmap.

## R5.2-A independent self / external occlusion channels (implemented)
- Rig pouch bodies, flaps and retainers share one stable logical part ID.
- Intra-pouch self occlusion and external gear occlusion are computed as
  distinct normalized 8-bit CPU masks during the existing pre-merge bake.
- The visible result takes the stronger legitimate occlusion (no double
  multiplication); no new GPU attributes, shaders, draw calls or materials.
- Pre-merge shadow volumes now retain their part ID and semantic role for
  future attachment-graph passes.
- Focused tests check self-only, external-only, idempotence, and metadata.
- **Remaining R5.2:** atlas-backed high-resolution per-part shadow maps
  and all-gear semantic tagging; this foundation is not that complete feature.

## R5.3-A cross-assembly directional + proximity masks (implemented)
- Single overhead light for every receiver; remove mirrored fake rear sun.
- Add true short-range proximity contact behind carriers/packs and on torso,
  with .15–1.15-unit falloff and surface-facing rejection.
- Independent grayscale directional-cast and cross-contact CPU masks.
- Compose via maximum occlusion, retaining color and UV data unchanged.
- Focused tests cover rear backpack, invalid frontal contact,
  masks and repeated bake idempotence.

## Still pending
- Full attachment-zone relationship graph, arm/armpit and thigh dynamic
  receiving policies, high-resolution UV atlas proof and device screenshots.
