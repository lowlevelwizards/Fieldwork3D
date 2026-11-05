# Fieldwork Breach — E5-B Living Civilians: build specification
**Prepared:** 2026-11-05
**Status:** IMPLEMENTATION PLAN ONLY. No E5-B runtime behavior has been implemented by this document.
**Dependency:** E5-A sparse-population PR #894 is currently draft and unmerged; validate its corrected zero-/one-hostile path and release it independently before enabling civilians in production.

## 0. Design thesis
A civilian is an actual, neutral person in a coherent site: present before the raid, doing something plausible, making decisions from personal sensory evidence, occupying physical space, and vulnerable to real shots. A civilian is NOT a reskinned hostile, an alternate red actor, an armed AI whose shooting has been disabled, an objective marker, or a convenient source of omniscient enemy information.

The player controls all tactical pauses. Revealing a civilian does not force pause, interrupt the GO state, or issue squad orders. Encounter sound and navigation still obey the same rules for all actors.

## 1. Baseline and integration risks (verified in main)
- src/breach-core.ts: current Side and base tactical team distinguish blue/red.
- src/breach-game.ts: TeamActor contains the complete combat kit; Session.operators hosts playable operators and red hostiles. team()/enemies() are hostile/squad-specific helpers; enemyDecisions runs only armed defenders. World intel/confirmedSight, health, fire(), mission stages and physical actor movement are in this file.
- src/worldgen/encounter-types.ts: EncounterPlan version 1 actors are hostile-role specs. Do not reinterpret existing "occupant" role as neutral: it is currently armed.
- src/breach-main.ts: 2D markers draw enemies from enemies(state), and the rescue objective is a separate CIV marker. All newly visible civilian presentation must respect LIVE cone/LOS intel rather than whole-room reveal.
- src/breach-3d.ts: the rescue person is a one-off CapsuleGeometry/SphereGeometry presentation figure, not a full TeamActor. Replace it only when the new civilian rescue actor is authoritative. Its art also needs the chunky cuboid form language.
- src/breach-replay.ts: actor frames are generated from Session.operators and rescue is a separate position/follower record; neutral actors need explicit deterministic snapshot/motion storage.
- src/breach-game.ts fire(): auto-acquisition filters red/blue enemies, and shot damage normally resolves against the chosen target. A physically traced shot has to consider an intervening bystander rather than silently passing through them. Do NOT grant hidden civilian coordinates to the auto-fire safety/decision layer.
- Existing E5-A draft: encounter-population-contract.ts, E5-A spawn and mission floor, and zero-/one-hostile session safety. Civilians cannot release on top of an unverified sparse-population transition.

## 2. Invariants
1. No civilian is automatically attackable via standard threat-acquisition: blue auto-select red only; red auto-select blue only; neutrals never fire, reload, suppress, use hostile tactical roles or receive group-warning orders.
2. Damage is world-physical: a bullet or blast that actually intersects a neutral may harm it. Physical impact order is nearest eligible body/solid barrier first, with material penetration rules unchanged.
3. Do not make unseen civilians a magical reason for the game to suppress blue shots; pre-fire protective vetoes use confirmed observations, while post-ignition ballistics use physical world truth.
4. Per-civilian perception only: sound via existing acoustic interpretation; vision via existing geometry and awareness threshold; testimony only if physically heard. No knowledge of concealed operators or guards, no instant knowledge that someone has died in another room.
5. Shared collision semantics: capsule/body swept clearance, doors, hinges, windows, cover, actor spacing, route recovery. No teleport, no clipping into inaccessible furniture, no blocked-door retry loop.
6. Distinct from mission objectives. An ordinary bystander does not count toward the hostile threshold, capture target, rescue target, hold contest, or squad death. Real rescue target is one uniquely identified neutral with objective-specific behavior.
7. Operator cone reveal only; player-facing text and markers never expose hidden neutral identity, position, state or killer. Full post-mission audit may disclose ground truth.
8. Quick Play resets all neutral events and injuries per mission; Campaign persists only explicitly recorded outcomes with correct id mapping. Replay rewinds do not re-simulate AI or reassign civilian states.
9. Deterministic fixed-step updates and seeded behavior. Sparse population remains allowed; zero civilians remains a valid outcome.
10. Strong silhouettes with minimum viable chunky shapes; neutral visual identity not based solely on bright faction colors; no soft rounded rescue capsule, realistic-looking detail clutter, or second full wardrobe engine.

