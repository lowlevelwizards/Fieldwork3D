# D15 — Human Compliance & Custody: staged integration ledger

Base main: `a4e323d6e66edf5f2a45a470a4ac399e0d7c7af9`. Feature branch: `feature/d15-human-custody-foundation-20261120`.

## D15.0–D15.1 committed foundation
- Reconcile legacy D9 surrender (health=0), EQA3.10 civilian physical flex cuffs,
  actual rescue FOLLOW, M3/M4 doorway/queue constraints, mission progression and replay.
- Introduce pure `activeCombatant`, `captureTargetResolved`, and the read-only
  custody classifications.
- Thread shared policy through threat/target selection, shot-time commit, fixed-tick
  actor work, and CLEAR/CAPTURE/HOLD checks.
- Preserve D9 live surrender until the true world-weapon/pose work is ready.
  Living compliant targets in this stage are only policy test fixtures.

## R1 must still implement before release
- Real living surrender; authoritative transfer of the held firearm into a
  Session-owned recoverable world entity (current `droppedGun` is visual only).
- Distinct down/surrender pose and historical-film compatibility.
- Source-owned live weapon possession/fire gates, actor initialization, replay,
  TypeScript/build and exact 60Hz critical checks.

## Later checkpoints
R2 restraint/search/disarm; R3 shared FOLLOW/ESCORT and incapacitated target
transport; R4 opportunity-dependent flight/rearm and truthful mission extraction;
R5 contextual UI, 2D/3D, replay, debrief and final complete mission acceptance.

No release from incomplete stage work. Run only focused critical tests, preserve
physical route/door baselines, and verify public Pages served-SHA after safe batches.
