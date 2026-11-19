# EQA3.5 — Optical first-contact and rescue casualty forensic gate

**Branch:** `feature/eqa3-5-contact-rescue-forensics-20261118`.
**Input evidence:** EQA3.3/3.4 physical simulation records, merged audit PR #1756.
**Scope:** read-only, simulation-authoritative instrumentation. **No changes** to AI threat acquisition, shot damage, deployment, objective clues, civilian immunity, following speed or mission resolution.

## Why this stage

EQA3.3's 15 real entry trials showed four confirmed contacts before an authored entrance reached 0.72 opening: Restaurant18 FRONT (0.52s), Utility20 SHUTTER (0.32s), Townhouse23 FRONT (0.32s), Retail25 FRONT (0.32s). This is a *review set*, **not evidence of seeing through solid closed walls**. EQA3.3 also observed Apartment13 RESCUE civilian at ~85 world units from first contact, which is proximity only. EQA3.4's Warehouse17 RESCUE mission reached the target on some routes but civilian harm and lost FOLLOW complicated completion. The earlier scripted-scout rejected-order confound was corrected in EQA3.4 and must not be revived as a gameplay bug.

## Stage A — exact first-contact optical witness

Run `node --experimental-strip-types scripts/audit-eqa3-first-contact.mjs --forensic` on the 8 frozen mission seeds/15 real entrances. This retains physical GO-time OPEN and the same briefed-room move; the forensic flag **only writes data**.

At the **actual first confirmed inSight** pair(s), capture:

- observer/target IDs, sides, world endpoints, heading, vision progress and sightline distance;
- effective height-based `exposure(..., visionOnly=true)` against the session-owned walls and cover;
- currently intersected **optical door leaf** segments, their style and hinge openness;
- intersected window pane segments, sill/head elevations and shattered/open flags;
- actual entry-door open fraction *at contact*, not only eventual `doorOpensAt`.

Do not interpret an intersected window pane as an opaque wall: windows permit visual sight and have separate ballistic behavior. An actual `inSight` optical contradiction, if any, is a **stop-and-investigate** finding, not a license for broad AI nerfs. A ray without an intersection likewise does not establish good player readability: rendered entrance approach, reaction time and cover still require a human scene check.

## Stage B — attributed rescue injury and custody

Run both `--intel=unknown` and `--intel=confirmed` with `--smoke --seed=17 --seconds=90 --door-aware --forensic` in `audit-eqa3-mission-decisions.mjs`. Exactly two available FRONT/SERVICE entries per intel cohort. Preserve real 60Hz internal simulation, legal door orders and surviving-squad handoffs.

For each physical shot, record its authoritative muzzle and impact endpoints, timestamp, target and source side (forensics only). For each civilian harm event, record the authoritative `shotId`, shooter, victim, position, previous/resulting health, severity, civilian state, FOLLOW/carrier and any currently captured matching shot. Snapshot the actual rescue target's health, state, assigned escort/carrier and location whenever those states or the mission stage change.

Interpretation requires separating (a) civilian wound from a legitimate traversing projectile; (b) loss of FOLLOW because civilian was incapacitated; (c) valid escort but time-limited exit; and (d) missing scripted player orders. Never add free civilian shielding, auto-FOLLOW or hidden objective information to make a metric greener.

## Critical acceptance

- EQA3.3 original physical OPEN and pair tests remain green.
- Each observed first contact has at least one actual confirmed sightline witness; no optical exposure contradiction is silently ignored.
- EQA3.4 Warehouse17 both intel cohorts have two legal entries and zero simulation-integrity failures.
- All meaningful civilian injuries are shot-ID-attributed to an existing authoritative harm event. Missing corresponding transient shot data is recorded as such, **not invented**.
- Preserve Retail14 front/service risk, Utility20 front/shutter risk and Warehouse17 possible quiet search; no forced-firefight target.
- No gameplay merge from this audit. A targeted gameplay change needs a verified incident, a paired fixed-seed regression, and a separate production release checkpoint.