## 3. Data and code contract
Stage B1 adds src/breach-civilian-types.ts and a bounded array Session.civilians: CivilianActor[] INDEPENDENT of Session.operators.

CivilianActor: id; p; priorP; heading; velocity; posture (stand/crouch/seated/down); health (and simple injury severity); radius; bodyHeight; state; persona; activity; routine[]; routineIndex; dwellUntil; homeZoneId; knownEscapeZones[] (own witnessed/seeded room connections only); awareness (visual or acoustic clues); fear [0..1]; lastEvidenceId; lastEvidenceAt; currentGoal; route[]; blockedTime; retryAt; stateSince; complianceSince; lastHitAt; rescuerId?; rescueTarget boolean; originSiteSeed; appearanceId/seed. Record enough deterministic state for real replay.

CivilianState:
- routine (working/waiting/visiting/inspecting/seated)
- attentive (head-turn, wait, ask/verify)
- startled (short processing dwell)
- frozen (stationary; turn toward credible danger)
- fleeing (physical movement away from evidence)
- hiding (move to checked local cover/occlusion; remain inside known area)
- compliant (hands up, do not flee)
- escorted (follows physically with separation rules)
- wounded (restricted movement; may call out)
- incapacitated (motion and autonomous actions disabled)

Movement and injury fields must not be copied from a full armed TeamActor. Extract a small shared physical body/motor contract in src/breach-movement-authority.ts or a new adapter; keep combat-only fields out of CivilianActor. Never cast a civilian as TeamActor to satisfy a function signature.

Site.encounter.neutrals?: CivilianSpec[] is additive on existing EncounterPlan version 1 during migration, then the schema version may become 2 only with compatibility tests. Proposed CivilianSpec: id, groupId, persona, role, p, heading, activity, homeZoneId, routine, responseProfile, appearanceSeed, isRescueTarget. Explicitly validate id uniqueness, zone, reachability and mission linkage.

New runtime modules:
- src/breach-civilian-types.ts: schema, creation and normalization.
- src/breach-civilian-evidence.ts: actor-local sound/visual event conversion and bounded memory.
- src/breach-civilian-policy.ts: pure state machine, fear, cooldown/hysteresis, goals.
- src/breach-civilian-movement.ts: bounded candidate selection, physical motor/door checks.
- src/breach-civilian-harm.ts: civilian injury/event/mission penalty.
- src/breach-civilian-visuals.ts: minimal voxel shared geometry/pose presentation.
- src/worldgen/encounter-civilians.ts: seeded site-aware population, legal spawns and initial routines.
- src/breach-civilian-mission.ts: rescue/escorting integration, one authoritative target.

Refactor only the necessary shared movement, perception and hit-resolution primitives; avoid a second simulation or global giant class.

## 4. Stages, commits, and explicit acceptance gates

### E5-B0 — dependency and safety baseline (no gameplay behavior)
- Confirm E5-A current branch is green after integrating latest main, generated zero-/one-hostile missions and site audit are consistent, successful Pages deployment/public build ID.
- Freeze a small seed list for CLEAR/INTEL/RESCUE/HOLD/CAPTURE across small/standard/expanded, three representative archetypes and two intel modes.
- Record baseline unit tests: current combat targeting, no normal auto-fire at civilians, mission completion, core 2D/3D visibility, replay, mobile CPU.
Gate: E5-A independently releasable before neutral population is enabled.

