# V4 — stylized blood effects, performance-first
Base current main a05bd63; reconcile on released V1 before integration. No changes to shot, damage, movement, recorded impact marks, replay time or disclosure.

## Audit
Current tactical scene draws a shared 64-instance ground-mark batch (blood evidence cap 24). Blood uses flat nine-sided disks with existing confined radius, physical wall/camera occlusion and visibility gates. Current transient shot pool has up to 20 active effects with a pulse and four individual chip meshes for blood. Pool/instanced architecture must be reused, not duplicated.

## Scope
1. Replace only the blood mask inside the shared ground mark draw; preserve every nonblood mark. Use deterministic padded 4-cell 128x32 alpha atlas, position-derived variant and per-instance style. No extra mesh per stain. Use depth test and existing wall/actor occlusion; no visible alpha outside the existing confined circle. Preserve age/size/color and cap. No new simulation state.
2. Replace individual blood chip meshes with bounded shared instance batch or atlas particles, triggered solely by existing shot impacts. Stylized small droplets, no exaggerated gore. Stable shot-id and age-driven positions; no per-frame spawning or random calls. Apply existing per-particle sight and personal replay policy; don't reveal hidden impacts. Transient saturation drops cosmetic visuals only, never evidence.
3. Retain tracer and nonblood paths. Update buffers only for changed visible evidence where feasible, including seek/reset. Explicit resource ownership and disposal; no frame allocation churn.
4. Verify unchanged shot/impact evidence, cap, lifetime, deterministic seek/reorder, hidden/personal disclosure and wall clipping. Compare old and new draw counts and render CPU on identical shot stress; browser screenshots with side-by-side A/B and physical-device checks. Existing V1 target is net performance gain; do not enable V4 without measured results.
5. Prototype: pure deterministic atlas alpha generator and unit tests. No gameplay integration or CI yet; isolated branch while foundational release gates are outstanding.

## Integration checkpoint
Opt-in ?vfxBlood=1 replaces blood-only chip meshes with one 80-instance batch, using the original shot-id/age trajectory and opacity, and samples a deterministic mask inside the existing mixed mark mesh. Nonblood mark style -1 bypasses sampling. No new evidence or simulation; original personal replay/sight gates and mark culling remain in place. Persistent scene-owned resources are reset across missions; helpers provide explicit disposal for future scene teardown. Transparent draw order may differ; verify visually. No CI yet.
