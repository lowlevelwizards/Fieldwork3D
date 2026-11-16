# L1.1 — Authoritative Building Power
**Implementation scope, architecture contract and acceptance | 2026-11-16**

## Outcome and limits
L1.1 turns Fieldwork Breach's five preset-only lighting configurations into an explicit **session-owned electrical state**. Light fixtures retain stable identifiers when dark, mains circuits and backup are independently switchable, weapon light toggles invalidate illumination in the same sample bucket, and deterministic initial electrical state survives mission retry and replay. This stage establishes game logic; there are **no visible breakers or switch interactions** (L1.2), no local fixture visuals (L1.3), and no NVG effects (L1.5).

## Existing code reviewed
- `src/equipment-site-lighting.ts`: preset-specific light planning (day / evening / night / blackout / emergency), historical mains and emergency semantics, static `LIGHT_CAP=32`. Historically omitted inactive fixtures.
- `src/equipment-light-field.ts` and `src/breach-optical-occlusion.ts`: physically occluded light reach without conferring LOS, fog or targeting.
- `src/equipment-portable-light-sources.ts`, `src/breach-tactical-control-commands.ts`: fitted weapon lights, clearance-correct placement and live user toggle.
- `src/equipment-sight-lighting.ts`, `src/breach-visual-acquisition.ts`: per-session 8 Hz light snapshots; physical LOS before illumination-assisted identification.
- `src/breach-session-factory.ts`, `src/breach-mission-controller.ts`, `src/ui/breach-mission-screens.ts`: session defaults, mission lighting selector, pre-GO configuration and replay construction.
- `src/breach-mission-restart.ts`, `src/breach-replay-manifest.ts`, `src/breach-replay.ts`: initial mission gear/world state, recording manifests, frame state, rewind and historical compatibility.
- `scripts/audit-l1-lighting-baseline.mjs`, `tests/l1-0-lighting-baseline.test.mjs`: preserved L1.0 behavior and fixed workload.

## Complete implementation slices
### L1.1A — Stable fixture topology and supply
1. Add pure `siteLightingTopology(site)` to enumerate **all** potential fixtures, not just energized fixtures. Keep `light:<roomId>` IDs, room positions, intensities, cap, deterministic neglected-site failure flags and existing optical geometry.
2. Divide main fixtures into two deterministic circuits `mains:0` / `mains:1` by stable authored room order. A distinct `backup:emergency` can supply eligible corridors, halls and exits. No generalized wiring graph or new level generator.
3. Add `createSitePowerState(site,mode)`: circuit defaults from existing presets, fixture switch defaults on, zero revision, one instance per Session. Day/evening/night start mains on; blackout/emergency start mains off and backup on.
4. Keep existing `planSiteLighting(site,mode)` an exact historical-compatible path. Optional `planSiteLighting(site,mode,sitePower)` uses circuit and local-switch state, including deterministic failed fixtures. If the power state belongs to another preset, fall back to historical mode-only semantics, preserving old direct-mode callers.
5. Turning on mains cannot illuminate a truly failed fixture; switching on emergency power lights only eligible backup fixtures. Effective lights are computed, never duplicated with a renderer-only list.

### L1.1B — One authority, bounded changes, immediate invalidation
1. Store `sitePower` and `illuminationRevision` on the existing Session. No global electrical singleton or additional fixed-tick/RAF loop.
2. Add bounded, deterministic domain commands `setSiteCircuitPower` and `setSiteFixtureSwitch`. Reject unknown IDs, unchanged requests, missing sites or missing state. Mutations create a new small object, increment `sitePower.revision` and the shared illumination revision exactly once per accepted change.
3. Weapon-light toggles use the existing equipment control and increment the same illumination revision. All absent/unfitted/invalid light toggles keep current gameplay behavior.
4. Expand the shared actor-illumination cache key to include site identity, power revision and illumination revision alongside preset, physical-world revision and 8-Hz time bucket.
5. Cache the resolved powered fixture program per Session + site + mode + revision, maintaining old per-site/mode caching for legacy callers. Do not recompute per actor pair.
6. Actor observations still require authoritative LOS, enemy-specific knowledge, and the same speed/identification rules; illumination alone never creates a sighting or reveals a room.

### L1.1C — Session lifecycle and replay
1. Initialize session circuits from the resolved site and default preset. The existing mission controller and pre-deployment setting button use `setSessionLightingMode` to seed defaults after selecting the actual mission preset.
2. Capture the initial power state in `MissionStartSnapshot` and `ReplayManifest` as *optional* fields so old favorites and schema-v2 films continue working.
3. Replay frame snapshots capture power revisions and circuit/switch values; replay seek, rewind and scrubbing restore each frame rather than inheriting the latest live state.
4. Reuse immutable recorded electrical objects when power has not changed (no extra per-frame allocation if world snapshot is reused). Event semantics are deferred to L1.2.
5. Missing historical fields reconstruct the original preset-only defaults. No saved replay schema bump and no modification of old recordings.
6. Restart restores a copy of the *initial* configuration rather than the mutated live configuration; separate sessions cannot share mutable circuit maps.

### L1.1D — Focused test and release gates
1. **Legacy parity:** four Killhouse layouts × five lighting modes, plus deterministic neglected-fixture failures; powered initial emission is deep-equal to historical emission.
2. **Topology:** constant stable IDs, cap 32, empty site fallback, both main circuit assignments and emergency eligibility; fixtures stay authored even when switched off.
3. **Independent control:** switch each mains group, backup circuit, and a single fixture; ensure unrelated circuits remain unchanged and no-op/invalid requests do not increment revisions.
4. **Same-bucket invalidation:** actor illumination changes immediately when an active circuit changes without advancing simulated time or touching object revision/fog, and mounted flashlight toggles force a new sample.
5. **Replay and restart:** an initial manifest is copied, before/after power frames rewind without future leakage, and a pre-L1.1 replay frame restores default preset-only power.
6. **No regressions:** run existing L1.0 audit, previous equipment lighting tests, K1 low-light trial, source-owned CI TypeScript/build, and the Pages live-build verification. Preserve 512 live shadow map policy and all source caps.

## Deferred work
- **L1.2:** actual breaker/switch objects, reach/LOS validation, tactical action authoring, animation, cancel/simultaneous interactions, player UI and event evidence.
- **L1.3:** emissive fixture artwork, local powered lighting in 2D and ISO and bounded render changes.
- **L1.4–L1.6:** flashlight convenience/presentation, equippable NVGs, observer-specific night perception.
- **L1.7–L1.9:** night exercises, broader replay/lifecycle polish, browser/mobile performance acceptance.

## Definition of done
The same historical site, seed and preset produce unchanged light levels before any power actions. Explicit power changes affect only eligible fixtures, are observed immediately by the existing light field, and are isolated, copied and correctly restored across retries and replay. No second simulation, fog disclosure or uncapped fixture renderer is introduced.
