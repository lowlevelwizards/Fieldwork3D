# Consolidation Package C — C4: Tactical UI & Interaction Consolidation

**Baseline:** main `09413358dec66290f9b1974f7f8312820463a0c9` (C3 and F2/F3 release batch integrated). Previous Pages workflow `43238453114` completed successfully and served its exact build.  
**Feature branch:** `refactor/consolidation-c4-tactical-ui-interactions`  
**Primary owners:** `ui/tactical-hud-controller.ts`, `ui/tactical-palette-controller.ts`, `breach-tactical-interaction-state.ts`, `breach-pointer-command-controller.ts`, `breach-main.ts`.

## Objective

Make tactical HUD affordances, click-time eligibility, floating/docked contextual action ownership and selected waypoint/WATCH presentation agree with the same authoritative Session/interaction state.

No alternate command router, controller hierarchy, DOM rewrite or new input gesture. Existing game APIs remain the **only authority** to accept/deny orders. C4 is a small consolidation of read-only UI derivation and stale intent cleanup, not a change to gameplay semantics.

## Audited issues

1. Several controls (FLASH, BACK, UNDO, REDO) derived disabled status independently, and omitted the planning/replay/selected-operator lifecycle gate. WAIT/SYNC had no consistent derived disabled state. Their event handlers sometimes invoked game APIs despite the display making the command unavailable, yielding misleading click tone and feedback.
2. CLEAR ROUTE revalidated the Session after asynchronous confirmation but did not ensure the selected operator was still the one named in the confirmation. An unrelated selection change could apply the delayed action to the original operator without being obvious to the player.
3. The current single-target `TacticalInteractionState` is already authoritative for arming LOOK/WATCH/FLASH/PUSH/etc. However the separate HUD selection (`selectedNode`, `selectedActiveWatch`) could outlive the authored node or currently active WATCH after undo, release, team changes or mission transition.
4. The contextual palette computes `at=node?.p??finalPoint(a)` for most actions but searched for civilians only at `finalPoint(a)`, even while editing an earlier waypoint. The authoritative civilian SECURE/FOLLOW and casualty transport commands currently start from `finalPoint(a)`; showing those endpoint-only controls on intermediate waypoints is misleading. C4 suppresses these actions when the selected node is not the last authored node, without changing gameplay insertion semantics.
5. Context buttons are reused and animated between operator/door selections. A click dispatched after the operator changes must not silently apply the previously displayed action to a new owner; disabled buttons must not enter the dispatcher. The palette already has one DOM action handler, which should remain the single event owner.

## Implementation specification

### C4-A — Single read-only toolbar eligibility

Add `ui/tactical-command-affordances.ts` with `tacticalUiActionAvailability`. The eligibility calculation consumes:
- Session phase and replay state.
- Actual selected operator health.
- Current plan length, undo/redo history counts and flash supply.
- Existing targeting arming and active-watch selection flags.

It returns independent booleans for BACK, CLEAR, UNDO, REDO, WAIT, FLASH and SYNC. **Eligibility is presentation only.** It must not move `canEdit`, LOS or nav/order legality out of `breach-game`.

### C4-B — Reconcile ephemeral selection and contextual position

Add `ui/tactical-selection-presentation.ts`:
- `reconcileTacticalUiSelection` removes a selected node that no longer exists in the current actor's plan; clears an active-watch selection after the watch has expired or been released; preserves valid nodes and a valid active WATCH.
- `canOfferRouteEndCivilianAction` gates endpoint-only civilian commands to HERE or the final authored node. `nearestPaletteCandidate` then selects the closest eligible/disclosed civilian using the existing 34-world-unit distance and first-array-order tie break, without sorting every frame. Middle-waypoint civilian insertion is explicitly deferred to a separate game-rule stage.

This helper cannot alter actor plans, simulation, tactical authority, or committed target mode.

### C4-C — Same toolbar gate for styling and click-time handlers

`tactical-hud-controller.ts` reads the same availability snapshot both when setting disabled states and when handling clicks. Add click-time guards to prevent stale BACK, CLEAR, UNDO, REDO, WAIT, FLASH and SYNC requests after running/replay/selected-death transitions. Keep current audio cues for accepted actions, and avoid confirmation tones for rejected no-ops.

CLEAR ROUTE confirms only if the **same selected actor and Session** are current at completion; an interrupted modal does not silently clear another actor's plan.

### C4-D — Stable palette/selection ownership

- `breach-main.updateHud` reconciles selected node/active WATCH with the real actor before drawing the HUD and contextual palette.
- The palette's main and quick-state roots receive the selected actor ID while visible and are cleared when hidden.
- The existing contextual click handler ignores stale-owner clicks, hidden surfaces and disabled buttons.
- Civilian actions are visible only when the selected editing context is the route endpoint, where the existing game authoring APIs actually accept them. A selected intermediate waypoint cannot show an action which would fail against the unchanged endpoint-only command API.
- Keep one gesture controller, one command router and the existing float/dock preference. Preserve iOS pointer recovery, active WATCH dragging, one-tap plan authoring and non-intrusive HUD visuals.

### C4-E — Verification

Add `tests/package-c4-tactical-ui-consolidation.test.mjs`:
- Planning, execution, replay, win/loss and incapacitated actor eligibility.
- BACK cancel for active tools/WATCH even with an empty plan.
- Deleted-node and expired-watch reconciliation.
- Endpoint-only civilian command gating and nearest disclosed target selection, stable ties, no misleading intermediate-waypoint offer.
- HUD/palette source ownership, stale contextual button rejection and no extra command authority.

### C4-F — Integration and release

Extend the existing Package C workflow with C4 + inherited A6 composition, HUD/palette step 7, WATCH marker and canvas gestures. Retain TypeScript/production build, architecture, 2D render, replay/Bodycam and real WebGL tactical phone/desktop acceptance.

C4 should **not** be merged while another Pages deploy is queued or running. Verify the previous exact production served build, that the C4 PR head is tested and clean, and merge only at a clear release checkpoint. After merging, verify the new Pages workflow and its exact public served-build stamp. No pile-on release.

## Non-negotiable behavior

- Existing LOOK/WATCH, FLASH, WAIT, BACK, SELECT, UNDO/REDO, plan/door contextual actions remain available when legitimately allowed.
- Do not change 60Hz simulation, LOS/fog knowledge, targeting legality, pathfinding, door actions, operator IK, weapon animation, replay evidence or Bodycam rendering.
- Do not move the action dispatcher back into `breach-main`.
- Existing floating/dock layout and last-used preference remain unchanged.
- A source-only check is not real iPhone Safari hardware/thermal certification.

## C5 handoff

C5 can consolidate replay/director HUD and viewing surfaces around the C3 disclosure boundary without adding a second camera or event timeline authority. Keep tactical selection, mission replay selection and cinematic camera framing explicitly separated.

## Closure ledger

- [x] C3 and subsequent F2/F3 production baseline audited.
- [x] Read-only eligibility helper and click-time guarding implemented.
- [x] Selection and waypoint contextual targeting consolidated.
- [x] Tests and Package C workflow added.
- [ ] Critical final feature-head CI green.
- [ ] Previous production verified; no queued/running Pages.
- [ ] PR merge, production job success and exact public served-build verified.

Release evidence belongs in the PR after completion.
