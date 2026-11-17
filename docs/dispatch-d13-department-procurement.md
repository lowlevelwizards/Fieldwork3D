# Dispatch D13 — department identity, honest availability and procurement

## D13.0 audited, concrete behavior (2026-11-16)
Source of truth: deployed D12 on main `4177410`.

1. D12 creation and persistence have five versioned presets. The existing campaign
   envelope and Dispatch save slot are unchanged. A 1995 MP5 squad, 2015 carbine
   squad and OMON unit reference have valid typed issue; historical patrol/sidearms
   are not playable. Full decades are NOT available.
2. The Operations Room currently only offers **carbine/rifle purchases**, while
   historical Dispatch grants `primary-smg` and specialist `primary-shotgun`.
   The domain enforces catalog eligibility but the UI makes purchasable items
   invisible. Fix by deriving the same purchase states from domain policy.
3. Specialist authorization uses D11 standing `>=70`; the UI does not show
   why a weapon is disabled or when it unlocks. Expose an explicit, bounded
   policy explanation. A reference snapshot is a curated game choice, NOT proof
   of official agency equipment adoption.
4. Progressive Dispatch is *exactly two authored US SWAT snapshots*, 1995 and
   2015. Advancement happens after 10 settled operations via `history.length`;
   new recruits receive the new reference, old inventory and operators are
   unchanged. Show this as a visible milestone, NOT a ticking real calendar.
5. Creative mode is an unlimited **spending policy**, not a literal infinite
   `funds` number. Show purchases as no-charge, leave funds unchanged, preserve
   finite inventory counts and real physical item-transfer validation.
6. Existing UI offers vague `DISPATCH · ... CURRENT LOOK` text. Show
   organization/role/year/standing/progression in a compact accessible
   overview without adding new state or rerendering in the tactical loop.
7. Purchase at the finite serialized inventory ceiling must not charge money
   when the stock reconciliation would reject the item. Use one shared
   procurement quote and enforce the ceiling at mutation time.
8. Existing mission incident, debrief, force reviews, named operator records,
   quick play, non-Dispatch campaigns, and save serialization must be untouched.

## D13 release A (this branch)
- D13.1: Pure department presentation model and compact Operations Room
  identity and two-snapshot service milestone. Visible in Overview and
  Operations Room header. Missing legacy D11 record remains correctly labeled.
- D13.2: Purchase quote per weapon class with offered/standing-restricted/
  not-assessed/supply-frozen/insufficient-funds/cap states; stock & price
  clearly separated. Show **all four** real weapon classes in Dispatch,
  preserve existing two-class original campaign UI.
- D13.3 foundation: A derived, non-mutating ten-response chapter milestone
  with a clear indication that it affects *future issue only*. No false
  full-decade calendar, no automatic retrofit or new catalog dates.
- Critical node tests for all five presets, profile-specific access, standing,
  chapter transition, budget, finite inventory, and preserved non-Dispatch
  behavior. Run critical PR CI and mobile Studio/navigation gates.

## Deferred
Authentic historical calendar dates for all weapon parts; researched agency
procurement records; actual generations of personnel retiring/aging; named
agencies and police-only incident mechanics; real infinite stock. Those
require separate research and gameplay milestones, not UI claims.

## Branch and release procedure
Commit completed stages to feature branch. Group changes into one release
checkpoint; merge only on green CI, no pending prior Pages build, and previous
public Pages expected-build verification. Verify new Pages build after merge.
