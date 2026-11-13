# Animation A2.3 — Directional locomotion and planted-foot pivots

## Intent
Operators should read as purposeful, balanced people when they move laterally, reverse, backpedal, pivot, pie corners, crouch and squeeze. The motor stays immediate; physical direction and shoe contacts stay accountable.

## Stage scope

### A2.3.0 — Baseline, gait matrix, acceptance
- Audit the **live hybrid** fixed-step path (`advanceDistanceGait`), not the legacy or stale "lab-only" comments. The live scheduler is the sole authority for planted shoes, footstep cadence, and recorded replay.
- Cover mirrored left/right strafe, forward/reverse strafe with the lead foot swapping, backward walk, 90°/180° standing pivots, in-place pivot reversal, pie, crouch-walk, squeeze and stop/restart.
- Record signed lateral lead/follow sequence, true touchdown times, no-airborne-both-feet, overlap/crossing, anchor changes, target reach, step count, starvations and time-sampled pose drift.
- Reuse the A2.0–2.2 real mobile/desktop WebGL gallery; screenshots are visual *evidence*, not proof of aesthetic quality or device GPU FPS.

### A2.3.1 — Directional foot intent and cadence
- Give lateral movement a deliberate lead/follow identity. Lead shoe steps out, trailing shoe draws up without overtaking or crossing. A reversal queues the *new* leader only after the current swing completes; no airborne cancellation.
- Shorter and controlled backward placements, never confusing reverse travel with a forward sprint. The authoritative motor keeps its existing speed and collision.
- Distinct careful (pie/crouch/squeeze) projections and lower boot lift; keep an immediately available stance for firing/door interactions. No foot teleport.
- Preserve world-space target collision, reachable hips, clearance, and existing fixed-step contact phases. Reject obstructed contacts rather than snapping them through furniture.

### A2.3.2 — Planted-foot-aware stationary turning
- In-place turns must request alternating, small replant steps, with bounded boot yaw per step. Hip/root presentation follows a supported stance, not a free-running swivel disconnected from both planted boots.
- Turn reversal changes desired heading without resetting planted anchors or canceling in-flight steps. Head/chest aim remains separate; no gameplay shot vector adjustments.
- Keep interpolation seekable from recorded motor/footstep evidence and compatible with replay archives.

### A2.3.3 — Body language and polish
- Give backward/lateral travel a subdued low stable pelvis, appropriate counterbalance and restrained shoulder yaw, based on movement direction and contact support.
- Avoid exaggerating bob or jitter; attenuate careful movement, crouch, injury, aiming and stationary tactical holds. Run and strafe identity should remain distinct.
- No extra IK solver, scene nodes, animation clocks or render-history springs; retain the single 30-slot pose publisher.

### A2.3.4 — Regression, performance and release
- Focused deterministic fixed-tick step/motion/arrival tests, mirrored correspondence, clearance and overlap, contact continuity on stop/reversal, replay archival seek parity and published-rig tests.
- Compare baseline vs candidate direction matrix and ensure no significant new starvation or reach regressions; any failure must be diagnosed, not waived to reach 100% green.
- Critical typecheck/build, motion/replay/animation tests and actual WebGL phone+desktop gallery; optional broader CI where triggered.
- Commit stages on one feature branch; single PR, merge only when checks green and previous GitHub Pages build verified; verify the new public build matches merged SHA.

## Out of scope
A2.4 weapon carry silhouettes; A2.5 handling transitions; A3 doors/interaction choreography; motor/nav/clearance rules; footstep sound redesign; animation system replacement.
