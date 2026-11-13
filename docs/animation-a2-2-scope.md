# A2.2 — Starts, stops, momentum and settling

## Goal
Make the same physical motor motion read as an intentional first step, maintained travel, weight-bearing braking and a grounded return to rest. Preserve the A2.1 contact-balance rig, world-space shoe contacts, shot-time muzzle, doors, footstep audio and replay authority. Do **not** delay actor translation or extend an operator's planned path.

## Scope / ownership
1. **Simulation-time movement impulse:** identify significant signed acceleration at the existing fixed-tick replay-motion recorder. Sample the most recent positive/negative impulses from that existing data with binary search. Preserve the existing replay archive V1 schema: impulses are reconstructed from the archived acceleration event list, not separately serialized. Live and replay read the same event-time envelope; no render-frame springs, state debt or duplicated clock.
2. **First-step / acceleration:** small grounded push-off and chest/hip lean following actual travel direction, weighted by real unload/swing contacts, not idle oscillator. Supports slow starts, high-speed run starts, walk-to-run, lateral and backward movement.
3. **Deceleration / braking:** catch the motor-owned decrease in speed; bend knees/shift torso and counterbalance head by a bounded transient. Proportional to braking strength and travel direction. No visual aim or bullet direction shifts.
4. **Stop / settle:** follow landing and recovery of already-scheduled feet; gently relax to rest even after motor velocity reaches zero. Zero after impulses expire and feet finish recovering; no endless idle bob or foot skate.
5. **Suppression and continuity:** never synthesize motion for down/surrender/blocked states; attenuate careful movement, injury, crouch and aim. Keep output finite and smooth across explicit phase and envelope boundaries. Live/replay deterministic seek, same timestamp no drift, no input mutation, no interference with door interactions, reload or action hand ownership.
6. **One existing pose publisher:** feed motion offsets into existing pelvis/chest/head outputs, not additional render authorities, second IK, object nodes or weapon fit. Retire redundant pre-A2 braking torso rotation.
7. **A2.2 acceptance:** targeted unit/recording/archive tests; A0/A1/A2.0/A2.1, recorded-foot gait, animation integrity, typecheck/build, mobile-sized and desktop WebGL gallery, before/after deterministic motion report. Measure CPU observationally, don't invent mobile FPS claims. Existing D4/Q5 doorway behavior and physics must remain untouched.

## Tests and acceptance
- Identical impulse values when querying a time forward, back or repeatedly and after V1 archive export/import (including a legacy archive with no new data).
- Positive first-step pulse, negative braking pulse, decaying rest envelope, moving while aimed with no visible weapon sway amplification; side/back correct directions.
- Exactly zero synthetic start/stop motion at true idle after event expiration, and when blocked, down or surrender; no overshoot, fixed time and no extraneous foot placement changes.
- Unit and 30-slot pose parity tests, actual Lab WebGL captures (accelerate, stop, restart, strafe reversal, run) and pose CPU observations. Merge at a single release checkpoint after prior Pages success and all relevant checks green.

## Out of scope
A2.3 retuning foot trajectory/scheduler/strafe patterns; A2.4 weapon silhouettes; A2.5 dedicated weapon transition choreography; new locomotion commands, gameplay timing or collision decisions.
