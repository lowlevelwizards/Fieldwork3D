# EQA3.0 — combined encounter & mission-decision baseline
**Frozen code:** `f2664739427792055176b566ea77bbd5aa74fd59` (November 18, 2026).
**Scope:** AUDIT ONLY. Zero live gameplay, AI, mission rules, UI or campaign changes.
**Full successful raw corpus:** https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/44420688664
**Cross-cohort analysis / pair CSV:** https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/44420961100
**Draft PR:** https://github.com/lowlevelwizards/Fieldwork3D/pull/1751

## Why the baseline is split

The four sample populations have different denominators and must not be pooled as though a human completed each mission:

1. **55 distinct architectural+mission cases** — seeds 11–21, 11 archetypes × 5 mission types, small sites, actual generated combatants/civilians. Counts real *available* insertion alternatives, room purpose, objective topology, objective intel envelope, room sightline warning, threat/civilian proximity. Geometric nearest-3-room sequence is a candidate ordering, not an executed route.
2. **84 actual fixed-step 45-second scripted-scout trials** — 15 chosen mission cases (11-buildings coverage plus targeted repeats), up to FRONT + one verified non-window alternate, × **three objective-intel settings** unknown/approximate/confirmed. Two cases have no qualifying alternate, so 28 rather than 30 trials per intel cohort. All have separately briefed *architectural floor plans* so the scout can search room centers; **objective whereabouts remain unknown until detected** unless the case is confirmed, and approximate may prioritize only the 3–5 reported candidate rooms. No hidden enemy position, objective room or full world route is supplied as an input to the script before disclosure. Real `planMove`, physical 30-Hz calls to the 60-Hz fixed-step `stepSession`, AI, civilian responses, objective/escort/extraction transitions and replay are observed. **This is ONE scripted scout, not full four-person gameplay or a human choosing a tactical plan.** Incomplete at 45 seconds is not a failed mission.
3. **22 actual passive/diagnostic civilian-and-hostile sessions** — original mission-quality replay is 2 seconds with no player orders, while a separate 20-second Session introduces a genuine auditory `gunshot` evidence event at 1.5 seconds *near* a hostile or civilian, without directly forcing states. This establishes behavior capabilities, NOT spontaneous player decisions.
4. **40 distinct 12-second short motor/contact trials** — 20 seeds × floor-plan vs true-blind. The true-blind driver routes only toward its briefed entrance; the floor-plan route is scripted and should not be treated as default Quick Play Unknown objective search.

## Observed case matrix (verified outputs)

### Structural 55-case corpus

- 55 cases, 11 buildings, five missions, **zero invalid physical sites**.
- **200 total verified deployment choices; all 55 had at least two.** On every site, the geometric nearest-three candidate-room sequence differed between at least two entry placements. That is an *opportunity* for meaningfully different decisions, not a guarantee of interesting gameplay.
- **Eight** objectives have a direct exterior portal in the architectural topology. Non-HOLD missions with direct exposure deserve individual inspection: the placement scorer already penalizes front-door triviality, but cannot eliminate every reachable near-entry objective.
- **Eight** non-CLEAR populated missions have no qualifying nearby assigned objective defender; a warning, not a quota to manufacture hostiles.
- **Eight** sites start a civilian within 55 world units of a hostile, a potentially consequential line-of-fire/refuge/escort setup; not automatically an invalid spawn.
- **360 raw room-exposure observations** across 55 cases, including trivial closets/service rooms; not 360 tactical failures.
- Candidate **Apartment seed 13 RESCUE** combines objective direct exterior access, nearby civilian/hostile, and room-exposure warning.

### Actual 45-second paired scout

| Objective intel | Actual trials | First contacts | Contacts <=2s | Objective secured | Extracted / won | Confirmed/seen civilian | Scripted route aborts | Rejected commands |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Unknown | 28 | 25 | 18 | 9 | 6 | 10 | 12 | 110 |
| Approximate | 28 | 26 | 18 | 13 | 9 | 11 | 10 | 45 |
| Confirmed | 28 | 26 | 18 | 14 | 8 | 12 | 12 | 221 |
| **Total** | **84** | **77** | **54** | **36** | **23** | **33** | **34** | **376** |

