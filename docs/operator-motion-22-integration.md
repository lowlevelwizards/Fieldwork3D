# Fieldwork operator movement — Stage 22 integration

Stages 09–22 have delivered the approved hybrid fixed-step gait in live
gameplay, tactical boot collision clearance, ankle yaw constraints and
corrective replants, crouch walking, contact-weighted push-off, acceleration
and braking, connected whole-body counter-motion, weapon inertia, balance
corrections, tactical tension, low-amplitude idle breathing, pack inertia,
fixed-contact footsteps, and stable operator signatures.

## Release invariants
- Preserve `archive/approved-hybrid-08-20261031` as the approved reference.
- The battle motor and fixed-step recorder own contact timing.
- The renderer consumes recorded foot targets, never advances an independent
  animation clock during battle or replay.
- Weapon stock, hands and barrel share the existing authoritative pose.
- Replay seeking must not emit extra footsteps or alter saved contacts.
- Every motion update runs the focused operator motion gate (TypeScript,
  contact/IK/replay and stage-specific tests).

## Human acceptance remaining
- Inspect right/left strafe and narrow doorways on iPhone for unexpected
  collision or foot-starvation.
- Review sharp 180-degree turning, ankle yaw and crouch walk transitions.
- Compare running, starting, stopping, engaged aiming and reloads to archived
  hybrid baseline; no body/weapon clipping or shot/barrel discrepancy.
- Confirm short contact sounds are audible but not noisy, and contact shadows
  are not exaggerated.
- Monitor frame pacing on iPhone and confirm GitHub Pages deployed commit
  matches `main`.
- Surface-specific impact dust/audio remains deferred until surfaces have
  reliable material identity.

Code-level tests alone do not substitute for on-device visual QA.
