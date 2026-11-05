# Fieldwork Breach — E1–E5 Living Encounter AI Roadmap
**Date:** 2026-11-05
**Branch:** `feature/breach-enemy-ai-e1-e5-20261105`
**Contract:** Extend the *existing* 60 Hz authoritative actor simulation, world geometry, sight, sound, awareness memory, roles, route motor, weapons, and replay. No new parallel AI engine, no automatic tactical pause, no hidden player coordinates, no forced contact, no invisible teleports.

## Baseline audited
- `breach-game.ts:enemyDecisions` already connects visual perception, sound evidence, uncertain contact, short investigation/search, pre-contact local routines, alert labels, cover, combat choices, verbal warnings and group support.
- `breach-awareness.ts` stores observation-source-scoped contact beliefs, uncertainty and decay. `breach-visual-perception.ts` acquires real LOS. `breach-sound-evidence.ts` yields approximate audible estimates, with walls, openings and windows.
- `breach-ai-policy.ts` chooses watch/investigate/defend/engage/withdraw. `breach-ai-combat.ts` chooses engage/reposition/reload/hold/withdraw/investigate. `breach-ai-morale.ts` handles witnessed harm, pressure, withdrawal and surrender.
- `breach-ai-coordination.ts` shares roles only with listeners of the real physical `breach-communication.ts` warning.
- `worldgen/encounter-*` establishes roles, readiness, two-point local routines, scenario profiles and safe spawns; the current hostile population floor is two even for some vacant premises.
- `breach-defense.ts` uses verified local positions, directional ballistic cover, line-of-fire legality and occupancy penalties; `approach` runs physical collisions, door handling and bounded navigation; P5 defers elective AI work instead of skipping urgent reactions.

## Invariants for every stage
1. **Knowledge:** use actor's direct sight, observed evidence, remembered estimate, or genuinely delivered report. Never derive destinations from unseen blue positions.
2. **Authority:** all path/door/weapon/cover choices go through existing legal motor and shot gates; reject unreachable destinations and keep existing state when no legal alternative exists.
3. **Scheduling:** preserve deterministic simulation ticks, finite candidate sets, revision-safe caching and bounded work. No extra per-tick whole-building A* or all-pairs LOS.
4. **Continuity:** store behavior state explicitly on enemies; use hysteresis/dwell/cooldowns and expire plans when contradictory evidence arrives.
5. **Replays/fog:** no unobserved intel disclosure in the player HUD or replay; deterministic fixed-seed outcomes and save-safe optional fields.
6. **Player control:** no auto pause, no new forced squad actions, no altered authored orders; Quick Play remains nonpersistent and Campaign persistence remains isolated.
7. **Content:** realistic quiet encounters are allowed; never force a gunfight, spawn a hidden guard, or attach combat behavior to neutral actors.

## E1 — Evidence-driven awareness and investigation (items 1, 2)
### E1-A: Suspicion memory and hysteresis
**Owner files:** new `src/breach-ai-suspicion.ts`, `breach-game.ts`, focused tests.
- Per-enemy `SuspicionMemory`: pressure [0,1], stage (`unaware|curious|suspicious|alerted|searching`), most recent evidence time, last stage transition, last cause (source+kind), and search exhaustion time.
- Pure `advanceSuspicion(memory, event, now, dt)` and `observeSuspicion(memory, evidence, now)` functions. Evidence strength varies by verified acoustic response, visible evidence and actually received report; additional independent evidence raises pressure, repeating identical evidence ID never stacks.
- Stable dwell and asymmetric thresholds (rise fast, settle slowly). Direct confirmed sight sets alert immediately; lost contact never confers continuing sight. Decay toward calm on actual elapsed sim time, with prior alarm requiring longer recovery.
- No infinite alert or stale `contact` target after search is exhausted. Keep existing `ActorAwareness` belief store as the *only* source of target-coordinate confidence.
**Gate:** deterministic evidence idempotence, escalation, hysteresis, decay, sound-vs-direct-vision, no hidden knowledge; existing awareness policy/search/communication tests and TypeScript/build.

