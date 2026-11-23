# R7.1 — Separate Session lifecycle bookkeeping from HUD rendering

**Base:** `f4e42cbfc9168d25a8eb1401489b40d4eebb28ef` (R7.0 merged, public Pages verified).
**Branch:** `refactor/r7-1-lifecycle-notifications-20261123`.
**Goal:** remove Session/replay/campaign bookkeeping from `updateHud()` without altering 60-Hz simulation authority, gameplay, historical replay evidence, mission/portfolio outcomes, or the current HUD refresh cadence.
**Risk:** high for historical capture/completion, low for visual code. **Release:** exact tested PR head, verified prior Pages, squash merge, exact new public Pages stamp.

## Existing source authority and known behavior

R7.0 identified a specific semantic crossing in `src/breach-main.ts::updateHud()`. Today the read/paint function also calls `appFlow.observePhase(state.phase)`, `recorder.capturePlanning(state)` while live and planning, and `campaignFlow.recordCompletedOperation()`. The latter owns Campaign result persistence and Quick Play operation history, guarded by the actual Session object, `started`, terminal phase, replay/training/mode and active contract. `MissionRecorder` already captures fixed simulation evidence at 60 Hz in `src/breach-runtime-loop.ts`, while `MissionRecorder.capturePlanning()` records deduplicated same-tick authored plan revisions. `BreachMissionController.captureBeforeExecution()` already forces a pre-GO snapshot. None of these owners should be replaced.

The live RAF refreshes the **HUD** at **120 ms (planning), 180 ms (running), 750 ms (terminal)**. Explicit command/selection callbacks also update it immediately; photo mode suppresses scheduled HUD work. This visual cadence must not become the mission-result clock. The report explicitly does **not** treat a source callsite count as event frequency.

## Full implementation stages

1. **R7.1.01 — Ownership contract.** Introduce one typed `src/breach-session-lifecycle-observer.ts` with injected `observePhase` and `recordCompletedOperation` ports. It receives *the current* Session, recorder, and replay state, not cached gameplay state. Only this adapter decides when to ask the existing owners for planning-revision capture and terminal result recording. No DOM or Three.js imports, second simulation, save implementation, mission result construction, or new store.
2. **R7.1.02 — Terminal/session identity.** Observe authoritative phase after simulated ticks and at explicit event boundaries, independent of whether the HUD repaints. Call the existing Campaign/Quick Play completion owner at most once per actual terminal started Session; exclude training and replay via the original flow guard. Remember Session object identity, not seed: restart/new mission with an identical seed is a distinct mission; imported replay state cannot earn new history. Do not mark completion on planning, pause, or ordinary running.
3. **R7.1.03 — Planning replay capture.** Continue calling `MissionRecorder.capturePlanning()` for live planning, including immediate command/edit callbacks; never record while in replay. Retain `MissionRecorder`'s capped/deduplicated same-tick plan revisions and the existing `captureBeforeExecution` before GO. The independent RAF lifecycle observer acts as a fallback for non-UI authoring; repeated no-change observations must not create extra revisions.
4. **R7.1.04 — Pure HUD presentation.** Remove `appFlow.observePhase`, `recorder.capturePlanning` and `recordCompletedOperation` from `updateHud()`. Keep selection/WATCH reconciliation, UI rendering, briefing/deployment, notice provenance, training presentation and replay UI behavior intact. Player-initiated update ports use an explicit `refreshTacticalUi()` adapter that observes current lifecycle **before** rendering, including callbacks supplied to toolbar, pointer, campaign, replay library, Studio and tactical palette.
5. **R7.1.05 — Independent per-frame handoff.** Add an optional, single post-step `observeSessionLifecycle` hook in the existing `createBreachRuntimeLoop` (not an extra RAF or clock). Invoke after all 60-Hz `stepSession`/recorder captures and replay-advance processing, before UI/render. This ensures terminal bookkeeping is not contingent on the 750 ms terminal HUD refresh, and planning capture remains possible without a UI repaint. Keep the exact 120/180/750 ms display scheduling and the existing single RAF owner.
6. **R7.1.06 — Mission/replay boundaries.** Session transition, restart, Quick Play generation, insertion selection, replay entry/exit, imported archive, pause/GO and Training must not retain a stale lifecycle receipt or capture recorded history from the replay Session. Observer receives the Session and recorder on every call; no lifecycle closure holds the previous snapshot. Explicit event callbacks remain synchronous.
7. **R7.1.07 — Regression and architecture audit migration.** Add synthetic and real Session/Recorder/60-Hz tests: multiple same-tick authoring changes, non-UI plan mutations, GO, terminal idempotence, replay isolation, identical-seed new Session, no absent/incomplete receipts, strict HUD absence of bookkeeping, runtime call ordering and unmodified cadence. Migrate the living R7.0 fail-closed owner/edge audit and tests from the old crossing to the new owner, rather than deleting its owner checks. Reuse existing architecture gate; no new workflow or relaxed physical acceptance.
8. **R7.1.08 — Exact-head release.** Typecheck/build, CI/regression specialists, live-acceptance gates triggered by routing, release readiness and previous Pages stamp; merge only if all required checks are green and main is reconciled. Verify the public Pages build stamp against the merged commit.

