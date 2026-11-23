# R6.3 — Action Outcome Provenance and Live Feedback Lifecycle

Date: 2026-11-23. Baseline main: 4aac9b6a84111dff92121939d8b4f4d5290cf78c. Depends on merged R6.0 inventory, R6.1 action assessment, and R6.2 actual physical contact.

## 1. Objective and complete scope

Player feedback currently combines rolling narrative strings, sparse typed execution transitions, current authored plans, and permanent failed-order history. Old warnings sometimes persist after the command resumes, is cancelled, replaced or completes. Some raw string workarounds hide all cancelled-order notices, including genuine recent failures. A HUD locator may be clickable even when its referenced node has already retired. The UI is persistent across Quick Play/campaign sessions; explicit session invalidation is required. Gameplay and forensic replay must remain authoritative and immutable.

R6.3 defines one presentation-only, pure provenance rule for the active warning, integrates it into the existing ExecutionNoticeFeed and liveExecutionNotice, scopes transient notice state to a Session reference, and binds locator actions to the currently authored order. It does not change Game, Session, motor, order acceptance, event production, ordered 60Hz phases, action/weapon handling, physical reach, saved plans, or replay archives.

## 2. Evidence and authority

- src/breach-order-lifecycle.ts: terminal failure increments failedOrders, records lastFailedOrder with id, reason and simulation time, emits narrative text, then retires the exact active PlanNode. Completed orders retire through the existing single contract.
- src/breach-execution-state.ts: read-only live actor diagnosis and forensic fallback, including permanent failure counters. It is not a HUD event queue.
- src/breach-simulation-phases.ts and src/breach-execution-events.ts: sparse, typed, monotone execution transitions with event id, simulation timestamp, actor id, order id (nullable), kind, reason and text. Recorded replay must preserve the unmodified facts.
- src/ui/execution-feedback.ts: short-lived notices ranked by severity and ingestion of narrative/typed transitions; currently filters older warnings on later same-actor events but needs exact order provenance and session reset.
- src/ui/live-execution-presentation.ts: maps real execution status to a current-only display; currently suppresses cancelled-order warnings through broad string matching.
- src/ui/tactical-hud-controller.ts: owns the single notice feed, renders the banner and LOCATE control, and accepts real current plans from the caller. The HUD can provide the actual Session object and time without exposing hidden targets.
- src/breach-main.ts: already resets notice UI when sessions change, but the notice feed must also self-reconcile by Session identity and avoid showing old event suffixes on a later mission.

## 3. Pure provenance contract

Add src/ui/execution-notice-provenance.ts with typed minimal observed actor/order view. The renderer/feed provides already-authorized friendly actors, current active PlanNode id, lastFailedOrder metadata and current simulation seconds. The helper reads no hidden world, door geometry, Session, DOM, storage or clock.

Notice kinds: transition (sparse exact event ID and actor/order provenance), narrative (unbound rolling log text), state (short local pause/resume cue). It never invents a GO fact.

- Non-warning notices retain normal priority/lifetime except that session change resets all old notices.
- Active blocked transition is live only while its actor exists, is alive, and the exact order remains the first current PlanNode. An older blocked order cannot be revived merely because another queued order has the same actor. No warning can bind to an unrelated future order.
- Later started/resumed/completed transitions for the actor invalidate that actor's previous transient warnings; status facts and the replay archive are unchanged.
- A typed terminal cancellation with null current order is eligible for a short current-only banner if the same actor has a matching lastFailedOrder, was failed at the same simulation time as the event, the active plan is empty, and the failure is recent (existing 1.5 simulation seconds). This makes a genuine fresh failure visible briefly; it does not turn the failed order into success or an ongoing blocker.
- Historical terminal narrative strings (including ORDER CANCELLED and ENTRY INTERRUPTED) are retained in game logs and replay, but not enqueued as context-free live obstruction banners.
- A string-only unscoped warning has no provable actor/order identity. During current game rendering it may remain a brief ordinary warning only while there is still an active friendly order; never become a clickable LOCATE target. Historical failed narratives are suppressed from live popup presentation. Scoped transient warnings cannot outlive an order whose identity is known.
- No new PlanNode, Session, actor, replay, or event schema fields. The provenance is presentation-only metadata on the temporary ExecutionNotice object.

