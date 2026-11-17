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

## D13 release A (merged via PR #1619)
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

## D13 release B — D13.4 creator review and D13.5 continuity

- D13.4: Treat presets as editable starting bundles. Review each selected axis
  before destructive save replacement: authored starting unit, fixed/progressive/
  unrestricted time, actual eligible catalog, career gates, payment policy and
  finite starting stock. Preserve current selections on invalid combinations,
  explain the exact constraint, and disable creation until valid.
- D13.4: Show **Customized <preset>** after any axis differs from the selected
  baseline, both in creator and Operations Room. Do not rewrite the preset ID
  or invent a new save schema. Revert all axes to baseline to restore its
  unmodified label.
- D13.5: A customized campaign name must not claim an unchanged preset; ensure
  the displayed department identity survives save/reload. Continue to use the
  existing post-operation report, Dispatch standing, operator history, retained
  weapon serials and explicitly two-chapter chronology. No retirement or
  personnel-aging simulation added.
- Test presets and custom edits, incompatible choices, two-chapter transition
  and round-trip preservation of old operators, serials and service records.
- New work is isolated to campaign setup, read-only presentation and tests.
  Keep the prior D13 procurement mutations, Quick Play and non-Dispatch
  campaign behavior unchanged. Release from a feature branch only after the
  relevant critical CI, build, previous successful Pages verification and an
  idle production deployment queue.

## D13 release C — D13.6 procurement policy truth

The D2 curated table intentionally omits unassessed choices. An omitted
class is **not** proof that every Dispatch reference explicitly rejects it.
D13.2 incorrectly collapsed both cases into `reference-locked`.

- Evaluate whether any of the **three playable tactical-police references**
  explicitly offers the weapon class as standard or specialist. The unplayable
  2020 patrol preview must never count as an active procurement option.
- When the current setup restricts a class offered under another reference,
  label it `reference-locked`. When no playable authored reference assesses
  that class, show `not-assessed`, not a false definitive refusal.
- Keep standing-only restriction, deployment freeze, budget, stock capacity,
  global Creative bypass, physical ownership and non-Dispatch behavior exactly
  as before. The authoritative purchase function still validates new choices.
- Update the D13 expectations and add a focused matrix covering all presets,
  OMON, historical MP5, standing 70, creative and original campaign.
- Release from its own branch only after the preceding D13B Pages verification,
  the D13C critical PR checks and a clear deployment queue.

## D13 release D — D13.7 pre-creation armory access preview

Campaigns currently choose an authored unit look, time setting and equipment
access before a player can visit the Operations Room. Show the **initial access
policy** at starting standing 50 *before replacing a save*, without pretending
that an offer means free stock, a historic agency issue, or a ready-to-apply gun.

- Extract the exact D12 setup/reference/standing eligibility into one pure
  `mayChooseDispatchSetupContent` helper used by **both** live mutation guard
  and pre-creation projection. Keep the original source list and special
  authorization logic intact (including Open Department content).
- Project all four supported weapon classes at initial standing 50. Display
  `OFFERED`, `STANDING 70`, `RESTRICTED` or `NOT ASSESSED` based on the
  same authorized choices as active procurement and D13C policy attribution.
- Keep budget, stock and deployment checks inside the actual armory quote.
  Preview never starts a simulated campaign, creates an operator, purchases
  equipment, writes a save, or changes accepted equipment.
- Test parity of five presets, a custom OMON reference, standing change,
  progressive 1995 → 2015 reference and retained old weapon ownership.
- Stage and release independently after successful production D13C Pages
  verification and current PR critical CI. Do not pile merges during publishing.

## D13 release E — D13.8 Creative atomic attachment purchase

The existing `purchaseAndEquipWeaponAttachment` already lets Creative
Dispatch quote even when funds are zero, but its **commit** unconditionally
deducted `quote.cost`. This violates D12's economy axis and could make an
otherwise legal no-charge transaction leave negative credits.

- Reuse the authoritative `charge(c, cost)` economy helper at this one
  mutation boundary. Standard campaigns still pay exactly the quoted cost;
  Creative Dispatch keeps the same balance.
- Preserve atomic transaction authority, physical placement, single-instance
  attachment stock, deployed armory freeze, class/serial preservation and
  normal curated Dispatch editing restrictions.
- Verify the no-charge purchase with zero funds, a stocked no-charge transfer,
  magazine and serial conservation, a save round-trip, normal paid purchase,
  insufficient-funds rejection and active-deployment refusal.
- Do **not** silently grant custom Arsenal editor access to Dispatch in this
  stage. That separate capability is explicitly denied in the Arsenal
  campaign adapter and requires its own policy/UX audit rather than a partial
  bypass.
- Merge only after D13D's public Pages build is verified, D13E critical CI
  passes and no Pages deployment is queued or running.

## D13 release F — D13.9 Creative Arsenal authorization

Operations Room already enables `OPEN ARSENAL` for Dispatch campaigns with
global equipment scope and an authored physical weapon build. However, the
Workbench's campaign quote adapter denied **every** Dispatch campaign,
including global Creative, even though the narrower direct attachment route
and parts editing honor its global equipment authorization.

- Permit actual Workbench quote and commit only when a Dispatch campaign has
  `equipmentScope=global`; all restricted references still fail closed.
  Keep the existing physical build, operator, deployment and mount checks.
- Treat `economy=unlimited` independently: use unconstrained purchasing
  power to generate a **real** finite stock transfer, then report `cost=0`
  and leave campaign funds unchanged. The quote still retains the nominal
  individual purchase prices for provenance, not as payable deductions.
- The same global setup with `economy=standard` still pays normally and
  cannot buy without sufficient funds.
- Preserve legacy Campaign and existing narrow Dispatch access tests.
  Test both quote and commit, zero-fund Creative, normal global payments,
  restricted profiles, active deployment, serial/magazine conservation and
  readCampaign save round-trip.
- Keep this independent of D13E (direct buy-and-equip), as it affects a
  different adapter. Merge only after the prior production Pages release is
  confirmed and the associated critical PR checks are green.
