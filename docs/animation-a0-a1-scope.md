# Fieldwork Breach — A0/A1 animation foundation

## A0 — frozen functional baseline
- Single simulation-owned root motion and foot contact scheduler.
- Snapshot the exact published 30-slot, six-owner operator output in a reusable, read-only quality monitor.
- Deterministic 16-scenario posture/handling/action corpus: idle, walk, run, strafe, reverse, pivot, crouch, ADS, short stock, reload, throwing, door reach, kick, injury, down, surrender.
- Detect invalid output, mismatched owners, repeated-timestamp drift, unnecessary reach gaps and transition discontinuity; publish CPU wall times as *observational* numbers only.
- Dedicated CI runner publishes per-scenario JSON. Existing motion, Workbench, replay, door and build gates remain.
- Device-specific frame rate, perceived silhouette and production WebGL approval require human screenshots and hardware profiling, not inferred from Node tests.

## A1 — reusable, authored choreography foundation
- Pure seekable time-indexed keyframes, per-segment easing, sorted visual cues and explicit read-only hand-contact annotations. No extra clock, RNG, motor or inventory authority.
- Versioned, validated Workbench pose sequence format with editable/capturable frames, play/pause/scrub, JSON import/export, locally saved per-weapon previews and bounded sampling.
- Reuse the existing Workbench IK plus one B2 pose output publication. Export never silently deploys to gameplay.
- First production choreography consumer is a *visual-only* throwing support-arm motion selected by the existing simulation-owned action window and hand contact director.
- Preserve authoritative release timing, weapon shot/muzzle, physical door grip, collision, recorded footsteps, and reload state.
- Test clip endpoint continuity, marker sampling on forward/rewind, read-only input snapshots, invalid import handling, exact replay seek and two independent rigs.

## Explicit A1 non-goals
Not a replacement of the 60 Hz motor, not a new foot scheduler, no blanket conversion of every legacy reload/door animation, no separate Workbench shot authority, no animation graph/ragdoll, no automatic final publish of an experimental pose preset. A1 establishes a well-tested authoring-to-IK interface; future A2–A4 actions migrate individually.
