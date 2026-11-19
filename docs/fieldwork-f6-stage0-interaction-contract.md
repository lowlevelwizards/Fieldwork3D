# F6.0 — Physical equipment action authority audit

## Current source of truth (19 November 2026)

- GO-time flash is validated and consumed exactly once by `src/breach-order-utility.ts`, then `spendDeployedFieldItem`; grenade trajectory, mission cap, action timer and notification remain unchanged.
- Wedge/unwedge uses `src/breach-order-entry.ts` and real door state. Unwedge currently returns an actual carried piece to the *original wedge owner's* inventory if it fits, irrespective of who removed it. F6.3 must not render an apparent hand-to-hand transfer to a distant owner. Resolve this ownership/visual contract before animating unwedge recovery.
- Restraints use `src/breach-order-interactions.ts`; one cuff pair is consumed only after compliant target, reach, rotation and the existing 1.15s + pouch-access timer.
- `src/equipment-deployed-field-use.ts` is the sole source of item availability, selected pouch and consumption. The detached GO-time kit is already decremented alongside the live charge. The renderer must not call spend/restore.
- `src/equipment-field-visuals.ts` and `breach-operator-appearance.ts` already render carried flash canisters/wedges by actual location and live count.
- Shared `OperatorPose` and `breach-pose-action-state.ts` own presentation hand action, not ballistics or orders; the V4 reload has higher hand priority.
- `src/breach-replay.ts` records physical field inventory and live remaining charge. Existing film records a sampled plan, but lacks the mid-action `actionTimer`, required to seek accurately to an unfinished flash retrieval. Add optional replay-only action timer with old-film neutral fallback.
- `src/breach-3d.ts` is the narrow pose projection adapter for live/replay. Source location is fixed by the ordered issue quote; it is never guessed by the animator.

## F6.1–2 implementation contract

The actor's *already authored* front plan node and `actionTimer` determine whether a flash interaction exists. Rendering calls a pure, bounded `readEquipmentInteraction` and samples a pure gesture curve. Its output has source pouch, progress and 1-sided hand preference. No mutation, no authoring of paths, no new character controller, no extra item counters, no commit markers posing as gameplay events.

F6.2 pre-commit flash in-hand presentation is shown only while the order remains active, the charge remains physically carried and no higher-priority pose is active. The actual pouch instance is hidden while a single reusable pre-allocated held canister appears. On success, the existing GO-time grenade and the already-authoritative post-throw gesture take over; both temporary visuals are cleared. On cancellation, pouch visibility returns; no count changes. While the hand is being released, the existing IK solver is used exactly once.

## Critical gates

- A valid flash order yields correct rig/belt/backpack source and bounded progress.
- Every unavailable/invalid/cancelled/no-timer case produces no held object or false spent item.
- Replay captures the timer; old film has no implied active retrieval; reversible seeks reproduce the same pose descriptor.
- Reload, treatment, downed state and held door contact do not lose their current control of the hand.
- Existing flash mission cap, trajectories, stock/field reconciliation, first-frame and pose tests stay unchanged.
- No per-frame Three.js mesh allocation; no new gameplay timer, fixed-step action latency or planner changes.