### E5-B1 — neutral schema, separate authority (low risk)
- Add CivilianActor + Site optional specs + Session.civilians. Populate zero civilians by default.
- Helpers civilians(s), activeCivilians(s), physicalBodies(s) to replace only those shared collision/impact loops needing neutral bodies. team/enemies semantics unchanged.
- Deterministic identity (e.g. civ:seed:index), stable optional schema defaults, no saved-game or replay breakage.
- Guard all combat entry points from a civilian id: no weapon fields, no target selection, no AI scheduler classification as red.
Gate: typecheck, old missions, zero neutral unchanged; explicit tests that civilian is never team/enemy and cannot call fire().

### E5-B2 — site-aware population and physical placement
- Initial site caps, adjustable after perf measurements: small <=2; standard <=4; expanded <=6; absolute cap 8. 0 is common for vacant, closed, defensive/after-hours properties.
- Genre context: house/townhouse/apartment resident/visitor; retail customer/employee; office employee/reception; restaurant diner/staff; garage worker/customer; warehouse/utility employee; clinic staff/patient; motel guest/staff. Keep archetype mapping coherent with room purpose and building identity.
- Sequence: plan hostiles first; reserve separate neutral budget; select actual functional anchors; validate 20+ unit wall clearance, door swings, collision, no overlap with insertion or objective markers, room capacity, route to at least one legal local routine stop; drop a candidate rather than force it.
- Capture/rescue mission rules override population choices; rescue target is unique, cannot be replaced by an arbitrary bystander. Do not create invisible hostiles or require a hostile presence on an otherwise safe site.
- No automatic civilian grouping with armed guards unless scene semantics justify physical co-location.
Gate: 40–60 representative generated sites, no invalid or non-deterministic points, no objective overlap, no placement outside accessible rooms/exteriors.

### E5-B3 — routine life before contact
- Four initial activities: idle/wait, seated, work, walk-and-inspect. Use meaningful 2–4 station routes from existing real furnishings; no generic patrolling guard route.
- Each actor uses persona-specific dwell, e.g. brief errands vs long stationary work; movement interruption resumes only when calmer. Use deterministic per actor seeded offsets; no repeated world RNG draw at each frame.
- Shared collision and opening physics, keep feet planted when idling. No guaranteed movement for every occupant.
Gate: idle site looks naturally occupied after 20s, zero wall/cover clips, bounded route retries.

### E5-B4 — sensory and response behavior
- Classify observed clues: footsteps/door noise -> attentive if close enough; glass/kick -> startled; gunshot, visible weapon threat, visible injury -> strong fear; spoken orders within genuine acoustic range -> compliant response opportunity.
- Civilians have NO omniscient shooter/hostile coordinates. Use interpreted sound estimate+uncertainty and actually seen actors, not ground-truth threat position. Never propagate a global panic flag.
- Transition hysteresis: routine -> attentive -> startled -> one of frozen/fleeing/hiding/compliant; fresh danger may interrupt routine. Compliance suppresses flight; a wounded actor may remain pinned. Fear dissipates gradually after credible quiet.
- Persona weights (cautious/bold/startled) affect delays, never grant different visibility physics.
- Choose refuge among actual reachable known exits or furnishing occlusion points; prefer movement away from believed danger and toward safety, not direct chase of hidden actor. If physically trapped, freeze/crouch/call out; do not loop against a blocked doorway.
Gate: one sound behind solid wall gives uncertain/local response; distant unheard person continues work; no all-building instant panic; repeated cues do not stack infinitely.

