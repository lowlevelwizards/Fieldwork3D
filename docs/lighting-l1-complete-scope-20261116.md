# L1 — Blackout, Power, Flashlights and Night Operations
**Fieldwork Breach | Full implementation scope | 2026-11-16**

## Product outcome
Make ambient darkness and building power tactically meaningful, while retaining readable stylized miniatures. A squad can deliberately enter a dark building, switch or restore its lighting, use existing fitted weapon lights, equip and operate actual night-vision devices, and experience opponents whose visual identification responds to these conditions. The same mechanics work in ordinary missions, Quick Play, K1 Killhouse/Trials, replay, 2D and ISO.

The goal is a **unified dynamic lighting and visibility system**, NOT photorealistic lighting, independently simulated electric grids, a second vision engine, or room-revealing light cheats. Darkness is a constraint, not an unplayable black screen.

## Audit of existing ownership — do not duplicate
- **World light math:** src/equipment-light-field.ts already provides deterministic occluded source sampling, light blockers and bounded grid queries.
- **Authored fixtures and ambient presets:** src/equipment-site-lighting.ts has five LightingModes (day/evening/night/blackout/emergency), a per-room fixture plan with a 32-source cap, and a nominal mains/backup classification. **Present limitation:** power is inferred only from the preset; no persistent circuit/switch/outage world state or independently controllable fixture exists.
- **Portable lights:** src/equipment-portable-light-sources.ts derives mounted weapon lights from weapon-clearance-correct emitters; src/equipment-weapon-light-beam.ts handles footprint occlusion; src/breach-tactical-control-commands.ts owns light toggles and src/equipment-weapon-light-ui.ts owns selected-operator feedback. Do not introduce another weapon-light path.
- **Acquisition:** src/equipment-sight-lighting.ts already caches illumination at eight Hz keyed by time bucket, object revision and lighting preset; src/breach-visual-acquisition.ts applies light only after physical sight and preserves personal observations. This remains authoritative.
- **Presentation:** src/equipment-lighting-presentation.ts already maps lighting presets to 2D mood and 3D global light levels; src/breach-2d-world-renderer.ts and src/breach-3d.ts render the existing weapon-beam effects. Keep visual and gameplay lighting semantically synchronized without adding shadow-casting lights per fixture.
- **Equipment:** helmet shrouds, period brackets, goggles, helmet lights and side mounting restrictions exist in src/operator-helmet-field-policy.ts and related appearance modules, but this is **not** a gameplay NVG system. Protective/stowed goggles do not grant night vision.
- **Mission contracts:** Session owns lightingMode; startup/restart/replay manifest already carry the preset. K1 includes a scripted blackout trial and a low-light acceptance test, which checks preset fixtures but **not** active power toggling or functioning NVGs.

## Explicit L1 feature contract

### 1. Power topology, state and authoring
1. Introduce a small per-session SitePowerState in the existing world/session owner; the site describes static authored circuit assignments. Start with one mains circuit per building or wing and one independently powered emergency group. Avoid a generalized wiring graph.
2. Seed state deterministically from site identity and chosen mission lighting/power scenario: mains supplied, mains interrupted, manually disabled, or backup active. Preserve the existing five presets as *initial conditions*, not the sole source of truth.
3. Assign stable IDs to each circuit and fixture, including an affordance for a visible breaker/switch box where physically and semantically appropriate. Existing fixture IDs and rooms remain valid. Provide safe defaults for old sites, missing room IDs and maps without electrical devices.
4. Compute effective fixture emission from **authored fixture capability × circuit state × local switch state × damage/outage state**, not just LightingMode. Backup fixtures require independent supply and do not automatically light every room.
5. An explicit power revision increments for meaningful changes; new snapshots and render buffers invalidate when this revision changes. Do not overload unrelated movement or actor state with continuous dirty signals.
6. Power state resets on new session and intentional retry, survives ordinary pause/resume, and is included in replay/checkpoint snapshots at the correct event boundary.

### 2. Player interactions and authority
1. A visible reachable breaker/fixture switch is an existing-world physical interaction with bounded reach, collision and line-of-action validation, and an authored action / fixed-step execution, not an instant UI-only toggle.
2. Support **CUT POWER**, **RESTORE POWER**, and **TOGGLE LIGHT** only on eligible site objects; show disabled/blocked reasons. Use one context-action path with keyboard, mouse and touch parity.
3. Keep control authority deterministic. Two operators interacting with one breaker in the same step resolve in stable order; cancelled, moved-away, downed and no-longer-reachable actions do not silently flip power.
4. Opening a door never automatically switches a light. Power loss does not directly disclose room occupants or modify fog. Optional panel-access conditions must be authored clearly, not inferred from arbitrary room position.
5. Inaccessible/unpowered maps still work. Do not invent a breaker in every room.