### E1-B: Runtime integration
- Derive pressure from each newly processed `interpretSound`, confirmed visual transition, and delivered report; take old `alert` and `contact` as execution outputs, not competing independent truth.
- Respect the existing reaction latency, abrupt violent event overrides, suppression decisions, and timing before investigation.
- Expose stage/cause in developer awareness diagnostics only; no hidden AI state in the player HUD.
**Gate:** deterministic seeded baseline; no double processing, no chase on faint audio, no shooter before actual vision.

### E1-C: Structured search
**Owner files:** `breach-ai-search.ts`, `breach-game.ts`.
- Build bounded candidate sequence from *remembered* position and observed uncertainty: plausible doorway observation positions, last-known area, connected nearby room edges/cover approach, with existing room-center fallback.
- Route-check at most two candidates on a scheduled elective tick, preserve existing search queue/inspection pauses, reject solid obstacles and inaccessible entries, and invalidate known-empty estimates through existing awareness code.
- When exhausted, transition to lingering watch/stand-down; fresh evidence can interrupt and replan without teleporting.
**Gate:** multi-room LOS and search seeds; no unseen target positions, no invalid routes, no expensive A* burst.

## E2 — Team response and positional combat (items 3, 5)
### E2-A: Group commitments
- Extend `TacticalReport` with optional semantic report type (contact/sound/down/withdraw), expiry and origin without changing hearing. Group assignments persist while evidence remains actionable and expire naturally. Use `groupResponse` with prior stable commitments; roles limited to **actual listeners**.
- Small bounded team state: investigation lead, watch lane and support; avoid duplicate routes/cover occupancy; allow urgent visible contact to preempt.
- No radios or shared omniscience implied by the current local acoustics model.
**Gate:** behind-wall unheard actors uninformed; late listeners join without reallocating original lead; delivered IDs not duplicated.

### E2-B: Stable cover and firing behavior
- Explicit `hold angle|seek covered firing lane|withdraw|reload` commitment and local cooldown. Use existing `chooseFiringDefense`/muzzle-lane check, crouch-vs-stand, occupancy, and approach physicality.
- Score exposure duration and route risk; abandon repeated blocked angle only after known obstruction and real movement alternative. Never stand in solid cover or fire through friendlies.
**Gate:** static and moving target scenario tests; no postural or relocation oscillation, no invalid shots.

## E3 — Routines, aggression and human resolve (items 4, 6, 7)
### E3-A: Functional multi-stop routines
- Extend existing seeded `EncounterActorSpec.routine` with 2–4 legal points, contextual dwell by fixture/role (door watch, work area, shelving, loading, reception), optional physically valid adjacent room transfers.
- Perform heavy validation at generation, runtime navigation still authoritative. Avoid guaranteed identical cycles: deterministic per-actor variation and finite pauses; no fake furniture animation/action.
**Gate:** fixture and clearance tests across archetypes, patrol near real threshold, no invalid cross-wall movement.

### E3-B: Personality-linked initiative
- Aggressor: bounded short reposition or pressure advance only toward genuinely confirmed/recently seen positions, never on stale precise coordinates. Guard: protect sector/objective. Cautious: conceal, hold or retreat.
- Cooldowns, valid exit, exposure calculation, line-of-fire clearance, fatigue/stamina and group conflicts; no omniscient flanks.
**Gate:** personalities yield distinct sampled actions but same evidence access; no oscillatory chase.

### E3-C: Resolve and surrender presentation
- Connect existing `moraleResponse` to safe-exit availability, own injury, observed ally casualty, active suppression and local audible ally cues. Surrender only when reasonable, keep capture objective correctness.
- Preserve current health/down/surrender semantics until formal neutral actor state; visual surrender cues derived from authoritative event, no extra instant death.
**Gate:** surrendered actor never shoots, injured retreat is legal, no death misclassified as surrender.

