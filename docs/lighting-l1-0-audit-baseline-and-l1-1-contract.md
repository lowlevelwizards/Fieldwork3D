# L1.0 — Existing Lighting Baseline, Ownership and L1.1 Entry Contract
**Fieldwork Breach | 2026-11-16 | Implementation ledger**

## Complete L1.0 scope (behavior-preserving)
**Purpose:** establish measured, reproducible evidence and one unambiguous integration contract before any interactive power or night-vision work. This stage does not implement active power state or change gameplay light, AI, rendering, fog, menus or physics.

1. **Audit existing ownership and behavior** (implemented in this review): source mapping, static fixture program, light math, weapon light, visual acquisition, global presentation, session/restart/replay.
2. **Isolated real-game fixture** (implemented): `l1BaselineSite()` from the existing deterministic K1 Killhouse builder, across four layouts, actual physical doors, cover, room IDs and six targets. No second site/physics builder.
3. **Read-only baseline census** (implemented): report five modes, source types/counts, room/door/cover counts, local ambient and 2D/ISO presentation profile, occlusion rays and cache-reuse evidence.
4. **Reproducible CPU workload** (implemented): time five-mode fixture planning, a fixed 20×20 illumination grid and a real Session actor-lighting sampling pass; include blocker/fixture/actor census. Use warm-ups and report median/worst observations, not flaky CI millisecond thresholds.
5. **Contract regression suite** (implemented): real-site deterministic modes, fixture cap/ID alignment, closed versus glazed occlusion and walls, no-site bounds, weapon-light mount/toggle, 8-Hz reuse and object/time/mode invalidation, 2D/ISO shared mood and beam footprint, replay manifest preset continuity.
6. **L1.1 authority boundaries and acceptance plan** (this document): define the exact ownership and compatibility behavior before introducing power, switches, or NVGs.
7. **Release gate:** focused Node tests plus the existing source-owned PR CI TypeScript/build, merge only with green checks and after last Pages build is verified; require successful public-served build check for the new main SHA.

### Read-only command
`npm run audit:l1-lighting`

The command emits a JSON baseline. It reports CPU/Node performance only. It **does not** measure WebGL draw calls, actual browser wall time, GPU contention, iPhone thermals, or visual readability; those require a later on-device acceptance pass. Run `node --experimental-strip-types scripts/audit-l1-lighting-baseline.mjs --check` for deterministic contract checks.

### Audit of existing code (live, November 16)

| Concern | Current authority | Current behavior | L1.1 ownership |
|---|---|---|---|
| Site geometry and rooms | `src/breach-site.ts` / `src/breach-world-context.ts` | Seeded real rooms/doors/cover; K1 site is authored and deterministic | Site holds static circuit/fixture authoring; world context supplies real occluders |
| Site light presets | `src/equipment-site-lighting.ts` | Five modes set ambient, enable mains or backup, and omit inactive fixtures; at most 32 room fixtures | Retain pure topology/emission calculator; compute effective emission from power state rather than assuming selected preset is the only state |
| Light reach | `src/equipment-light-field.ts` | Occluded deterministic scalar intensity at points; grid clamped to 96² | Reuse exactly this field/ray contract; no perception or fog authority |
| Optical blocking | `src/breach-optical-occlusion.ts` / `src/equipment-weapon-light-beam.ts` | Walls, opaque hinged leaves and tall cover obstruct; glazed leaves transmit | Reuse same physical blocker generator; invalidate only on relevant changes |
| Portable light source | `src/equipment-portable-light-sources.ts` / `src/breach-tactical-control-commands.ts` | Equipped, enabled, living operator contributes source at the clearance-correct rail | Reuse source/state and add explicit dirty revision when toggle changes |
| Acquisition cache | `src/equipment-sight-lighting.ts` | WeakMaps keyed by Session/site; actor field cached at 8 Hz, keyed by bucket/objectRevision/lightingMode | Add authoritative illumination revision for power and portable-light changes, with no on-frame allocation or global singleton |
| Perception | `src/breach-visual-acquisition.ts` | **Physical LOS first**, then light-sensitivity gain, then observer-specific knowledge | No bypass of LOS, knowledge, identification or fog; preserve sample cadence |
| 2D appearance | `src/breach-2d-world-renderer.ts` | Global floor tint + existing mounted-light footprints | Later render local energized fixtures without creating a separate brightness simulation |
| ISO appearance | `src/breach-3d.ts` | Preset global hemi/sun and cached mounted-light footprint geometry | Later local emissives/cues remain bounded, no per-fixture shadow-casting SpotLights |
| Mood profile | `src/equipment-lighting-presentation.ts` | One five-mode appearance mapping consumed in 2D and ISO | Retain one shared preset, including old replay fallback |
| Save/retry/replay | `src/breach-session-factory.ts`, `src/breach-mission-restart.ts`, `src/breach-replay-manifest.ts` | Session starts day; mode present in restart and replay manifest schema v2; no circuit history | New dynamic state belongs to Session snapshots and timeline, not mutable global visual state |