## Next stage after CI

Inspect the four exact sightline witnesses and the Warehouse17 injury/escort sequence. If a *specific* contradiction is real, make the smallest source fix on a fresh feature branch (for instance, a bad occluder or spawn sightline, illegal firing-lane visibility, or a demonstrable escort route failure), preserving the nonproblematic entry contrasts. Verify physical traces and the core tactical gate before any release. Apartment13 is still a separate visual-proximity witness, not a proven civilian-damage defect.

## First completed EQA3.5 CI evidence

[First green 60Hz optical + rescue job](https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/44440470583), with raw six-file JSON artifact. All 15 physical door opens, all 7 entrance pairs and all 11 first contacts still passed. There were **22 actual sightline rays and zero blocked optical-exposure contradictions**.

Four pre-open first-contact witnesses resolved more specifically:

| Mission / entry | Contact before opening | Sightline observation |
| --- | --- | --- |
| Restaurant18 RESCUE / FRONT | 0.52s vs 1.52s OPEN | Two blue-to-red rays pass through the still-closed **glazed** FRONT and DOUBLE-L leaves; transparent optical glazing, not a solid-wall contradiction |
| Utility20 CAPTURE / SHUTTER | 0.32s vs 1.42s OPEN | Two opposing blue/red rays do **not** cross the shutter leaf or any recorded window; exposed line of sight around that insertion, not visibility through steel |
| Townhouse23 RESCUE / FRONT | 0.32s vs 1.52s OPEN | One blue-to-red ray intersects closed **french** glass leaf |
| Retail25 CAPTURE / FRONT | 0.32s vs 2.72s OPEN | Six blue-to-red rays intersect closed **glazed** FRONT leaf |

Thus the four cases are **not evidence of an opaque door/visibility bug**. This does not yet certify rendered fairness of facing, distance and cover from the player's camera; review exact scene images before changing geometry. An optical ray may pass through glass while physical bullet penetration is separately determined.

Warehouse17 RESCUE, actual player-legal actions and real full 90s simulations, UNKNOWN vs CONFIRMED with FRONT/SERVICE:

- UNKNOWN FRONT: one red-side guard projectile injured the rescue person at **37.40s** (health 2→1). At 37.63s the civilian became compliant and the objective entered EXTRACT; at **38.63s** the injured civilian was actually FOLLOWING ROOK. No completed extraction within 90s. UNKNOWN SERVICE did not secure the objective and handed scripted authority to a genuine surviving operator after ROOK was incapacitated.
- CONFIRMED FRONT: red-side guard projectiles struck the rescue person at **24.67s and 25.30s**, health **2→1→0**; objective reached EXTRACT at 25.23s but civilian became incapacitated before FOLLOW.
- CONFIRMED SERVICE: the same guard fired physically intersecting projectiles at **20.30s and 20.93s**, health **2→1→0**; objective entered EXTRACT at 20.63s but civilian was incapacitated before FOLLOW.
- Across those four episodes there were zero rejected scripted orders, zero artificial route aborts and zero integrity failures. Neither confirmed insertion completed extraction in 90s. All five reported civilian wounds had authoritative red-side guard `shotId` and corresponding physical projectile endpoints.

**Crucial attribution limitation:** the `ShotEvent.targetId` stored on a projectile means **the resolved physical person that was hit**, *not necessarily the combatant the shooter deliberately aimed at*. The 2nd forensic instrument pass records the shooter's `TeamActor.targetId` separately. Do **not** classify these as deliberate hostage executions without that evidence. The initial witness does establish that gunfire physically crossed the unprotected civilian's position just as rescuers approached.

Design implication: prioritize assessing *real player choice and safe approach/cover* in this specific rescue room, not invisible civilian invulnerability, generic AI delays or forced guarantees. A person being hit by hostile fire remains a credible possible outcome; a repeated unavoidable corridor with no meaningful counterplay would instead justify a narrow geometry/placement fix.