### 3. Visual language and illumination
1. The existing preset profile remains the global daylight/twilight baseline. Indoor powered fixtures brighten local spaces; dark interiors remain dark even during daylight when physically enclosed. Outdoor brightness depends on actual ambient state, not fake room discovery.
2. Fixtures have restrained stylized visible emissive surfaces and low-cost ground/wall light cues. Lit, unlit, failed and emergency fixtures read distinctly in 2D and ISO. Keep ceiling/floor geometry material ownership unchanged.
3. Occlusion is consistent with walls, doors, windows and tall cover. No cone may reveal through an opaque closed door. The same world geometry source is used for sight blocking, lighting calculations and presentation footprints where possible.
4. Emergency lighting is a readable low-power language (muted practical fixtures), not a global red/green color wash. Preserve team/hostile/no-shoot silhouette legibility and user accessibility.
5. Photo Mode may photograph a lit or blacked-out site but may not alter the live lighting or silently unfreeze the simulation. Replay reconstructs the original lighting, rather than showing the latest live toggle state.

### 4. Weapon flashlights and light discipline
1. Retain the existing fitted compact weapon-light assembly, toggle command, beam muzzle/rail transform, range, occlusion and physical hit tests. No free flashlight on weapons lacking a compatible part.
2. Provide a clearly accessible tactical control, pressed/on/off state, operator ownership and compact quick feedback. Active operator's light remains active across movement, crouching and short-stock; dead/incapacitated/nonfitted actors cannot issue new light commands.
3. Light makes illuminated targets easier to identify through the existing acquisition system **only after valid physical LOS**. Active visible weapon lights may increase enemy detection of their emitters, but never create contact through walls or share enemy knowledge.
4. Beam visuals should use the existing pooled geometry, capped update cadence and clearance correction. Do not allocate new SpotLights or shadow maps per actor or per frame.

### 5. Actual night-vision devices
1. Add a **functional NVG device** to the operator's issued equipment/loadout, separate from helmet cosmetic goggles. The device has a model/type ID, compatible mount/strap requirement, mounted/stowed/deployed state, battery policy and on/off state. No NVG benefit from a bare shroud.
2. First delivery: one recognizable low-poly single/dual-tube device family with restrained forward mass, hinge and counterweight silhouette. Reuse helmet compatibility/prerequisite rules; respect period equipment restrictions instead of retroactively fitting every headgear.
3. Treat deployment as an explicit bounded operator action. It cannot be switched during an incapacitated state; sensible transitions between deployed/stowed, on/off, uncovered daylight and equipment removal are enforced.
4. NVG affects **the wearing operator's own dark-scene visual presentation and valid optical identification**, never the world light grid. Maintain meaningful disadvantages: narrow usable field, slower ID/reaction or limited bright-light tolerance, depending on final tuning; do not create a magical 360° detector.
5. First-person/bodycam NVG presentation uses a modest readable monochrome/green-tinted treatment with clipped highlights, limited noise and bounded vignette. Top-down/ISO tactical views may display an operator indicator and optional selected-operator overlay, but cannot expose unseen room contents. Provide reduced-effect / accessibility settings.
6. A simple deterministic battery budget is optional for initial L1 if a full equipment resource integration would create nonessential churn; decide and document before implementation. Never add per-frame inventory writes.

### 6. Enemy, civilian and perception behavior
1. Apply the existing lightVisibilityGain only to physically eligible observation pairs. Introduce a narrow observer-NVG modifier and emitter-light-signature modifier with testable limits.
2. Enemy sight must distinguish notice, identify and act, using each actor's independent knowledge. A light briefly sweeping a room is evidence, not immediate omniscience.
3. Civilians may react to power/light changes through existing alert/evidence APIs, but no new AI authority or separate behavior loop belongs in L1.
4. Do not combine with A1 sound propagation yet; publish small stable light-change events for a future sound/encounter consumer.
5. Fog stays based on actual operator perception and configured Intel mode; flashlight/NVG never reveals entire rooms merely because a fixture switched on.

### 7. K1 training and ordinary missions
1. Keep K1's authored low-light trial ID/version stable for existing records. New power-control trials get **new** IDs/versions so historical personal bests do not silently change rules.
2. Add standalone blackout exercises: dark entry, restore power, power cut, flashlight-only, NVG-only and optional light-discipline challenge. Each challenge uses normal Session actions, target strikes, completion and records.
3. Add a training operator kit preset to equip a functional light or NVG where the exercise requires one; never mark a trial impossible with an unequipped squad. If prerequisite kit is missing, disable START with an actionable reason or supply a reproducible preset.
4. Quick Play exposes a compact Lighting / Power scenario choice. Campaign/mission authors may opt in through the existing site contract; old saves default to the historical day behavior.
5. In retry, reproduce initial lighting and issued kit. In replay and debrief, render events in their recorded chronology. Include switch/power/device actions in evidence where useful.

## Staged implementation and acceptance

