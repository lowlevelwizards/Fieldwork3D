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

## D15.2A — living surrender and physical firearm state
- Live CHALLENGE/morale submission preserves health and injury and does not
  manufacture a downed/casualty event.
- Session owns a real dropped firearm with original identity, ammunition,
  location, stable ID and owner. Existing 3D kneel and new 2D raised hands
  no longer rely on fake death.
- Replay records surrender time, dropped firearm state and physical actor
  health without inventing custody for archival D9 films.
- D15.2B now presents authoritative world guns independently of the owner rig
  using original primary and Glock geometry. Old surrender films keep their
  legacy pose when no world gun was recorded. Separate owner rig drop is hidden
  only for D15 world-released weapons. Scene swap and replay clear stale models.
- Retrieval, custody orders and full focused validation are still outstanding;
  do not publish an incomplete checkpoint.

## D15.3 — physical suspect restraint (feature branch)
- New target-ID retained GO interaction with physical contact and timed cuff
  completion, actual finite issued inventory, and exactly-once consumption.
- Contextual RESTRAIN SUSPECT appears only for a legitimately disclosed living
  compliant unrestrained subject. Source-owned GO rechecks prevent stale plans.
- 2D and shared 3D poses distinguish restrained from unsecured surrender.
- Actor replay snapshots preserve restraint and custody timestamps separately.
- Still requires critical CI and full custody release contract before deployment.

## D15.4A — actual suspect search and weapon security (feature branch)
- Explicitly target actual captive ID and real loose firearm ID. GO-time
  hand contact, orientation, timed completion and current physical clearance
  are revalidated; no inventory mutation in planning.
- Search only discovers/confiscates a genuinely issued carried sidearm, with
  one stable world firearm record and no fictional items.
- SECURE WEAPON marks the actual dropped object inaccessible; both actions
  produce structured operator-attributed events and replay-true states.
- Contextual UI exposure and full targeted validation remain outstanding.

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
