# Release 4 — Planning Clarity & Movement Polish
Draft PR #1269. Starting main: bbafaf04071f54801eb4ef72f84d8fdc372c8cf2.

## Scope and existing-system responsibility
- **R4.1**: moving unarmed planning cursor previews paths using player intel only, not authoritative physical world. A small time-and-cell cache limits path computations; normal/narrow/unavailable are conditional estimates, not guarantees.
- **R4.2**: Floor Plan and 3D highlight *known narrow* routes. Floor Plan also displays node posture/pace/fire intent, while existing persistent WATCH remains the source of truth. No new overlay pass or extra hidden geometry lookups.
- **R4.3**: deterministic shallow transient motor-corner skip only when full-radius swept collision is lawful, disabled around door entry, squeeze, stuck recovery, and fixed WATCH. Does not change authored PlanNode history.
- **R4.4**: a partially moving/opening door is not interpreted as a permanent narrow wall. Closed leaves and advancing hinges delay squeeze, with all existing oriented collision rules retained.
- **R4.5**: preserve first/last touch endpoints, meaningful turns, and known-geometry-required points; prune only short nearly collinear authoring strokes, maintaining existing one-undo transaction.

## Deliberate exclusions
No new omniscient plan validation, gameplay route authority, animation graph, camera pipeline, AI planning, enemy population, procedural generation, replay schema, or global frame-rate task. Avoid repeated dynamic per-frame A*.

## Release checkpoint
- [ ] New route preview, intent, corner, squeeze and touch-spacing tests
- [ ] Existing gesture/stroke, four-operator passage, 60Hz motor, visibility and replay regression
- [ ] Production typecheck and build + architecture/release-readiness
- [ ] Exact head real WebGL tactical phone/desktop, replay/bodycam, Operator Lab
- [ ] Previous production Pages successful, served build equals current main and no active deploy
- [ ] One PR merge, one Pages release, verify exact public served SHA
- [ ] Manual physical iPhone Safari playtest remains separate
