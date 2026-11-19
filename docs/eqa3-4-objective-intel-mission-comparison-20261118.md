# EQA3.4 — Objective intelligence affects search, contact and extraction

**Audit-only**, no production, AI, mission generation, campaign economy or door changes. Frozen game baseline: `0490bba3177e4792e39ab32f6e946ac053cd613f` (verified EQA3.2 release), with separately authored GO-time player-legal OPEN interactions in the diagnostic script.

## Protocol
Three chosen exact generated missions, FRONT versus first non-window alternative:
- Retail seed 14 HOLD
- Warehouse seed 17 RESCUE
- Retail seed 25 CAPTURE

Pair each with **UNKNOWN** and **CONFIRMED** objective-intel briefing, while keeping floor-plan architectural information identical. `newSession` creates real squad/AI/civilians with the same generator inputs; the scripted operator issues legal OPEN of already-known nearby real doors, searches briefed room centers without using hidden objective truth, can change to the objective location only if discovered or confirmed, and executes actual 60Hz fixed-step `stepSession` for up to 90s. Capture first contact, physically accepted door orders, actor position, civilian custody, mission stage and extraction. This is still one scripted controllable operator at a time, NOT a four-person coordinated human mission or a causal randomized trial of recon.

## Preliminary six-pair evidence (before casualty-driver correction)

[First confirmed cohort](https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/44431800776), **SUCCESS** both jobs, zero simulation-integrity exceptions.

| 90s actual-mission measure | UNKNOWN | CONFIRMED |
| --- | ---: | ---: |
| Trials | 6 | 6 |
| Objectives secured/reached | 4 | 5 |
| Actual mission completions | 3 | 3 |
| First contacts | 6 | 6 |
| Accepted explicit OPEN orders | 5 | 4 |
| Detector-style route aborts | 0 | 0 |
| Rejected **scripted** orders | 75 | 80 |
| Room centers physically visited | 21 | 15 |

Cases:
- **Retail 14 HOLD:** FRONT remained in SECURE, SERVICE completed, with either intel setting. SERVICE saw contact at 2.73s, held and finished; FRONT had many rejected scripted commands. Entrance choice dominated target knowledge in this limited driver.
- **Warehouse 17 RESCUE:** UNKNOWN/FRONT approached after a longer search (objective 37.63s vs CONFIRMED/FRONT 25.23s) but ended with an active real civilian FOLLOW, while CONFIRMED trials ended at EXTRACT without active follow. This is NOT evidence that recon makes rescue worse: gunfire, injured civilians and the driver's actions differ. UNKNOWN/SERVICE had not secured objective in 90s; CONFIRMED/SERVICE had reached EXTRACT at 20.63s.
- **Retail 25 CAPTURE:** both FRONT and SERVICE completed with either intel setting. In both cohorts FRONT reached objective at 14.03s, SERVICE at 17.63s. Initial contact disclosed the useful position early; precise prebriefing made little difference to this scripted route. This is legitimate design variation, not a recon failure.

**Important diagnosed confound:** the original scout script continued attempting `planMove` on a dead original operator. Previous Townhouse INTEL forensics already recorded original scout health zero; rejected commands on a dead actor are NOT a navigation defect. To correct this, `scripts/audit-eqa3-mission-decisions.mjs` now transfers its scripted decision authority to a surviving physical squadmate without teleporting, reviving, bypassing locks or editing defeated orders. This does not introduce new autonomous game AI. The corrected companion comparison is [run 44432005862](https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/44432005862); **do not treat the earlier 75/80 rejection counts or completions as final until this gate is reviewed**.

## Next evidence-based changes, not assumed facts

