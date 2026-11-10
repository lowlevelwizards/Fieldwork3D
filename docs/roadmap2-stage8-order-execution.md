# Roadmap 2 Stage 8 — tactical order-execution state machine

Baseline: Roadmap 2 Stage 7 merged + deployed, `6a9262db1fd7f9bd089d58ad72e7b1db4cb4c2ee`.

## Purpose and exact scope

Remove tactical order dispatch and action execution from the authoritative
`breach-game.ts` session model. This is an **architecture extraction**,
not a gameplay tuning or new order feature. Retain the same 60 Hz fixed step,
unmodified authored node serialization, execution priorities, timers, side
effects, physical constraints, intel/visibility, and replay recordings.

Pre-Stage-8 `runOrders()` directly owned traversal gating, fire-retreat
interrupts, contact holds, active-order lifecycle, every special action,
move/LOOK/PIE position/aiming, WAIT/HOLD CLEAR, SYNC/RELOAD/FLASH, and
physical door interactions including real impacts and repeated kicking.
Previous isolated WAIT and utility handlers were useful but partial.

## Module ownership

| Home | Responsibility |
| --- | --- |
| `breach-order-executor.ts` | The **single** stable fixed-tick order dispatcher. Preserves stage/branch order, pre-execution contact and fire-retreat interrupts, custody release, and delegates the active node to exactly one owner |
| `breach-order-lifecycle.ts` | Begin a new order, persistent LOOK/WATCH aim, rotation, complete one node, clear temporary state, and persistent non-spamming failure reporting |
| `breach-order-movement.ts` | MOVE, sprint/strafe, PIE, authored arrival posture/pace/fire-policy, friendly-aware arrival settlement and entry clearing-sector aim handoff |
| `breach-order-entry.ts` | ENTRY TOOL validation, physical approach, equipment retrieval time, interrupted lockpick, wedge state/ownership, lock and latch damage |
| `breach-order-medical.ts` | RECOVER MEDICAL, TREAT, EVACUATE drag/carry, medical supplies and real trailing body/civilian custody |
| `breach-order-interactions.ts` | INTERACT with civilians, escort/follow/secure/release, furniture push, pane open/close and occupied window gate |
| `breach-order-door.ts` | Explicit DOOR OPEN/CLOSE/HOLD/KICK, repeated resisted kicking, safe leaf displacement/stun, hinged panel progress and obstruction errors |
| `breach-order-wait.ts` (existing) | WAIT/HOLD CLEAR timing, wait for entry-door clearance, hold on live contact |
| `breach-order-utility.ts` (existing) | SYNC/RELOAD/FLASH, coordinated same-tick SYNC release, one-shot reload/throw consumption |
| `breach-order-execution-port.ts` | Typed, stable game-owned callbacks for legal motor movement, traversal, world notifications, sound, events, visibility, physical prop moves, paired doors and reload start |
| `breach-execution-state.ts` (existing) | Read-only, replay-safe HUD vocabulary, sourced solely from authoritative actor/order state; does not drive the game |

`breach-game.ts` continues to own `stepSession()`, physical world state,
gameplay event appenders, mission/progress handling and all
authoring APIs. It creates the executor once using stable hooks. No order
handler owns a separate tick clock or physics, mutates authored plans except
on genuine completion, or reads rendering/DOM state.

Stage 7's motor remains the exclusive movement implementation.
Stage 1's frozen SHA-256 fingerprints remain immutable and must
**not** be refreshed to make this extraction pass.

## Exact dispatch priority (unchanged)

1. Finish any in-flight physically verified traversal, then handle a
   temporary muzzle-clearance retreat.
2. Compute currently visible threats, maintain real custody, and respect
   halt-on-contact/idle semantics.
3. Activate the newly reached authored node, clear only temporary motor
   state, and respect persistent WATCH interrupt rules.
4. Handle entry tools, medical/casualty commands, civilian/prop/window
   interactions in their previous precedence.
5. Handle PIE and movement/arrival/aiming, including the player-authored
   entry look handoff and live threat priority.
6. WAIT/HOLD CLEAR, SYNC/RELOAD/FLASH and explicit door operations,
   preserving their old timers and terminal/failure semantics.

Every failed operation keeps the same order ID on the plan. A repeated
unchanged issue does not flood the event feed. A valid change of geometry,
equipment, patient or target can resume an order. Replays and the
read-only execution state interpreter see the same authoritative data as
before this refactor.

## CI and release acceptance

- [ ] Existing Stage 1 deterministic contract and replay/recording soak
  (no change to frozen outcomes).
- [ ] Stage 8 source ownership and true order lifecycle/failure tests.
- [ ] Existing MOVE/LOOK/PIE, door swing/impact/kick, tool/wedge/pick,
  WAIT/HOLD CLEAR, SYNC/RELOAD/FLASH, medical/carry/drag, civilian
  custody/window/prop, issue reporting, replay and motion recovery tests.
- [ ] Architecture dependency boundary check and prior Stage 2–7
  critical contracts, TypeScript strict and production Vite build.
- [ ] Before merge: previous Pages release fully published, and served
  build ID matches `main`.
- [ ] After merge: check Pages workflow succeeded, and the **new**
  public `fieldwork-build.json` build ID matches the Stage 8 merge SHA.
- [ ] Retain no failed/cancelled pending production deployment; do not queue
  new merges while a release is running.

Human iPhone tests (same seed, FOW, squad plan, profile) should check
four-operator synchronized entries, halted CONTACT, door kick repeat,
failed lockpick, UI blocked order issue, casualty drag/escort and replay
accuracy. Automated Node tests are not a pixel/image or device FPS claim.

Stage 9 enemy AI extraction is deliberately out of scope.
