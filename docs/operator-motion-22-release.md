# Operator Movement 2.0 — Builds 09–22

## Authority and rollback
Approved hybrid reference: `archive/approved-hybrid-08-20261031`.
Production contact scheduler selected in `src/breach-live-gait.ts`.
The old event scheduler remains available as the `legacy` mode. Replay
footstep contacts and movement-facing timeline are generated from fixed-step
motor inputs; the renderer must never generate a second independent gait.

## Progress
09 preserved approved reference, boot diagnostics; 09b promoted the hybrid.
10 and corrective 10a model real boot clearance and preserve tactical strafe/
squeeze lead-follow cadence. 11 constrains boot yaw and corrective replants.
12 improves crouch support and foot clearance. 13 and 13a improve toe push-off
within anatomical limits. 14 records and renders acceleration/braking. 15 adds
contact-derived full-body motion. 16 adds bounded mass-weighted weapon sway.
17 performs support-centroid stance settling. 18 distinguishes alert movement
without re-timing the feet. 19 adds deterministic idle breathing. 20 adds
gear inertia. 21 adds recorded touchdown feedback, no independent timer.
22 adds stable, restrained per-operator appearance variation.

## Invariants
* Exactly one authoritative contact planner per actor.
* Planted world-space foot anchors never shifted by animation.
* Every significant turn requires a physical step; no arbitrary ankle snaps.
* Full rig, grip, barrel and combat shot solution stay coherent.
* Deterministic replay, pause, seek and mobile frame cadence.
* No footstep sounds when paused or seeking; contact event is authoritative.
* Mobile on-device visual tuning still needed; these checks do not claim a
  human-reviewed visual improvement for every new build.

## Verification
Fast CI: `Operator motion critical gate` runs TypeScript, fixed-step
feet, Lab gait, replay and focused motion tests. Full repository CI includes
separate map-generation checks which have reported unrelated failures and
should not be conflated with the locomotion regression suite.