| Stage | Implementation | Non-negotiable acceptance |
|---|---|---|
| **L1.0 – Baseline and architecture** | Document current light sources, 2D/3D parity, source counts and cache invalidation. Add an isolated scenario fixture and performance reference. | No live behavior change. Existing lighting/weapon-light/K1 tests pass. |
| **L1.1 – Authoritative power state** | SitePowerState; deterministic default circuits, stable fixture assignment, mains/backup separation and revision-aware emission. | Independent circuit state changes light only in corresponding areas. Old maps/replays compatible. |
| **L1.2 – Physical control actions** | World switches/panels, reachability, fixed-step interaction, cancel/stale-object handling and event recording. | Running/planning cancellation, simultaneous use and operator casualty do not cause ghost toggles. |
| **L1.3 – Presentation parity** | 2D and ISO powered fixtures, emergency appearance, occluded local pools and state-change rendering without material churn. | Both views agree on light state; closed opaque door blocks light; mobile budget holds. |
| **L1.4 – Flashlight usability** | Training/loadout presets, compact control, robust beam/fitted-equipment checks and existing clearance parity. | Fitted-only controls, old weapon configurations and shot/beam origin unaffected. |
| **L1.5 – NVG device/equipment** | Real mount/deployed state, operator action, compatibility, model and selected-view treatment. | Cosmetic goggles give no sight bonus; only eligible powered worn device does. |
| **L1.6 – Perception integration** | Bounded observer NVG modifiers, emission signature and separation of detect/identify/act. | No through-wall, no unseen-intel leak, meaningful slower dark acquisition, determinism. |
| **L1.7 – Night operations / trials** | New power/flashlight/NVG K1 exercises, Quick Play selector and readable results. | All course variants solvable from seeded equipment; old records stable. |
| **L1.8 – Replay, persistence, lifecycle** | Mission restart, replay timeline snapshots, Photo Mode, disposal, invalidation and feature fallback. | Rewind gives original state; no leak across mission transitions; restart deterministic. |
| **L1.9 – Final hardening** | Desktop/mobile portrait/landscape smoke, old-save compatibility, fixed-step regressions, scene budget and release evidence. | Focused critical CI and verified previous Pages deployment before release merge. |

### Release grouping and development cadence
- **Batch L1-A (L1.0–L1.3):** power circuit spine + physical switches + shared scene presentation. Keep feature branch staged until meaningful behavior works end-to-end.
- **Batch L1-B (L1.4–L1.6):** fitted flashlight polish, functional NVGs and vision behavior.
- **Batch L1-C (L1.7–L1.9):** night trials, persistence/replay, acceptance and integrated release.
- Commit each passing stage on a dedicated feature branch. Run only the critical tests needed per stage; use targeted CI plus TypeScript/build at release boundaries. Never stack a new main merge on a running Pages deployment. Verify previous deployment success and served build before next release.

## Performance and correctness budget
- **Simulation:** maintain the existing fixed-step authority. Reuse eight-Hz illumination samples where possible; additionally invalidate on power, light toggle, door/cover and NVG-state changes. Test stale snapshots after toggles within one bucket.
- **Geometry:** sample light blockers from the existing world context and its revisions. Cache per site/circuit where possible. Avoid a fresh all-room scan or thousands of ray casts per actor per tick.
- **Rendering:** prefer visible emissive fixtures and pooled non-shadow-casting light footprints. No per-fixture shadows and no uncontrolled Three.js SpotLights. Preserve existing 512 live shadow map policy.
- **Memory:** cap site fixtures as before (currently 32), limit mobile-visible source counts, and dispose all per-session data on exit/retry. No persistent UI RAF subscriber or hidden gallery rendering.
- **Safety/visibility invariants:** illuminated != observed; observed != identified; identified != permitted to fire. Respect line-of-sight, rules of engagement, independent knowledge, fog and friendly/civilian lanes.

## Mandatory regression matrix
1. Five initial lighting presets across old and new sites, including no-room/no-fixture maps.
2. Main switch off/on, emergency backup independent, local fixture toggles and intermittent failure.
3. Open/closed/partly open doors, windows, tall cover and route changes under static light and moving beam.
4. One to four operators with independently configured lights/NVGs; dead, reloading, running, short-stock and crouched states.
5. Identical seeded dark encounter at different simulated frame rates; no invented observations or arbitrary instant shots.
6. Blackout target/no-shoot scoring, persistence of old K1 record keys, and session reset after failed trial.
7. Replay rewind across power event, Photo Mode freeze, Quick Play reconfigure and Campaign resume.
8. 2D, ISO, portrait, landscape and touch: controls usable, no overlay clipping, no hidden-action requirement.
9. Static and active scene performance, no materially new unbounded spikes, no stale power/lighting cache, no leaked fixture meshes after retry.

## Explicit non-goals / protections
- No building destruction, general electrical simulation, destructible wires, generator fuel economy, dynamic global illumination or shadow-casting fixture army.
- No A1 sound/AI redesign and no change to D3 physical movement or door/stack authority.
- No automatic equipment granted by visual helmet attachments.
- No blanket darkness immunity, magic room reveal or full-screen noise effect that harms reading or motion comfort.
- No migration that rewrites legacy replay evidence or changes existing K1 trial version 1 scores.

## Definition of done
A freshly seeded dark site has a physically credible power state; operators can intentionally change that state, safely and visibly; fitted weapon lights and mounted functional NVGs produce distinguishable tactical advantages; enemy observation remains bounded by real sight and knowledge; K1 can evaluate and replay night exercises; and both views and saved/replayed sessions preserve the same result within existing performance limits.