1. Inspect the exact civilian injury and FOLLOW timeline in **Warehouse 17**; compare real cover, enemy muzzle rays and floor-plan extraction paths before changing civilian placement, health or behavioral reaction.
2. Inspect what tactical obstacle blocked **Retail 14 FRONT**, separating actual hostile incapacitation from genuine impossible objective-point authoring. A human may pause and switch squad members or breach another door; this audit now attempts the former.
3. Evaluate per-mission recon's *decision value*: approximate area should offer a meaningful shortlist, confirmed should support choosing safer options but may not shorten a firefight or prevent a casualty. Never leak exact hidden objective coordinates in UNKNOWN.
4. Avoid metrics that reward more gunfire or penalize a quiet search. Prior actual 18s paired contact witness: Retail14 Front quiet vs Service contested, Utility20 Front quiet vs Shutter contested, Warehouse17 quiet from both.

**Release discipline:** keep this report and the EQA3.3 first-contact source in data-only draft PR #1756. No merge/deploy for audits. Ship only separately verified targeted gameplay corrections when a physically reproduced need remains after audit-driver confounds are removed.

## Corrected final scout-handoff evidence — CI green

[Completed corrected matched workflow](https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/44432005862) — both UNKNOWN and CONFIRMED actual 90s cohorts **SUCCESS** (zero exceptions, zero invalid replay or nonfinite positions). The driver now issues new orders to real surviving operators after the scripted point scout is incapacitated, without teleport, revival, hidden objective knowledge or AI modification.

| Corrected measure | UNKNOWN | CONFIRMED |
| --- | ---: | ---: |
| Matched actual trials | 6 | 6 |
| Objectives secured / reached | **4** | **6** |
| Fully completed | **3** | **4** |
| Confirmed first contact and actual shots | 6 | 6 |
| Legal OPEN orders issued | 5 | 4 |
| Real surviving-squad handoffs after scout casualty | **3** | **1** |
| Rejected script-authored commands | **0** | **0** |
| Artificial motor aborts | **0** | **0** |
| Room centers visited | 21 | 17 |

**Crucial correction:** all 75 UNKNOWN and 80 CONFIRMED repeated rejected commands from the prior audit were attempts to command incapacitated original actors. Correct user-facing conclusion is **no confirmed MOVE-authoring regression** in this set. Original results remain archived to preserve how the diagnostic error was found; they must not appear as current defect counts.

**Case-level consequences:**
- **Retail seed 14 HOLD / FRONT:** CONFIRMED briefing first contact at ~8.10s; original scout ROOK incapacitated at 9.67s, scripted control handed off to surviving MOSS, mission truly completed with objective secured at 23.63s. UNKNOWN briefing first contact ~13.10s; ROOK and MOSS incapacitated at 15.17/16.80s, script passed control to VALE who later also had health 0; no completion by 90s. This outcome is not proof that richer intel itself makes the actor more skilled: route order and exposure diverged.
- **Retail 14 HOLD / SERVICE:** Both intel settings completed, objective secured at 12.43s. The alternate entry was more consequential than the extra recon in this exact seed.
- **Warehouse 17 RESCUE:** CONFIRMED FRONT/SERVICE obtained the rescue objective at 25.23/20.63s but neither maintained active FOLLOW at 90s due actual civilian injury/extraction circumstances. UNKNOWN FRONT found it later at 37.63s but ended with the rescued civilian secured and actually following; UNKNOWN SERVICE had not reached objective at 90s. The single-scout driver cannot issue a full human squad protection/carry plan.
- **Retail 25 CAPTURE:** FRONT and SERVICE completed in both cohorts, objectives obtained at 14.03s and 17.63s. Early target contact makes advance objective information less consequential here.
- **Zero invalid worlds, door teleport, script route aborts or rejected orders** in corrected samples. Not a guarantee that every human-produced plan is physically ideal.

**Design readout:** Prebriefing can materially aid objective acquisition and squad continuation, but is *not* a guaranteed win button. A choice of entrance and what the player does after contact are at least as important. Keep UNKNOWN as default Quick Play, APPROXIMATE as meaningful campaign lead, and CONFIRMED as earned information rather than freely disclosed pins. No sweeping AI reaction nerf, hard enemy quota or invisible civilian invulnerability is justified by these 12 trials.
