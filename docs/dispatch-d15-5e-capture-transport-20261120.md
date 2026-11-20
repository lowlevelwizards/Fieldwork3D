# D15.5E — Incapacitated capture-target transport

Base: released R2A `418053c5012ee9b3a89fedfe7a955b4eaead4c37`, with public Pages verification from
[44815394135](https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/44815394135).

## D15.5E.1 — read-only eligibility committed
- The real CAPTURE target must be the designated red TeamActor with actual
  nonpositive health; ordinary healthy surrendered suspects remain WALK ESCORT.
- Carrier must be living blue and own no other person; a captured patient
  cannot simultaneously be attached to two operators.
- This preflight does NOT prove the patient is alive, grant custody, relocate
  a body or modify mission state. Tests cover bad identity, wrong objective,
  live surrender, and exclusive ownership.

## E.2 — authored physical transport, feature branch implementation
- Reuses the same existing EVACUATE PlanNode and GO-time medical order
  executor as friendly casualty and real civilian transport.
- Only the designated downed hostile capture target can cross allegiance for
  this specific transport. GO rechecks visible physical contact and sweeps.
- DRAG CAPTURE TARGET / CARRY CAPTURE TARGET are contextual only for the
  observed, reachable designated target; the target remains red TeamActor.
- Actual 60 Hz motor movement, old friendly/civilian regression and extraction
  acceptance are still required before publication.

## E.2 — physically authorize existing EVACUATE, pending
Reuse `breach-game.planCasualtyTransport` and
`breach-order-medical.createMedicalOrderHandler` only for the designated
downed CAPTURE target. Keep GO-time contact, swept reach, timed pickup,
the unchanged TeamActor `carryingId`/`carriedById` relationship and
existing drag/carry speed and actual motor. No actor type or allegiance swap.
Expose DRAG CAPTURE TARGET and CARRY CAPTURE TARGET only when physically
observed, eligible and routeable.

## E.3 — true extraction and physical arbitration, pending
Downed target must actually arrive at extraction under real custody or
direct body recovery. Do not win from operator-only proximity. Verify
the carrier/target motion pair against stationary bodies and closed doors;
no teleport on first pickup, and detach on operator death/STOP/replan.
Maintain the current D15 living restrained walking extraction contract.

## E.4 — replay/visual/debrief and tests, pending
Old `carryingId`/`carriedById` TeamActor frame fields should continue to
record the authoritative relationship. Test 60Hz drag/carry in free space,
blocked doors, changing plan, leader casualty, missing medical identity,
and exact Pages tactical and M3/M4 gates. Do not publish E until complete.