## Current measured/structural bounds
- Authoritative mode names are `day`, `evening`, `night`, `blackout`, `emergency`.
- Ambient baseline, in that order: **0.85 / 0.44 / 0.10 / 0.035 / 0.055**. Note: emergency ambient is slightly higher than blackout, even though both disable mains.
- `LIGHT_CAP=32` per-site planned fixtures; fixture planning is a pure function and should remain so.
- L1 fixture IDs currently follow `light:<roomId>`; while enabled they are unique, but when a circuit is unpowered **the fixture is omitted entirely**. Do not base future power topology on a *filtered active-source array*.
- Equipment beam `LIGHT_BEAM_RANGE=155`, `LIGHT_BEAM_HALF_ANGLE=.34`, `LIGHT_BEAM_SAMPLES=11`; footprint is a 12-point fan including its origin.
- Sight illumination is sampled at eight Hz; `lightVisibilityGain(0)=0.30` and `lightVisibilityGain(.85)=1`. Ambient darkness slows ID rather than eliminating all vision.
- WeakMap snapshot currently uses `bucket=⌊ seconds*8⌋`, `objectRevision`, `lightingMode`. It does **not** explicitly invalidate for a weapon-light toggle inside the same bucket, future independent power state, or an actor position change in the same bucket. This is a known L1.1 design item, not a reason to add uncontrolled per-tick rebuilds.
- 2D and ISO presently share **global mood presets and weapon-light footprint math**, but **do not** currently render the same per-fixture local illumination. Claiming per-room visual parity today would be incorrect; that is an L1.3 deliverable.
- A helmet shroud/strap/ordinary eyewear is cosmetic. Functional NVGs are not implemented; this remains L1.5.

## Critical compatibility and fallback rules for L1.1
1. **Legacy parity gate:** for any historical Session and `planSiteLighting(site, mode)` call **without** new power overrides, fixture sources and scalar ambient must be byte-for-byte equivalent to the L1.0 baseline for identical site/seed.
2. **Static topology before filtering:** author all potential fixture IDs, circuit affiliations and supply requirements deterministically even when that source would be dark. Avoid changing IDs between powered/unpowered states.
3. **One state authority:** per-session `SitePowerState` stores circuit status, local fixture switches and a monotonic `powerRevision`. No renderer-owned power status, no independent 2D/ISO copy, no new RAF subscriber.
4. **Separate invalidation:** lighting snapshots will compare `powerRevision` and a bounded `portableLightRevision` (or one shared lighting revision) in addition to bucket, physical-world revision and preset. Signal only meaningful changes; preserve ordinary 8-Hz sampling.
5. **No silent light from room shape:** fixture capability is inferred from the authored site (with legacy default); emission additionally requires actual supply and switch state.
6. **No knowledge leakage:** lighting answers reach/intensity only. Existing physical LOS, identity acquisition, faction knowledge and fog rules remain the sole authorities.
7. **Replay/restart parity:** capture initial preset/fixtures and timed dynamic actions. An archived manifest missing L1 fields replays exactly like the old preset-only lighting system.
8. **Sensible bounds:** maintain 32 planned fixtures in first release, 96×96 grid clamp, existing static world and beam budgets; no per-fixture GPU shadows.
9. **Physical interactions belong to L1.2**, after the L1.1 state contract. Do not introduce switches in the first state-only patch and do not treat visual effects as game decisions.

## L1.1 required proof matrix
- Every old mode (including abandoned/neglected failed fixtures and emergency circulation) produces identical output in compatibility mode.
- Across four K1 layouts and an empty site, stable fixture/circuit identities do not change across power toggle/retry.
- Two independent main circuits and one backup group can each change independently without affecting unrelated rooms or global daylight.
- Source levels and cache snapshots update **within the same 8-Hz bucket** when power or weapon lights change, without changing fog or opening doors.
- A closed opaque door blocks lighting even when a powered fixture is on the other side; a glazed leaf transmits appropriately.
- No hidden-world information is granted by the new power or light state.
- Current K1 v1 scored blackout course and local records remain unchanged until explicit new trial versions are introduced.
- Mission re-entry, replay rewind and camera view changes see consistent power state, with bounded memory and physical performance.

## Accepted L1.0 boundaries and deferrals
L1.0 is *not* an interactive feature release. The actual breaker controls, circuit state, indoor local-light rendering, NVG gameplay, enemy light-discipline changes, dynamic replay events and detailed visual screenshots are separately scoped in L1.1–L1.9. This protects the current tactical motor, weapon firing, fog, K1 scoring, and browser frame budget.

### Final L1.0 release evidence to retain
- PR code diff and its green source-owned CI.
- Audit script + test logs, reproducible corpus (4 layouts × 5 presets).
- Build and TypeScript check from production PR CI.
- Successful Pages workflow tied to the **merged** SHA and its verified served build.