### E5-B5 — physical collision and gunfire integrity (high risk)
- Shared capsule body actor registry for movement and shots; civilians cannot pass through doors, walls, furniture, the player, or each other. Reuse cooperative avoidance and retry limits but no yielding that rewrites authored player waypoints.
- Factor actual fired-ray/body intersections from a selected-target-only shortcut into a bounded ordered hit resolver. Respect cover/doors/glass and existing actual weapon-height mechanics. The earliest actual physical event wins; preserve armor and material rules for soldiers.
- Auto-targeting stays red-only for blue, blue-only for red; no auto-targeting civilian ever. Confirmed civilian in lane triggers a clear 'FIRE BLOCKED — CIVILIAN' feedback (only if already observed). Unknown civilian has no magical veto; true bullet impact still applies and becomes known only when witnessed.
- Deliberate area suppress: do not automatically hit civilians because of radial proximity; only an actual shot path can. No fake ricochet unless a tested penetration model supports it.
- Civilian wounding: at least unharmed, injured, incapacitated; distinct noncombatant-harm event. Rescue target is not instantly deleted when down.
Gate: ricochet-free ordered hit matrix: civilian between muzzle/hostile, behind penetrable cover, unseen behind solid wall, behind teammate, glass barrier, crouched profile; all actual shot events agree with hit victim id and replay. Critical existing fire-safety and damage tests green.

### E5-B6 — visual, identity and phone UX
- A small voxel civilian family: 2–3 strong clothing silhouettes (plain top/trousers, coat/jacket, workwear) composed of big flat cuboids, not capsule+sphere; civilian is unarmed, no rifle or tactical vest.
- Simplified head, torso, arms, pants, feet with seeded muted materials. Body proportions close to game figures, perhaps softer/noncombat stances but same world scale and coherent minimum voxel step. Distinct standing, running, crouch/hide, hands-up, seated and down poses with no new full IK runtime.
- Visual identification uses silhouette and animation primarily, not neon highlight or a big HUD faction label. A small civilian cue may appear only AFTER confirmed sight/recognition and at adequate screen scale; no info through fog or in still-unseen room. Preserve entire operator cone rules.
- Rebuild rescue stand-in only once authoritative rescue target actor is active. Both 2D and 3D draw from the same civilian actor state; model pooling and shared materials, lazy creation while not observed.
Gate: screenshots in 2D and 3D at minimum phone zoom; identity legible next to guards/operatives, no hidden render leakage, no environment redraw on routine pose changes.

### E5-B7 — mission rules and respectful interaction
- Ordinary civilian does not count as a hostile, does not complete CAPTURE, does not stop HOLD timer, cannot collect INTEL, and does not satisfy RESCUE.
- One rescueTarget id tied to the existing rescue mission. Transition old RescueEscort compatibility data to target actor state: physically follow verified rescuer, lose following on separation/blockage/incapacitation, never cross shut door, recover contact at actual proximity, extract only if person physically reaches extraction. If target incapacitated, require recovery/carry only after physical carry mechanics and clear UX exist.
- Minimal civilian order set: contextual **REASSURE/SECURE** or **MOVE WITH ME** for rescuer, with actual reach and LOS; do not flood the combat palette with four new buttons. Commands can fail understandably rather than teleport a civilian into compliance.
- Civilian harm is counted separately from squad casualties and enemy kills. Escalate score consequences for noncombatant injuries/incapacitations; do not fail every mission by mere existence of a casualty unless an explicit mission contract requires protection. Campaign records only explicitly implemented persistent consequences, not guessed fatalities.
- Distinguish enemy surrender from civilian compliance: capture target remains mission-defined hostile target even when surrendered; a civilian hands-up pose is not capturable or kill-credit.
Gate: all five missions complete legally with 0/1/many neutrals; rescue cannot duplicate people; civilian harm cannot count as enemy kill, and no objective is remote-interactable across walls.