## EQA3.5E follow-up — intended target separated from physical hit

[Re-run after separate intended-target instrumentation](https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/44440641838) **SUCCESS**. The same authentic physical cohorts confirmed that **all five** recorded civilian-intercepting guard shots had `firingActorTargetId="rook"`; the physically resolved `ShotEvent.targetId` was `"civ:rescue:17"`. The guard was **engaging an armed operator**, and the civilian occupied the same fire corridor. The exact blue player positions when these shots resolved were only approximately 3.6–4.9 world units from the person. This is a credible ballistic-interception result, **not** a deliberate hostile civilian-targeting behavior. Preserve independent physical shot resolution.

The current controlled scripted scout is intentionally simplistic and repeatedly approaches the *exact* disclosed or visually discovered objective coordinate. Because friendly-to-neutral traffic is explicitly soft in `breach-movement-authority.ts`, this can leave an operator effectively overlapping the rescue person even though civilian SECURE/FOLLOW interactions are allowed from roughly 28 world units away. Before any change to a live movement/civilian contract, test whether an equally legal, deliberate *stand-off* rescue approach avoids this exposed corridor. A positive result would be a **player tactical-choice witness**, not evidence that all scripted rescue outcomes should be protected or that all civilian traffic must become hard-blocking.

## EQA3.5H–I — matched stand-off A/B: do not overfit to it

[Matched original vs optional stand-off 90-second sessions](https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/44440849663) **SUCCESS** for all four Warehouse17 UNKNOWN/CONFIRMED FRONT/SERVICE entries. This new flag is **offline scripted player decision input only**; it changes no live code, enemies, damage, civilian physics or hidden objective knowledge. Three separate 22–25-unit stand-off orders were accepted through the public `planMove` contract, zero had to fall back to the original exact civilian point, zero commands were rejected, all world integrity checks passed. This is an **A/B of imperfect deterministic policies**, not proof that a human player should always use a computed ring position.

| Briefing / insertion | Original 90s scripted scout | Stand-off scripted scout | What it shows |
| --- | --- | --- | --- |
| UNKNOWN / FRONT | Objective reached, 1 actual hostile civilian hit, FOLLOW | Identical route/outcome, no stand-off order needed | Merely enabling the flag does not protect someone already reached during room search |
| UNKNOWN / SERVICE | Failed to secure target by 90s, no civilian hits | Mission `done`, 1 hostile civilian hit, healthy-enough FOLLOW | Alternate legal approach improved search/extraction in this exact seed while **not** preventing injury |
| CONFIRMED / FRONT | Target secured, two hostile civilian shots incapacitate person | Did not reach target; no civilian hit; one measured route abort | Zero harm cannot count as success if the scripted rescuer never arrives |
| CONFIRMED / SERVICE | Target secured, two hits incapacitate person | Still two hits and incapacitation at roughly 18–20 units between ROOK and civilian | Simple radial separation alone does **not** solve an exposed firing corridor |

Note the old `extractedAt=null` for a `missionStage=done` episode is an **audit sampling gap**: the game can transition out of RUNNING between the script's every-6-tick samples. EQA3.5J records terminal transition at each actual `stepSession`, without editing the mission or claiming an unobserved clock. Check the next CI re-run before quoting an exact completion time.

**Decision:** do **not** ship automatic stand-off, enemy aim penalties, civilian invulnerability or new rescue placement. The safer opportunity, if player visual review confirms it, is making it easy to author a deliberate rescue approach, observe whether a civilian is between visible gunfire and operators, and transition to FOLLOW without crowding the rescue person. Continue exploring per-room cover and approach choices with actual player-visible knowledge. One failed scripted route is an audit-driver or specific path witness until reproduced in gameplay, not a generalized movement defect.
