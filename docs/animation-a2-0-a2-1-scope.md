# Animation A2.0–A2.1 — Motion baseline and contact-derived weight

## Full scope

### A2.0 — reproducible visual/physical reference
- Keep the already-authoritative 60 Hz hybrid step scheduler, planted world-space boots, recorded replay foot events, and existing 30-slot pose publisher unchanged.
- Extend A0's 16-scenario spot census with an A2 time series across idle, walk, run, acceleration, stop, strafe, strafe reversal, reverse, turning, pivot, pie, crouch-walk, wounded and ADS.
- Collect reproducible root motion, stance contact weights, pelvis/chest/head responses, visible pose-slot health and observational pose CPU measurements in JSON. Compare against the same corpus after A2.1; no invented frame-rate improvement.
- Use actual Operator Lab WebGL on an iPhone-size viewport and desktop to save labelled fixed-time motion-gallery screenshots: moving, braking, reversing, aiming, heavy-weapon hold. Upload as CI artifact.
- Include original gait/footstep/replay, upper-body/rig, A0/A1 and production typecheck/build checks. Maintain a coherent visual approval list for top-down and ISO.

### A2.1 — contact-driven whole-body load transfer
- Single pure body-balance kernel derived from the existing FootTarget phase, contact and world-space supporting shoe positions. It must never decide a footstep or change any foot target.
- Transfer the pelvis laterally toward actual bearing support, with time-free, bounded settling and compression driven by unloading/swing/landing. Avoid an extra idle sine bob.
- Couple chest counter-lean and head stabilization to the same supporting contact; preserve sensible lean on forward, backward and lateral travel.
- Calibrate normal pace, running, crouch, pie, squeeze, injury and tactical tension without disturbing low-ready/ADS grip constraints.
- Keep the actual shot direction, firing timing, stock/weapon/hand rigid transform, navigation speed, collision, inventory and door handling authoritative.
- Avoid extra scene nodes, animation clocks, allocations in the hot pose solver, new IK solvers, and replay-history-based smoothing. New math must be deterministic and cheap.
- Test symmetric stance, single shoe bearing, unloading/landing monotonic response, blocked/idle/down stability, long strides/edge cases, recorded replay seeks and concurrent rigs; assess p95 CPU, contact gaps and visual acceptance.

### Out of scope
A2.2 first-step anticipation/braking transitions, A2.3 full directional gait retuning, A2.4–A2.6 new weapon choreography and posture silhouettes, environment traversal, door choreography or new movement controls.

## Acceptance and rollout
1. Commit A2.0 on branch; gather the before report with no motor/body behavior changes.
2. Commit A2.1 pure balance and single call-site integration.
3. Re-run same tracks before/after, validate no loss of planted contact, no visible single-frame pose discontinuity or same-time replay drift; compare visual gallery screenshots and mobile results.
4. Only merge at one compatible release checkpoint once required checks are green and previous Pages deployment is verified serving its expected SHA. Do not stack deployments.

## Limitations
Node pose elapsed-time observations are **not** mobile GPU frame times. Automated screenshots demonstrate the browser rendered successfully, but subjective improvement should still be reviewed at normal game camera scale.