### E5-B8 — replay, save, diagnostics and performance release
- Replay neutral actor samples at current fixed 20 Hz recording cadence, including id, p, heading, state, pose, health, rescuer id. Record event IDs for sighted startle, audible panic, compliance, injury, casualty, objective link; snapshots rewind safely and no double consequences on scrub.
- Distinguish post-mission omniscient review vs live spoiler-free replay. On live replay, hide neutral bodies outside historical operator visibility; never retroactively reveal future movement.
- Version-migrate optional fields; missing civilian data means [] and original rescue fallback; avoid deeply copying unchanged site routines each replay frame.
- Reuse P5 elective scheduler at lower priority than urgent armed AI/door events; consider civil decision tick every 0.12–0.20s and act-motor fixed step. Route requests only when goals change or fail, not every frame.
- Measure real iPhone 4-operator/6-civilian scenes: cold Quick Play load, GO spike, 3D orbit, fog, replay scrubbing, heavy contacts. Suggested release caps are provisional; profile and reduce them if worse than current baseline.
Gate: stable deterministic 60 Hz sim, no priority inversion for armed AI, no new replay memory spikes, source-identical Pages stamped verification.

## 5. Proposed release batches (no deployment per substage)
**Civilian Release N1:** B0+B1+B2. Separate neutral identity and safe seeded population, no AI/wounds. Use a development toggle until behavior can be judged.
**Civilian Release N2:** B3+B4. Contextual routines and evidence-driven responses. Keep developer-only visibility if UI is not ready.
**Civilian Release N3:** B5+B6. Physical impacts and unmistakable chunky visual identity. Highest-risk batch; require extra ballistic regression.
**Civilian Release N4:** B7+B8. Real rescue migration, mission scoring, replay/campaign and mobile performance. Publicly enable after verifying previous release.
Each stage commits separately to a feature branch. Compatible stages may share PR if CI is green. Before any main merge: check newer main integrations, previous Pages success and actual public build stamp; on failure fix the blocker, no piling releases. Only run critical tests plus small controlled seeded matrix, not all test families on every commit.

## 6. Acceptance scenes — test fixture specifications
A. Quiet family house: person working, person seated; both occupy real room, neither becomes 'hostile occupant'. A faint distant step produces no global alarm.
B. Locked hallway door: a person behind it reacts only if acoustics carry the sound; a closed/held door physically stops their attempted escape.
C. Sudden visual entry: operator reveals one civilian; person startles and freezes, turns, then decides to comply or flee. Unseen neighboring room not revealed.
D. Gunshot in market: nearby exposed people freeze/duck/flee with different seeded delays; far isolated employee continues until actual acoustic evidence arrives.
E. Person between red attacker and blue shooter: blue acquired target remains red; observed civilian in fire lane prevents automatic shooting; an actually fired physical shot can hit the civilian when line is not pre-vetoed.
F. Neutral down behind cover: blood/decal/body state and replay show the actual hit; world does not treat it as a hostile neutralization.
G. Rescue escort: single identified civilian follows an actual operator through a real open doorway; separation pauses following; extraction requires target present; no duplicate 3D capsule.
H. Capture target surrenders with two bystanders present: ordinary civilians do not substitute for capture target, and enemy surrender is not treated as civilian compliance.
I. Vacant intel site with zero defenders and zero civilians remains valid; all preexisting objective and exit logic works.
J. Four-operator dense office with six civilians: tests for route convergence, no stuck crowd, bounded CPU, 3D and Floor Plan fog, consistent replay at phone scale.

## 7. Instrumentation and provisional numeric criteria
- Test sample: 11 building types x five missions x small/standard (smoke via 1–2 seeds per combination); larger seed matrix at final N4 checkpoint only.
- Fail for ANY: civilians are auto-targeted, phantom hostile, unseen location shown, objective deadlock, through-wall/door passage, replay divergence, nonphysical shot victim, failed existing damage/mission tests.
- First-response delays: broadly 0.2–1.2s depending cue/temperament, with a distinct short startle and nonzero decision time. Calibrate via fixed-seed film, not a single universal timer.
- Goal reconsideration: >=0.7s unless new imminent evidence; search destination pool <=6; no per-tick reroute.
- No strong promises on mobile FPS until actual on-device timings; compare to measured baseline and retain safety-first graceful reduction of civilian population/visual detail when overloaded.
- Capture audit data: event id, source, listener, strength, first perceived time, selected civilian state, route candidate and legal rejection cause, damage victim, replay visibility, rescue separation.
