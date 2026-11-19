# EQA3.3 — Real first-contact and paired-entrance evidence after EQA3.2

**Date:** 2026-11-18. **Frozen live baseline:** `0490bba3177e4792e39ab32f6e946ac053cd613f` (EQA3.2 physical door stance merged and public Pages verified). **Purpose:** audit-only, no AI/mission changes or deployment.

## Evidence

Actions run [EQA3.3 actual first contact](https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/44431442601) **SUCCESS**. The raw `eqa3-3-first-contact-16` artifact contains each generated mission and the exact observed actor/enemy/civilian response. Source script: `scripts/audit-eqa3-first-contact.mjs`; `EQA3_OUTPUT` writes reproducible JSON.

Protocol: eight selected real seed/mission pairs, front and first non-window alternate when available; 15 valid cases (seven full entry pairs, one front-only Apartment 13). Existing real `generateSite` and `newSession` with floor-plan architectural intel and civilians; order `planDoor(..., 'open')` for closest legitimate *known*, unlocked, initially closed entrance, GO-time 60Hz fixed-step `stepSession`, followed by one `planMove` toward the nearest **briefed room center**. The driver never paths toward a hidden objective, never teleports actors, never spawns a forced disturbance or bypasses the live hinge. All first sighting reports use real `inSight` confirmed perception, not geometric nearest-distance guesses. Observations continue for 18 seconds, with real shots counted via `nextShotId`. This is not a human 4-person full mission, a soundness proof of every generated room, or a rating of fun.

## Observations (15 live fixed-step cases)

- **15/15 authored OPEN doors actually achieved >=0.72 physical openness**. Zero scenario exceptions, zero unreasonably stationary door-entry cases, no missing ordinary room-route command.
- **11/15** confirmed hostile encounter; **7/15** first contact within two seconds; **11/15** emitted at least one real shot. **Four first contacts preceded the initial doorway reaching >=0.72 openness**, suggesting exterior sightline review, not proof of shooting through a closed opaque leaf.
- **Nine** cases had confirmed hostile sight of scout and **11** had confirmed squad sight of a hostile at some point. This is asymmetric perception and may be legitimate: an unseen prepared defender can shoot and a trained squad can surprise an occupant.
- Compared to EQA3.0's 54/84 <=2s, denominators and protocols differ: this 18s cohort executes real explicitly opened entrances and starts with only ONE nearest-briefed-room move, while the previous 45s scripted scout had no authored door opening. Do **not** characterize the change in ratios as a gameplay regression or a time-to-contact improvement.
- Actual follow-up snapshots captured role, readiness, observed travel from spawn, alert state, casualty health and existence of combat choice. Some investigating/cover/retreat behaviors are already present; **do not introduce a new generalized AI layer** merely to increase number of events.

## Actual paired entrance contrasts

| Frozen generated mission | FRONT | Alternate |
| --- | --- | --- |
| Townhouse seed 12 INTEL | Contact 1.82s, 16 shots | SERVICE: contact 1.72s, 12 shots; same first perceived person — low first-contact distinction |
| Retail seed 14 HOLD | No contact, 0 shots at 18s | SERVICE: contact 2.72s, 23 shots; different entry risk |
| Warehouse seed 17 RESCUE | Quiet 18s, 0 shots | SERVICE: also quiet 18s; **do not force firefight** |
| Restaurant seed 18 RESCUE | Contact 0.52s, 5 shots | SERVICE: contact 2.72s, 10 shots; different alert timing |
| Utility seed 20 CAPTURE | No contact, 0 shots | SHUTTER: contact 0.32s, 12 shots; high-exposure choice |
| Townhouse seed 23 RESCUE | Contact 0.32s, 17 shots | SERVICE: contact 1.72s, 10 shots; different person |
| Retail seed 25 CAPTURE | Contact 0.32s, 4 shots | SERVICE: contact 2.72s, 8 shots; different contact person |

**Apartment seed 13 RESCUE** has only one qualifying non-window insertion under the test selector: FRONT contact at 2.02s, 13 shots, and an observable rescue civilian **85.19 world units** from the scout at that encounter. This is an actual civilian-proximity decision candidate; it is NOT proof the civilian was hit, unjustly spawned, or had an unobstructed firing line.

**Before-door-open contact to verify visually:** Restaurant 18 FRONT (0.52s versus opening 1.52s), Utility 20 SHUTTER (0.32s versus opening 1.42s), Townhouse 23 FRONT (0.32s versus opening 1.52s), and Retail 25 FRONT (0.32s versus opening 2.72s). The engine's normal visibility checks accepted them, but we have not reconstructed each exact window/exterior/side angle on a rendered phone. Preserve genuine exposed entrances.

## What to do next

1. **EQA3.3a — verify four early exterior contacts visually** and whether any truly false LOS or unfair no-reaction spawn exists. Only then change specific sightline/initial position/cover geometry.
2. **EQA3.3b — rescue + contact consequence:** Apartment 13 sightline/nearby civilian and Warehouse 17 later civilian gunfire injury. Check actual line of fire, safe routes and lawful cover/escort before moving civilians or shielding them.
3. **EQA3.4 — complete decision episodes:** match UNKNOWN/APPROXIMATE/CONFIRMED objective intel with actual door opening, multiple room searches, SECURE/FOLLOW, extraction, and campaign recon context. Record outcomes and what *information* changed the human-plausible route; prefer credible partial intel over a map pin.
4. Protect the **Retail 14 and Utility 20 entry contrast** and **Warehouse 17 quiet search** in future regression audits. The release criterion is encounter diversity and credible physical responses, not more kills or a fixed time to first combat.
5. After first visual/phone scene witness, build *specific* fixes in a new feature branch, with only critical physical and mission regression tests. Group compatible changes in the next release batch; do not merge audit-only scripts merely to trigger a production deployment.

**Existing separate audits:** draft PR #1751 contains EQA3.0–EQA3.2 older frozen-corpus diagnostics; EQA3.1 gameplay and EQA3.2 door-stance correction are already merged and public. This document intentionally starts from EQA3.2 live `main`, not that older data-only branch.
