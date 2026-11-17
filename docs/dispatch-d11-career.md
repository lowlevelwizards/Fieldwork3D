# Dispatch D11 — department service and progression

D11.0 audit (existing authoritative campaign):
- Base campaign already owns contracts, fixed rewards, regional pressure,
  four-person squad, individual shooting/composure experience, casualties,
  armor/ammo/medical finances, recruit costs, milestones and career journal.
- D10 supplies an optional, versioned history of actually recorded blue-side
  civilian harm and surrender outcomes. Older Dispatch reports have no
  `dispatchForce`, and missing evidence is NOT proof of no civilian harm.
- Idempotent `resolveOperation` settlement guards `appliedResults`. The
  history cap is 200, but a separate bounded department record should persist
  even after old history rotates. Existing `CampaignState.version=1` remains.
- Quick Play, Sandbox/legacy and Operations/Wasteland must not gain any Dispatch
  additions. No change to contract risk, offer generation, baseline rewards,
  combat, replay or physical policing.

D11.1 — versioned, Dispatch-only operational standing, starting at 50/100,
incremented once for documented completion/failure, objective, grade, squad
casualties, and *confirmed* blue-side civilian harm. The standing measures
operational results, NOT legal culpability. Unreviewed D10 reports do not
receive a clean-evidence bonus. Bounded counters track total and successful
responses, reviewed operations, incidents with confirmed blue harm, recorded
surrenders, and cumulative supplemental appropriations.
D11.2 — modest post-operation operating-support grant for successfully
completed objectives (grade-based with a bounded standing supplement), added
to the existing contract reward rather than changing it. No extra charge
against funds for injuries or civilian harm; D10's score ledger remains
untouched. Expose grant and change as a compact versioned history closeout.
D11.3 — departmental service recognitions at auditable milestones; original
operator progression preserved and Dispatch-only career distinctions awarded
for 3 and 8 *successful participations*, not unverified behavior.
D11.4 — Dispatch-only operations-room display of standing, service tier,
funding, evidence coverage and milestone recognitions, plus per-operation
chronicle receipts. Keep mobile scroll compact; no new menu.
D11.5 — deterministic regression for first/latest saves, missing D10 history,
negative outcomes, accounting, grant limits, duplicate settlement, operator
career, non-Dispatch isolation, and existing campaign economy. Commit stages,
run critical CI, merge one release after earlier Pages verified, and check
the public expected build again.

Deferred: internal affairs adjudication, suspensions, paygrades, pensions,
agency politics, eligibility gates, procedural ROE, fleet/base upgrades,
department inventory/agency specialty programs and faction reputation.
