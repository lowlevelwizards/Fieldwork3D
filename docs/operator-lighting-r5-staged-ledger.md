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

## R5.3-B semantic inter-assembly shadow graph (2026-11-06)
- Assign explicit receiver roles for armor, rig, uniform, shirt, backpack.
- Distinguish caster types for each overlapping outfit; reject invalid pairs.
- Preserve unmerged per-part roles, and exclude invisible caster alternatives.
- Each physical pairing has tuned proximity radius, contact/cast strength and reach.
- Preserve legacy untyped callers and R4 bake tests; colors/UV remain untouched.
- Remove the remaining per-mesh vertical darkening inside directional cast,
  leaving operator-height-lighting solely responsible for the lower gradient.
- Test invalid receiver rejection, rear-pack contact, restored baseline,
  hidden alternate geometry and unchanged camouflage swatches.

## R5.2-B retain per-piece grayscale lighting masks through iOS geometry batching
- Merge outputs now retain CPU-only Uint8 self/external occlusion channels,
  indexed/non-indexed vertex remapping, and per-part span metadata.
- No additional GPU attributes, shader work, materials, meshes or draw calls.
- Missing mask inputs allocate nothing; UVs and grayscale vertex-color AO remain unchanged.
- Focused tests enforce byte-perfect mapping for mixed indexed/flat meshes.
- True UV1 lightmap atlas GPU delivery remains a later visual experiment.

## R5.6-A opt-in Studio lighting diagnostic (2026-11-06)
- `?operatorLightingDebug=1` draws a small developer-only overlay.
- Report visible unique geometries, draw calls, logical part spans,
  and shaded sample coverage/max/mean per CPU self/contact/cast mask.
- A live directional-shadow toggle and shadow rebuild control allow fast A/B.
- No effect on normal Studio UI or gameplay, no GPU readback or extra draw calls.
- CPU mask inspector ignores hidden alternate kits and duplicate shared geometries.
- This is a diagnostic foundation; full per-layer compositing controls follow
  after the shader/lightmap atlas visual experiment.

## R5.3-C allocation-free geometry contact bake
- Remove per-vertex/per-caster temporary arrays from cross-gear contact.
- Move shadow-axis iteration data to a shared constant.
- Reuse vector scratch space in each fitted assembly's self AO bake.
- Preserve identical proximity/contact math, strength and geometry bounds.
- Focused tests compare the single-box loop against the legacy API across
  hundreds of positions, face normals, and three contact radii.

## R5.2-C experimental UV1 self-lightmap atlas (debug opt-in ONLY)
- `?operatorLightingAtlas=1` generates one native MeshStandardMaterial AO texture
  per currently selected merged material bucket when same-part subpieces exist.
- Exact 16px per-face texel sampling of semantic pouch body/flap volumes,
  with separate `uv1` and unchanged original camouflage `uv` and byte AO.
- Native aoMap uses a restrained .25 strength while the older self vertex
  shading remains present; NOT enabled by default due double-shading risk.
- One single-channel R8 texture, no new meshes, with 8 MiB studio debug cap
  and cleanup on material dispose; outfit color/maps synchronize with clones.
- This is a Studio A/B prototype, not a production-approved replacement;
  promote only after removing duplicate self AO and mobile performance review.

## R5.2-D actual browser atlas proof gate
- Add a narrow conditional R5 Studio smoke step to the *existing* mobile
  Studio workflow: compile WebGL UV1/AO, preview OCP Infantry reference and
  assert at least one atlas, under 8 MiB, no shader errors or blank capture.
- Screenshot captured to the existing `operator-studio-captures` artifact.
- Uses the same installed Playwright browser, no new independent workflow.
- Atlas remains debug-only; visual approval still required before default use.

## R5.2-E atlas self-shadow replacement / double-darkening isolation
- Preserve grayscale per-vertex base and composed contact values before
  rigid mesh consolidation, including mixed indexed/non-indexed remapping.
- In Studio atlas mode ONLY, remove the baked self contribution using the
  recorded source/output ratio. Preserve external contact, root-height
  gradient, camouflage UVs and cross-equipment shadow.
- Native UV1 AO intensity .85 (replaces, does not augment, isolated self).
- Idempotent correction and explicit restoration API. Default Studio and
  tactical lighting completely unchanged.
- Reject atlas if the required base/composed masks are unavailable; no
  approximate reverse-calculation of already-clamped colors.