## E4 — Mission purpose and environment agency (items 8, 9)
### E4-A: Mission role goals
- Only when warned or confirmed evidence exists: capture target seeks escape/hide, guard responds to protect target's last known position, reserve reinforces credible reports, lookout verifies visible external activity.
- Mission targets stay unique; all actions use actual collision/nav. No scenario omniscience, no objective warp.
**Gate:** stable mission completion for clear/intel/rescue/hold/capture and genuine knowledge-only target reaction.

### E4-B: Door/environment tactics
- Add measured enemy intents for closing a door during retreat, protecting an entrance, and choosing another **known reachable** passage; tie each to existing door interaction, collision, acoustic evidence and replay.
- Optional light and movable-cover interaction only once shared physical rules exist; do not fake a disabled light visually.
**Gate:** closed/held/locked leaf, partner door, no pass-through, sound event truth, finite retries.

## E5 — Realistic population and neutral occupants (item 10)
### E5-A: Scenario population contracts
- Separate minimum hostile counts by **mission validity**; eliminate default min-two guard only after clear/capture/hold objective rules and zero-hostile debrief are proven. Keep old seeded distributions compatible where needed.
- Explicit `allegiance` / threat capability; unarmed civilians never inherit hostile target lists or firing scripts.
**Gate:** 0/1/many-threat scenarios, capture always unique real target, all extraction contracts resolve.

### E5-B: Neutral behavior and identification
- Add neutral visual identity, unarmed response model (freeze, flee, hide, surrender), physical movement and injury, clearly distinguish target vs threat by player observation.
- Player/AI firing safety, rescue/escort correctness, noncombatant penalty and replay truth. No invented hostiles or instant hidden intel.
**Gate:** no shootable-faction shortcut, no neutral combat AI, no mission deadlock, mobile clarity.

## Release checkpoints and cadence
- **Batch E1:** E1-A/B/C awareness + search. Only after these pass is it appropriate to merge E1. First scope emphasizes observed-contact fidelity.
- **Batch E2:** E2-A/B team tactics. Depends on E1 stable knowledge.
- **Batch E3:** E3-A/B/C human behavior. Depends on E2 commitments; avoid expanding worldgen and runtime in one giant change.
- **Batch E4:** E4-A/B missions/environment. Depends on credible routing and stable mission objectives.
- **Batch E5:** E5-A/B population+neutral actor invariants; highest regression risk, isolate until tested.
- Each *completed* substage is committed to the same feature branch, not main. Compatible substages can be grouped under one draft PR; don't make a prod deployment for a mere docs or test update.
- Critical tests per affected module + existing `awareness-*.test.mjs`, targeted mission integration, `npm run check`, `npm run build`; choose a small seeded simulation audit. Full 330-site matrix only on demand/major population changes.
- At checkpoints: update feature branch with latest main, verify focused CI, **check previous GitHub Pages workflow finished successfully and public site serves its expected build**, then merge exactly one compatible release batch.
- If prior deploy running/queued, continue feature-branch work instead. If it failed, diagnose deployment blocker before further main merges.
- Validate substantive AI claims via scripted encounters and real phone review; host CPU timing is not iPhone FPS. Collect event logs for first sound, suspicion stages, first contact, warning deliveries, search completion, cover moves, surrender and actual objective completion.

## Acceptance scenes
1. Faint footstep turns a head; second independent clue escalates; quiet recovery is gradual and bounded.
2. Kick behind closed door alarms only enemies who hear it; nearby watchers choose protected positions.
3. Enemy loses sight at corridor; searches remembered geometry, finds empty space, reorients and eventually stands down.
4. Guard hears shouted contact, sends investigator and covers entry; separated unheard guard keeps their existing job.
5. Shooter crouches behind valid cover; stands when only higher muzzle clears, and never shoots through teammate.
6. Multi-stop garage worker checks actual bench/storage positions without clipping props or suddenly knowing players.
7. Injured isolated defender retreats/surrenders believably; healthy defender with allies may hold.
8. Warned capture target moves by a valid route, with capture still completable.
9. Enemy closes real doorway on withdrawal, with synchronized nav, LOS, acoustics and replay.
10. Mission-valid site has no armed threat but neutral occupants; no invented contact or hard-coded 'two hostiles' debrief deadlock.