- 54/84 encounters occurred within two seconds, **a compelling early-insertion contact candidate for EQA3.1**. The 45s scorer is a single script, and a very early contact may still be believable (a service entrance occupied by someone); audit contact location and awareness before changing placement or reaction timers.
- Among 36 actual paired FRONT versus alternative insertion comparisons, **35 found a different first physically visited room** and **13 had a different mission stage at 45s**. This is evidence of meaningful *physical and outcome differences*, not that one entrance is objectively better.
- The matched cohorts are not monotonic in 45-second completions: unknown 6, approximate 9, confirmed 8. Different route, death, contact and attempted command outcomes can outweigh direct objective knowledge in a simple scout. It does NOT prove recon is unhelpful or that a human would have worse results with confirmed intel.
- A high percentage of the scripted 45-second runs were in contact; this conflicts with the low short 12-second baseline because **the driver, duration and intel contracts are different**. Never interpret it as a sudden AI change.
- **No four-person full-mission claim.** 45s traces do show actual `MISSION COMPLETE` outcomes when achieved: 23/84, not simply generated success flags.

### Precise player-facing problem candidates from matched comparisons

1. **Retail seed 14 HOLD**: with Unknown objective intel, FRONT first confirmed contact at 11.10s, remains in SECURE at 45s and accumulates 32 rejected scripted MOVE commands; SERVICE makes contact at 0.87s and finishes the mission, securing objective at 11.63s. The 2-hostile EQA2 security pass is active. Review entry exposure, objective approach physical landing and overly repeated command rejection **before** changing AI.
2. **Utility seed 20 CAPTURE**: with Unknown intel, FRONT first contact at 28.90s after four rooms; SHUTTER first contact at 0.27s and remains in CLEAR after two. 28.63 seconds contact timing difference from insertion alone — excellent paired first-contact illustration. Whether SHUTTER creates unreasonable immediate danger needs a visual/LOS audit.
3. **Warehouse seed 17 RESCUE**: Unknown-intel FRONT visits six rooms and has first contact at 24.23s, but has not secured objective by 45s; SERVICE visits four and secures the person at 20.23s, though extraction remains unfinished. This is exactly the search-versus-extraction tradeoff to inspect.
4. **Restaurant seed 18 RESCUE**: confirmed-intel SERVICE reaches extraction success in the 45s window; FRONT reaches objective earlier (5.23s versus 15.23s) yet is still in EXTRACT. A shorter path to the target need not be the easier *complete* mission.
5. **Retail seed 25 CAPTURE**: SERVICE contact at 0.87s, then five scripted route-abort episodes and zero room centers visited; FRONT completes while SERVICE remains SECURE. Strong physical entrance/goal-path witness candidate, not evidence of deficient enemy AI.
6. **Townhouse seed 12 INTEL / Townhouse seed 23 RESCUE** (confirmed intel): the driver repeatedly rejects the same objective-directed MOVE (38–42 attempts in individual cases). The pattern may be an inaccessible point, missing room geometry in known-intel clearance, or **bad probe logic**. Don't count repeated requests as independent failures or tune first-contact AI to hide them.

### Major methodological finding: command retry contamination

The **376** rejected planning commands are **not 376 independent failures**.
- **260** are `approach-disclosed-objective` repetitions concentrated in **five** scripts.
- **116** are `explore-briefed-room` requests spread across 25 scripts.
- A rejected `planMove` can be a correct response to an illegal endpoint, wall, fixture, locked leaf, protected hidden intel, or the artificial driver's current state. Need a per-attempt grounded physical-eligibility/known-disclosure witness; fix only incorrect behavior.
- Likewise **34 scripted route aborts** reflect a seven-second no-progress heuristic owned by this diagnostic driver, not a native player UI message or confirmed motor failure.

