# EQA3.1 — measured first contact, honest routes and civilian FOLLOW pacing

Date: November 18, 2026. Base `main=f2664739427792055176b566ea77bbd5aa74fd59`. This is an isolated **feature branch**, not a production release.

## Verified evidence before edits

EQA3.0 frozen original: https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/44420688664
EQA3.1 eight-scenario real fixed-step forensics (before changes):
https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/44421635232
EQA3.1 retrospective exact witness:
https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/44421858611

- 21 detailed seeded/intel/entry combinations across eight CI runs yielded **zero cases** where the first *scout* already had direct hostile LOS from the initial spawn. Three registered first scout sight within one second **after moving**. The earlier 54/84 quick contact metric is a multi-actor film/contact measure, not proof of 54 enemy-spawn ambushes. **No global AI reaction nerf or enemy teleports.**
- Retail seed 25 CAPTURE/SERVICE: old EQA3.0 script labelled **11 aborted routes at 90s** despite the real motor reporting **clear**, no physical blocked time, and a valid five-node route with footsteps around architecture. Its diagnostic driver incorrectly compared only straight-line distance after 7 seconds. Changing the **audit driver** to count actual travelled footsteps and actor blockage (not an AI/motor change) gave **zero aborts and both FRONT and SERVICE completing** in matched 90s cases.
- Verified repeated objective-click rejection: Townhouse seed 12 INTEL (83 FRONT, 87 SERVICE repeat attempts in 90s) and Townhouse seed 23 RESCUE (87 FRONT). A small bounded ring of known contact points did not find a legal command in these cases; may need a door/alternate approach. The script is not a person who can manipulate a door. **Do not label each repeated request as an independent game planner defect.**
- Warehouse seed 17 RESCUE: actually reaches `EXTRACT` but a real rescue civilian changes from wounded to compliant then becomes **incapacitated within ~0.4s** of the secure transition, under authentic gunfire. The outcome is not solved by making an injured civilian invulnerable or teleport to extraction. Rescue casualty carry/drag and cover need separate full-mission validation.
- Townhouse seed 23 RESCUE/SERVICE: at 9.63s, real civilian accepts FOLLOW, both `person.following` and `rescue.following` equal `rook`, proximity only **3.76 units**. By 15.83s distance reaches **129.13**, past the authoritative 125 threshold, generating ESCORT SEPARATED. Civilian initially had no injury. The player-facing symptom is actual rather than solely a broken script.
- The initial conservative pace cap alone delayed Townhouse 23's separation to 18.63s at distance 128.01, not enough to call it fixed. Forensic root contributor: `rescueFollowGoal` previously used 23 units behind `TeamActor.heading`, although combat WATCH/LOOK can face a *different direction* from real locomotion. The follower repeatedly routes to a trailing point that may not trail the actual path.

## Narrow feature changes

1. `src/breach-civilian-mission.ts::escortWalkMultiplier`: respect exactly the active real civilian's 43 units/s healthy or 22 injured follow gait, matched to operator's 53 units/s ordinary speed. Reduce leader walking scale gradually with measured separation. No slowing other teammates, carried people, generated entry templates, or an explicit RUN/sprint. The existing 125-unit real separation threshold, custody rules and collision remain authoritative.
2. `src/breach-civilian-mission.ts::rescueFollowGoal`: when the leader is physically moving, place the follower's 23-unit trailing goal along **actual `p-priorP` displacement**. When stationary, retain legacy deterministic facing-based anchor. This reuses the exact same existing route and geometry verification, with no new navigation or sight authority.
2a. **Actual 90-second causal recheck after initial pace + travel-vector correction:** Townhouse 23 SERVICE still broke FOLLOW at 18.63s (distance 128.01), although the original baseline broke at 15.83s (distance 129.13). The actual navigation remains more circuitous than the civilian can catch up with; a 53 vs 43 speed adjustment alone is **not** a complete fix. The final EQA3.1 change therefore applies a **108-unit soft leash to ordinary walking only**, stopping to let a genuine follower approach before the unchanged 125-unit custody-loss boundary. While stopped, `rescueFollowGoal(escort,person)` chooses a legal route toward the person's **actual position**, not the back of the operator's possibly unrelated combat-facing posture. Running remains an explicit way to leave the person behind. Any completed mission, lack of loss, or remaining stalls must be established by the subsequent full 90s witness, not inferred from this policy alone.

3. `src/breach-order-movement.ts`: apply pace scale at the existing MOVE motor call, never in an independent movement/AI loop.
4. `tests/eqa3-1-rescue-escort-pacing.test.mjs`: healthy/injured/invalid/inactive custody, real 60Hz motor in an unobstructed rescue scenario, and WATCH facing orthogonal to actual travel. Existing door, entry, civilian animation and deployment regressions remain.
5. `scripts/audit-eqa3-scout.mjs`: parity with the **corrected** EQA3.1 read-only 90-second benchmark, retaining original frozen EQA3.0 data separately.

## Validation and remaining limits

- First 21 targeted tests passed with zero failures and a valid Vite production build:
  https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/44422152764 .
- Second full 21-test + production + paired-mission run (pace cap alone) passed:
  https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/44422373624 .
- The FOLLOW-heading correction has its own 90-second real Townhouse/Warehouse matched witness and refreshed integration regression gate; interpret final results before merge.
- No claim that a single scripted scout is a complete four-person player-controlled mission, and no rendered/iPhone performance acceptance yet.
- Do not merge or deploy simply because this stage compiles; group with other compatible EQA3 fixes at a deliberate release checkpoint and verify Pages afterward.

## FINAL release-checkpoint evidence — 108-unit soft leash

- [Final full gate](https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/44427056943): **23/23 focused physical, actor/civilian, door and rescue tests passed**; TypeScript check, production bundle and exact 90-second Retail25, Townhouse23 and Warehouse17 scenario corpus all passed.
- The added long-duration unopposed `newSession` real rescue test runs the actual 60Hz fixed-step world, follows a planned real physical route, **requires `phase==='won'` and `mission==='done'`**, requires the actual rescue civilian inside the 37-unit extraction footprint, and denies any FOLLOW separation over the original 125-unit threshold.
- [Actual final 90-second paired Townhouse/Warehouse trace](https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/44422998177): Townhouse 23 SERVICE entered FOLLOW at 9.63s. The subsequent run ended at 17.63s with the civilian **still escorted**, `following=rook`, custody holder `rook`, measured separation **110.42** units. **No separation reported** before this run ended; mission **not** completed, so this does not prove survival in hostile live rescue. This compares with original physical custody loss at 15.83s (129.13 units). Warehouse 17 RESCUE continued to show real gunfire-induced civilian incapacitation, a distinct and deliberately unfixed outcome.
- No blanket AI awareness changes, no relocation/spawning of defenders, no automatic civilian recovery, no geometry bypass, no autonomous forced custody reattachment. Explicit sprint may still break real separation by design.
- This is still an **isolated draft PR**, not included in public Pages until the next approved integration batch; full player-controlled 4-person/iOS tactile confirmation remains outstanding.
