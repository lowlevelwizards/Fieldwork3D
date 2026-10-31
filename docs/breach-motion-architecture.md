# Breach locomotion: authoritative motion and tight passages

The fixed-step game motor (`breach-game.ts`) owns world position, real collision, tactical facing, and squeeze state. Rendering must never move a simulated operator.

The 60 Hz motion recorder (`breach-replay-motion.ts`) advances the only authoritative planted-foot scheduler (`breach-footsteps.ts`). Live scenes and replays sample the same time-indexed foot events. `breach-leg-geometry.ts` supplies anatomical reach to both the scheduler and IK; no renderer teleports a planted shoe to hide a reach error.

The pelvis and body motion derive from the supporting feet (`breach-body-motion.ts`). The operator rig assembles the pose once, keeping the weapon, hands, shoulders, and final muzzle direction coherent.

`breach-navigation.ts` defines both normal and rotated squeeze collision footprints. `breach-squeeze-route.ts` prefers ordinary routes, then offers a clearance-tested narrow route based on known intel for planning and physical geometry for execution. A motor-driven squeeze turns the operator sideways, reduces travel speed, holds the weapon compact, and disallows firing. Collision must validate the oriented profile throughout the entire movement segment.

The squeeze gait uses an actual reduced foot half-stance (2.6 world units instead of 5.6). It doesn't shrink a standing character's body and doesn't permit impossible foot plants. A planned waypoint or finished plan cannot broaden the collider while inside a constricted gap.

Regression gates: typecheck, production build, focused `breach-189`/`breach-190a`/`breach-190b`/`breach-190d` tests and existing pose/replay integrity checks. For visual QA, use the Operator Lab to compare stop/start, 90-degree turns, strafe reversal, and a shelf-gap squeeze during both execution and replay. Preserve anatomical continuity and planted contacts above all.