### Diagnostic AI/civilian response 22-case set

- 22 physically valid / replay valid sites, five mission types and 22 topologies. Mean verified approaches 3.7, window opportunities 1.5, alternate doors 1.3.
- **83 engagement-relevant room overexposure** observations, **141 all-room** observations *in this separate 22-sample cohort*. This must not be compared directly to the 360 raw observations across 55.
- In separate 20-second evidence-stimulated probes: 82 hostiles and 16 civilians across cases, 31 actors coordinated, 27 investigations, **zero investigation-no-progress flags**, 20 retreating actors, six surrenders and 90 actual shots. 21 of 22 cases received a test stimulus. Quiet/unresponsive when no perceptible evidence is not a bug.
- Eight observed contact + shot cases in separate passive 2-second film. No mission completions are expected in a passive two-second replay.

### Short motor/contact 40-case set

- **40/40 valid**, zero rejected orders, zero reported low movement and zero silent door stalls.
- **495 blocked-actor frames** (NOT all necessarily regressions; need per-actor/door evidence), compared with earlier EQA2 script on an older main at 357 frames. This is a cross-commit diagnostic, not a controlled causal comparison and should not be blamed on D3.31F without a frozen paired run.
- **18/40** first-contact cases, 22 no-contact; the true-blind pilot only routes to a briefed entrance and is not a complete blind-map search.

## Extended 90-second boundary check (three exact priority cases)

Successful independently stored 90-second scripted-scout follow-up:
https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/44421161639
([Unknown raw artifact](https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/44421161639),
same workflow has separately downloadable Confirmed raw artifact).

- **Unknown intel**: six actual entry-paired trials across Retail seed 14 HOLD, Warehouse seed 17 RESCUE and Retail seed 25 CAPTURE; **2 completed**, **3 secured the objective**, 6 first contacts/shots, **12 script-directed route aborts**, 77 repeated rejections, **0** recorded final-state rescue escort.
- **Confirmed intel**: same six cases, **2 completed**, **4 secured the objective**, 6 first contacts/shots, **13 scripted route aborts**, 82 repeated rejections, **0** final-state escort.
- Both cohorts remain replay/position valid with zero exceptions.
- **Retail 25 CAPTURE SERVICE** still reaches ZERO room centers and **11 scripted route aborts at 90s** under BOTH intel settings, compared with five aborts at 45s. Its FRONT pair succeeds. High-priority route/physical-clearance investigation; not attributable to AI or a new timer without per-step witnesses.
- **Warehouse 17 RESCUE** reaches `EXTRACT` stage under both entrances with Confirmed intel, and SERVICE reaches `EXTRACT` with Unknown intel, but none finishes by 90 seconds. The final-state `rescueSecured`/`rescueEscorted` fields are false, despite earlier objective-stage transition. **Do not interpret final state as proof that the civilian was never secured earlier**; inspect full state and FOLLOW order timeline, escort separation and reachability.
- Doubling from 45 to 90 seconds does **not** remove these repeatable mission-flow deficiencies in this particular scripted driver. The driver itself may be mishandling commands, so exact investigation comes before fixes.

## Ranked EQA3.1–3.4 targets

**P0: Early insertion-contact shape** — sample actual first sighting origin/door and who spotted whom in Retail 14 SERVICE, Utility 20 SHUTTER, Retail 25 SERVICE, Apartment 13 RESCUE. Prefer physical, varied room occupation and believable first orientation over simply delaying target acquisition or adding defenders. Preserve justified sentries at entrances.

**P0: Real objective-landing versus bad scout retry** — reconstruct Townhouse 12 INTEL and Townhouse 23 RESCUE repeated rejected commands using exact real known clearance, actuator phase, goal footprint and planner restrictions. After deciding which are valid rejections, either improve audit-driver choice or fix narrowly proven impossible yet authorized goal.

