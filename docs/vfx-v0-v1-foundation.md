# V0/V1 — effects foundation
Base a05bd63ce633af9520fa7000c5d0f083ef81509d. Preserve authored simulation, disclosure, replay, visual transforms and fog.

## V0 audit
- Existing casing (96), impact mark (64; blood evidence cap 24) and window shard (96) instance batches are retained. Shot presentation has 20 active visuals, shared geometry and style-specific spares.
- The loose combat presenter had up to 64 separate magazine draws and new geometry/material per visible grenade and flash. In a 64 magazine / 8 grenade / 8 flash scene, 80 visible meshes become 17 (excluding casings); these are source-derived counts, not GPU timings.
- Existing environment/effects phase and main-pass counters are available. Tactical exterior construction is distinct from the standalone vegetation experiments; port Perplung Grass Pass 02 and Bush Study 04 in V2/V3, with cutout atlases, spatial culling, GPU wind and unchanged collision/concealment.
- Benchmark with identical Node/Three versions using scripts/bench-vfx-foundation.mjs on base and candidate; copy the script into the base checkout. Compare idle, settled, combat churn, disclosure and repeated resets. Node CPU results are not browser/mobile GPU measurements.

## V1 scope and gates
- One opaque magazine instance batch; preserve original transforms and newest 64 evidence window. Stable settled slots avoid writes. Shared grenade geometry/material; shared flash geometry with independent transparent opacity. Bounded 32 spare slots, retain on reset, retire before acquiring. No active flash cue cap.
- Preserve existing casing behavior and refresh on backward seek. Retain existing shot/decal/shard ownership rather than create a parallel effects system. No new textures/shader variants before actual textured effects in V2/V4.
- Test hidden/personal disclosure, saturation, stable buffers, replay seek, independent opacity, repeated IDs and mission reset. Run critical tests, typecheck, production build, compare benchmark, and browser/device stress and visual parity. No merge until gates are green. Verify exact Pages build after merge.
- Targets: N-to-1 magazine submissions; no repeated same-peak geometry/material creation; zero unchanged settled matrix writes; bounded spare memory; no visual or representative frame-time regression. Whole-game p95 improvement remains a target, not measured here.
