# Consolidation Package C — C7: Mission & Faction Semantics

**Starting main:** `dced6648e83572cabe197da556fe59ec783269c2` (merged C6).
**Feature branch:** `refactor/consolidation-c7-mission-faction-semantics`.
**Release policy:** Commit stage separately; merge only at an uncongested checkpoint after exact-head tests and a successful prior Pages deployment.

## Objective and ownership

Consolidate the *meaning* of a mission while leaving the C6 physical world untouched. The generator retains room topology, density, cover, windows, spawn solver, RNG lanes and positioning. The runtime Session remains the actor and objective authority; an EncounterPlan remains a seed-derived proposal with physical placements; the briefing and After Action describe what actually exists. Appearance references are not faction AI. Replay, saved plans and scenario overrides are never re-rolled as a migration side effect.

## Audited gaps

- Default mission kind was independently selected in `breach-site`, `worldgen/encounter-director` and `breach-session-factory`. The factory ignored `encounterContext.mission` or a saved encounter's mission when constructing the live Session without an explicit override.
- Deliberately selecting a different operation on a prebuilt site is supported by legacy tests. It must be recognized as an *override*, not treated as a generator defect; original physical actors must remain in place.
- The briefing counted weapons described in the encounter plan even if a legacy manifest instantiated a different number of actual hostile actors.
- Capture targets rely on the encounter ordering, while old studies and overrides require a deterministic first-hostile fallback.
- Hostile groups and neutrals have distinct plan types, but consistency of IDs, group membership, targets, physical anchor parity and minimum armed presence lacked a bounded semantic report.
- Cosmetic faction-reference catalog and enemy equipment presets have no legitimate authority over an actor's `side` or over civilian firing powers.

## C7-A: One deterministic mission identity

Define `OPERATION_KINDS` and `missionForSeed(seed)` in `breach-operations.ts`. Site layout compilation and encounter planning use the same seed-derived default, preserving the previous five-operation order and RNG. Session assembly resolves operation as **explicit override > requested encounter mission > saved encounter mission > site's seed mission**. Fixed study without a site remains CLEAR. Do not mutate saved plan metadata or generated geometry to make a different mission override look like the original intent.

## C7-B: Force and objective authority

`breach-mission-semantics.ts` supplies the pure, narrow force classifier for existing combatant sides. Friendly and hostile TeamActors remain separate from neutral CivilianActors; no new live faction enum or invented affiliation is serialized. Target selection uses the actual instantiated hostile order and the plan's CAPTURE target role, retaining a first-hostile fallback for legacy/explicitly re-tasked prebuilt sites. Rescue uses the existing real person or legacy escort—never a fabricated second population. Hold, intel and clear retain their existing mission-state machine, timing and extraction rules.

## C7-C: One resolved population summary

`resolvedMissionPopulation` counts instantiated hostile and neutral bodies and checks whether the capture/rescue targets truly exist. Armed-profile accounting reads aligned encounter specs, but falls back conservatively on mismatched legacy plan counts. `compileMissionFacts` consumes this summary; player briefings do not acquire live enemy coordinates, secret roles or extra tactical intelligence. Dormant optional neutral plans do not imply active civilians.

## C7-D: Offline semantic validation

`auditMissionScenario` detects:
- Encounter/site building and scale divergence; mission mismatch with explicit override marked advisory.
- Physical spawn-anchor and placed-count mismatch, invalid hostile floor, excess budget.
- Duplicate hostile/group IDs, missing or orphan group memberships.
- Missing/duplicated capture target, targets on non-CAPTURE missions.
- Duplicate neutral IDs, overlap with hostile IDs, invalid civilian home rooms and duplicate rescue objectives.

The audit is **explicit and read-only**, returning typed errors and advisories. It does not run per game tick/frame or inject generator retries, AI omniscience, geometry changes or player-visible disclosure.

## C7-E: Regression and persistence

- Tests exercise real small generated worlds and all five default missions, deliberate prebuilt override, requested CAPTURE, physical spawn and group invariants, civilian activation, briefing truth, restart isolation and malformed synthetic plans.
- Bounded offline check generates a small seed set on demand, constructs actual Sessions without re-running the generator and fails on semantic disagreement.
- Preserve existing mission snapshots, recordings, replay frame schemas, faction visual reference choices and A/B/C0–C6 tests. New implementation uses no persistent fields or save migrations.
- Run production TypeScript/build, mission/encounter/restart/briefing, dedicated Package C checks and, before merging, inherited replay/WebGL critical gates. Actual iPhone Safari hardware/thermal testing remains manual.

## Exclusions and hazards

No new mission mode, target behavior, civilian lethality, new factions, actor equipment changes, narrative x-ray, enemy placement, seed rotation, map regeneration, AI tactics, C6 window colliders or visual/renderer work. Empty non-combat scenarios remain legal only under the existing minimum-population contract. Old prebuilt maps lacking plans keep their legacy fallback rather than receiving a speculative repair. The offline auditor is for developer diagnostics, not briefing or tactical contacts.

## Completion ledger

- [x] C6 baseline, overlapping owners, mission-selection drift and legacy override behavior audited.
- [x] Shared mission selection, force classification, capture fallback, and population facts implemented.
- [x] On-demand semantic audit implemented without live/worldgen mutation.
- [x] Focused tests, offline survey and Package C gate extended.
- [ ] CI critical tests and production build validated for final feature commit.
- [ ] Safe release checkpoint (if merged): verify previous Pages, merge and verify exact new served SHA.

**Next C8 handoff:** Consolidate remaining cross-feature presentation seams only after C7 semantic CI and deployment conditions are met; avoid changing world generation or replay evidence to solve semantic discrepancies.