**P1: Rescue escort/extraction** — in the 45s scout, 7 RESCUE trials per intel cohort yielded **zero**, **zero**, and **one** extraction success, respectively, but many reached EXTRACT stage. Increase observation window and inspect FOLLOW handoff, path length, separation, time budget; do not call it a confirmed bug before longer/full-squad trials.

**P1: Entrance significance and route choice** — pair Retail 14 HOLD, Warehouse 17 RESCUE, Restaurant 18 RESCUE, Utility 20 CAPTURE and Retail 25 CAPTURE under matching objectives. Preserve one high-risk short route and one safer slower route when organically supported, not force every option to have the same staged problem.

**P2: Campaign intel quality** — after controlled human/4-squad observation, use existing Unknown/Approximate/Confirmed and campaign intelligence ledger; prefer credible leads connected to previous operation records. No global target pin or omniscient enemy report.

**P2: Room geometry/cover** — filter the engagement-relevant 83 candidate observations by purpose/size/available physical cover. Fix rooms where the first contact is tactically one-dimensional without blocking plausible civilian movement.

## Next evidence before gameplay edits

- Extend RESCUE to 90–120 simulated seconds and record exact follow/unfollow and route-time diagnostics, or run real complete missions, before adjusting escort mechanics.
- Capture the moment first contact becomes confirmed, door used, eye-level and muzzle-level cover, and source of the evidence. Compare insertion-side risk **without assuming a forced alarm**.
- Add authoring reason codes for the 5 repeated objective-MOVE rejection cases, distinguishing correct protected endpoint from wrong planner behavior, without adding live gameplay hot-path instrumentation.
- Test actual four-person, pause-and-plan with real rendered first-contact clips, especially on phone. Short fixed-step probes can establish facts, never intrinsic fun.
- Run follow-up campaign recon A/B only after complete tactical episodes establish the decision value of more precise objective knowledge.

**Release policy:** This PR is data-only and remains draft. No merge or public deployment was requested; any eventual encounter changes should go into isolated feature branches and one verified release batch.

## EQA3.2 initial-door objective landing / route isolation

Full actual generated scenario diagnostic workflow:
https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/44427022045 .
Source: `scripts/audit-eqa3-objective-landing.mjs`.

- Checked **eight exact entrance/missions**: Townhouse seed 12 INTEL front/service, Townhouse seed 23 RESCUE front/service, Retail seed 14 HOLD front/service, Retail seed 25 CAPTURE front/service; **97** sample contact/standing points per case, radii 0, 10, 16, 24, 30, 34, 35.
- **All eight** have viable physical standing and contact spots near the objective. Under the original **initial fully closed door states**, no world-body route from the actual insertion point could reach those goal spots; this diagnostic does not claim doors are automatically operable or ought to be bypassed. For example, Townhouse 12 INTEL objective (151,500.5), adjacent unopened D1 (210,500.5); Townhouse 23 RESCUE objective (484,589), adjacent unopened D1 (484,530). None of those D1 leaves was locked at site initialization.
- `planMove` **accepted all 97** room-contact candidates at initial planning time in each case, using the intended floor-plan intel route contract; it did **not** reject those goal coordinates for invalid body clearance. This is a key contrast with the repeated objective-command rejections later in the *scripted driver*. Initial planner acceptance is **not proof the motor will pass a closed leaf** without an opening action.
- The later 83–87 repeated orders in Townhouse scripts occur **after simulation and partial movement**. The scout never authors OPEN on a diagnosed door, so the actual closed leaf and actor position at the rejection must be considered. This result **does not prove an engine planning bug** and does not warrant weakening the physical portal or inventing automatic shortcuts.
- A separate hypothetical **all-doors-open geometry sensitivity** run is recorded at
  https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/44427241359 .
  It changes only **copied** test door leaves, not in-game door or AI state; treat it as a reachability bound rather than a player-operable passage guarantee.
- Practical next player-facing work: build a scripted **explicit legal OPEN/entry interaction** before retrying the exact goal and classify the rejection reason. Improve a tactical error hint only if real player commands still fail despite an open, discovered, physically passable route.
