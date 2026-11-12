# Consolidation Package C — C5: Replay & Director Tool Consolidation

**Baseline:** `bd7dd8f1e9eca653f032ae0da16ae17f136ea154`, merged C4 and subsequent Arsenal/door-order release, public Pages run `43248658276` successful.
**Branch:** `refactor/consolidation-c5-replay-view-ownership`.
**Stage owner:** Existing `ui/breach-replay-hud-controller.ts` / `breach-replay-camera-controller.ts` / `breach-replay-mode-controller.ts` / `breach-replay-knowledge-controller.ts`. C5 does **not** create a second replay orchestrator.

## Objective and contract

Replay is **recorded history**, not a live tactical Session. Give all explicit operator-follow and Director entry controls a consistent camera/UI transition path. Share repeated historical visibility refreshes. Preserve film-time transport, bodycam evidence, camera editorial grading, replay display preferences and personal-ground history as separate authorities.

### C5.0 — Audited ownership and discrepancies

1. The HUD's `followReplayOperator` already coordinates selected actor, camera follow, perspective, manual Bodycam exit, and historical operator disclosure. However the inspector FOLLOW button, inspector actor change while following, quick camera operator dropdown, and legacy FOLLOW cycle mutated some of those fields independently. If operator-only sight was active, some routes could follow **Moss** while still displaying **Rook** personal visibility. This is a cross-view presentation divergence, not a recording defect.
2. `breach-main.cameraMode` already resolves camera availability and writes the 3D view once. The Quick View dropdown and legacy replay perspective button each repeated `chooseReplayCamera(resolvedReplayCamera(...))` immediately after calling it. The extra mode selection can clear Director target/follow flags unnecessarily on a single view change.
3. Direct and legacy Director buttons toggle the same mode with slightly different code. They must agree on camera availability, manual Bodycam exit, Director target cleanup and follow suppression. Keep their established **direct: 1/60 second/eased** and **legacy: instant/0 second** presentation behavior; this is not a cinematic rework.
4. Historical-sight changes in the HUD repeatedly ran fog invalidation, event-index rebuild, timeline markers, event feed, and shot-inspector refresh. Several controls called subsets. The sequencing can share one **local presentation helper** while preserving the necessary optional inspector/fog work and the distinct playback/controller authority.
5. C3 explicitly tracked personal-ground Set identity to avoid stale same-size evidence. Yet replay entry and lens toggles reset only a subset of ground-cache fields inline. Cache invalidation belongs in `ReplayKnowledgeController` and must clear **observer, evidence identity, count, and site** together.
6. Keep operator contact lens, Director lens, actor inspection without follow, personal-ground lens, replay-moment filters, saved replay transport and recorded observer data **separate**. Viewing an actor is not automatically permission to view that actor's unrecorded contacts.

## C5-A — One personal-ground cache invalidation

- Add `ReplayKnowledgeController.invalidateGroundCache()`. It resets all four presentation cache keys without touching `personalGround` history, `observerId` or omniscience.
- `prepare(recorder)` already invokes `reset()` and thus invalidates the cache; replay entry should not clear individual fields again.
- Explicit personal-ground lens toggles use the complete invalidation owner. Canvas rendering still depends only on recorded fine/micro cells, observer, site and evidence identity.
- No recording or replay archive schema change.

## C5-B — One operator-follow path across controls

- Inspector FOLLOW, inspector actor change when already following, quick operator camera selection, and legacy FOLLOW cycling reuse `followReplayOperator` in the existing HUD.
- Follow updates selected actor + camera follow together, reconciles the active operator observer when personal sight is selected, and refreshes recorded disclosure surfaces once.
- Operators without usable personal camera evidence fall back to **squad sight**, not Full View or the previous actor's personal evidence.
- The legacy FOLLOW cycle skips dead/unavailable operators and ends with Free, preserving click/gesture intent and no hidden state mutation.
- Non-follow inspector selection changes only the inspector selection as before.

## C5-C — Single camera-perspective transition

- The Quick View selector and replay VIEW cycle call `breach-main.cameraMode` just once per user action.
- `cameraMode` retains sole responsibility for resolving Director/Follow against 3D availability, Plan 2D, and Bodycam. No new camera object or smoothing policy.

## C5-D — Shared Director and history refresh

- Both Director buttons call one local `toggleDirector`. It exits manual Bodycam first, resolves ISO constraints, changes actual replay camera mode once, resets the old target and preserves the respective button's original easing/instant camera transition.
- Consolidate repeated HUD historical surface refreshes into `refreshHistoricalViews(inspector=true,invalidateFog=true)`, which only calls pre-existing invalidation, index, markers, feed and inspector APIs. Do not modify `ReplayEventIndex`, `ReplayDirectorController`, `ReplayPlaybackController` or historical disclosure.
- Bodycam exit should not invoke the same historical rebuild twice. The legacy Bodycam path retains its prior visibility and inspector behavior.

## C5-E — Functional tests and risk audit

Add `tests/package-c5-replay-view-ownership.test.mjs`, exercising **real HUD click/change listeners** with controlled UI and existing replay camera/knowledge owners:
- Operator-follow transitions from inspector, quick camera and legacy FOLLOW.
- Personal observer changes when evidence exists; fail-closed squad fallback when the chosen operator has no recorded personal evidence.
- Skip incapacitated follow targets, leave FOLLOW for Free after the last eligible actor.
- Exactly one view-mode resolution per Quick View / VIEW transition.
- Both Director button behaviors, current cinematic timeline owner, and unchanged historical visibility.
- Exactly one historical refresh per sight change, no transport seek.
- Bodycam exit restores follow once, not two index rebuilds.
- Personal-ground overlay cache identity reset while captured evidence remains untouched.

Retain inherited Stage 4 HUD, A5 playback/presentation, C3 replay-disclosure, camera, Bodycam, and director grading regressions. No new timers, global listeners or per-frame allocations.

## C5-F — Integration, release and C6 handoff

Extend the existing Package C PR workflow. Preserve architecture critical, production TypeScript/build, real tactical/WebGL phone and desktop, Replay/Bodycam, Operator Lab and Pages release readiness gates. Any inherited source-pattern test still expecting duplicate owners must be corrected to check *current ownership*, without dropping behavior assertions.

**Do not merge** while Pages is queued/running; verify the previous published SHA and served build first. Merge the tested, compatible feature PR once; verify the new Pages workflow succeeds for the exact merged SHA, including public build-stamp check. If another feature moves main, check PR mergeability and latest Pages publication before proceeding.

**Hard exclusions:** no replay capture or archive schema changes; no simulated sight during replay; no new cinematic shot scoring/cuts/editing; no camera lens or grading parameter tuning; no changes to simulation/AI, fog acquisition, operator pose or scene geometry; no new replay controller tier; no overhaul of floating tactical palette.

**C6 handoff:** World-Generation Contracts—protect geometry, procedural feature intent, map semantics and 2D/3D site interpretation at the data-contract boundary, not by modifying replay UI.

## Closeout ledger

- [x] Starting main Pages status and existing replay owners audited.
- [x] Personal-ground cache invalidation centralized.
- [x] Operator-follow, camera perspective and Director entry unified.
- [x] Historical UI refresh consolidated without moving film/visibility authority.
- [x] Functional tests and scoped CI authored.
- [ ] Final C5 PR checks green, including real WebGL.
- [ ] Merge barrier cleared; branch merged.
- [ ] Exact merged Pages build publicly served and verified.

The PR thread records final verification and any exceptions. Headless/CI cannot certify actual physical iPhone Safari, battery/thermal behavior or hand-reviewed visual frames.
