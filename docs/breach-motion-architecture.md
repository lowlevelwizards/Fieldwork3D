# Breach locomotion and narrow passage authority

## Single source of truth

* The fixed-step game motor (`breach-game.ts`) owns world position, tactical facing, actual displacement, passage state, and collision. It never delegates movement to the visual skeleton.
* The 60 Hz contact recorder (`breach-replay-motion.ts`) advances the sole foot scheduler (`breach-footsteps.ts`). Live and replay consume its time-indexed motion events.
* `breach-leg-geometry.ts` defines real two-bone reach, which the scheduler uses for touchdown prediction and the IK rig uses for physical anatomy. No render-time foot teleport is allowed.
* `breach-body-motion.ts` derives pelvis movement from support contacts. `breach-operator-rig.ts` is the final pose assembler, not a second walking motor.
* `breach-3d.ts` interpolates already-authored movement and renders physical contact shadows and tactical visibility.

## Narrow passages

* `breach-navigation.ts` provides an oriented three-capsule squeeze footprint; normal profile remains unchanged.
* `breach-squeeze-route.ts` prefers normal routes, then tries a conservative narrow route against known intel for planning and real collision for the motor. The route never changes the user's authored final destination.
* When normal clearance fails but the oriented narrow sweep fits, the motor enters squeeze, aligns the body, slows sideways motion, and withholds firing. No teleport or free-radius reduction occurs.
* The foot scheduler selects a 2.6-unit half-stance (versus ordinary 5.6). A squeeze cannot make a blocked foot valid; a new landing still requires independent foot-floor clearance.
* A waypoint transition or end of plan cannot expand the collision body until normal clearance is restored.
* On leaving a passage, ordinary gait, aiming and weapon handling resume. Replay persists the passage facts rather than creating a separate animation.

## Minimal regression gates

* Typecheck + build before merge.
* Focused `breach-189`, `breach-190a`, `breach-190b`, `breach-190c` tests.
* The fixed-step animation and replay integrity tests are especially important after modifying body yaw, foot contacts or reach.
* During a visual QA pass use the Operator Lab for planted feet, 90-degree turns and reversals, and a furnished site with a narrow gap. Confirm no feet/skulls clip through walls and live/replay remain matched.

## Explicit constraints

Never extend the IK limb to hide a bad foothold; never recenter a planted shoe in the renderer; never shrink a normally oriented body by merely switching a gait label. Future traversal types must declare their real collision footprint and corresponding anatomical stance.