## 4. Session lifecycle

Extend ExecutionNoticeFeed.update with an optional read-only scope argument containing the Session object identity, the currently visible friendly plan/last failure projection, and authoritative simulation seconds. Existing four-argument callers/tests continue to work. On Session identity change the feed must reset all queue/prior-log/last-event/phase history and seed the new baseline without ingesting the previous mission as fresh. Repeated renders of the same Session do not reset. The UI also explicitly calls resetNotices on mission reset as before.

Rank only still-live notices after each update. An invalid top-priority warning is evicted so lower-priority fresh useful notices can appear instead. Clicking the LOCATE control must revalidate the same current active order rather than any later queued order, with no selection of a stale waypoint. Terminal failure banners may locate the operator but must not offer editing a retired node.

## 5. Action target indicator boundary

Persistent selected action dots come from src/breach-action-target-marker.ts using actual authored PlanNodes. Do not generate a dot from stale selectedNode ids or from an inferred nearest object. Suppress loose-firearm target dots once the world item is no longer loose. 2D and 3D share the existing marker source. No new renderer resource or draw loop.

## 6. Tests and acceptance matrix

1. Type-safe, deterministic pure projection tests: active blocked 44; order 44 complete/replaced by 45; queued order 44 no longer first; actor removed/down; missing actor; genuine recent failed order 44 with matching event/time and empty queue; old failure, wrong failure id, next order, and stale event all rejected.
2. Verify a later actor transition evicts earlier warning, other actor's still-active warnings are retained, and a fresh event for new current order is displayed once. Event IDs are consumed once, and raw duplicates are never twice queued.
3. Session A to Session B with identical actor/order IDs but different Session object: no old active notice, no old phase cue or old event suffix, no cross-session LOCATE link. Old log remains preserved on Session A.
4. Narrative-only ORDER CANCELLED/ENTRY INTERRUPTED never masquerades as live blockage. Typed recent terminal failure remains visible briefly without giving an edit control for a retired order; older error remains in execution history and replay.
5. LOCATE ORDER validates only plan[0], actor existence and warning provenance on click. In planned mode, a retired order does not get selected; a live current order remains selectable.
6. Action target dots follow the currently authored target only, and a secured firearm no longer has a loose-item target indicator.
7. No production changes to fixed simulation, physical motor, gameplay outcome counters, replay evidence/knowledge, fog or save formats. All existing historical tests (UX2, TF3, follow/flash, tactical integration and replay) plus new R6.3 tests pass.
8. Production TypeScript/build, exact-head architecture and affected-domain CI green; frozen D3 physical corpus retained. Prior Pages release publicly verified, no competing active Pages run, merge expected head only, and confirm the public Pages stamp from merged commit.

## 7. Implementation order and safe merge

A. Introduce pure notice provenance classification, exact active-order and recent terminal-failure contract with direct unit tests.
B. Integrate optional Session-scoped feed state and evict stale warnings before priority ranking, without changes to the authoritative event archive.
C. Adopt in live banner and LOCATE UI, including revalidation at the click and source-owned target marker; preserve replay and HUD separation.
D. Run seeded real-session blocked/cancelled/changed-order acceptance, UX2/TF3, movement/door, replay and production gates. Reconcile concurrent main changes, merge only clean exact-head, then verify served Pages build.

**Definition of done:** A single observed-only active-notice contract, explicit Session invalidation, no resurrected blocked-order popup or stale target indicator, genuine failed orders still visible in history and briefly as recent typed notices, actual gameplay unchanged, all required checks green, PR merged and exact served release verified.