## Invariants and explicit exclusions

- `stepSession` remains the only 60-Hz simulation authority, one pass per existing fixed-step tick; no new loops, scheduling, or route writer.
- `MissionRecorder.capture()` remains immediately after `stepSession` in the same loop. `captureBeforeExecution()` runs before toggling GO. Same-tick plan revisions remain immutable and in order.
- `campaignFlow.recordCompletedOperation()` remains the *only* side-effecting owner of debrief and Campaign/Quick Play persistence. Do not recreate its domain rules or output schema.
- Observe only live Sessions. Replay may render and seek without new planning, career credits, or duplicate operation history.
- HUD remains immediate on explicit actions; no extra per-tick HUD repaint, no changed 120/180/750 ms cadence, no new full-DOM rebuild. Selection, WATCH, target indicators, notice reset and action feedback must not regress.
- No change to gameplay physics, fog disclosure, missions, worldgen, inventory, visuals, operator pose, Campaign serialized format or UI CSS. A terminal receipt may now be committed promptly after the terminal simulation tick, before the next scheduled HUD paint, but it retains the same actual Session outcome and once-per-session rules.
- A static source audit cannot assert user device performance; R7.2 owns measured DOM/latency optimization.

## Evidence and acceptance

Focus commands:

```sh
node --experimental-strip-types --test tests/r7-1-session-lifecycle.test.mjs
node --experimental-strip-types --test tests/breach-runtime-loop-step12.test.mjs
node --test tests/r7-0-ui-orchestration-audit.test.mjs
node scripts/verification/r7-0-ui-orchestration-audit.mjs --check --out artifacts/refactor-r7-0
npm run build
```

Run these in the existing architecture-critical workflow and retain its regression/release matrix. The test must verify the **real** `MissionRecorder` journal and actual 60 Hz `stepSession`, not a fake outcome frame standing in for gameplay. The lifecycle observer's minimal injected ports may be unit-tested with fake completion counters, but do not claim an end-to-end Campaign save by inspecting just those counters.

## Release and rollback

Reconcile with concurrently advancing `main`; do not overwrite unrelated changes. Last PR head must be the exact SHA with green required tests, typecheck and all release preflight; check earlier Pages finished and served its own SHA. Merge once; verify new Pages success plus independently verified served `fieldwork-build.json`. If a release or browser acceptance fails, fix and rerun; do not claim deployed until public verification succeeds. Rollback consists of reverting the R7.1 branch/merge while keeping the R7.0 audit evidence. R7.2–R7.5 remain future phases.
