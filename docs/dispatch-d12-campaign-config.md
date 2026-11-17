# Dispatch D12 — Campaign experiences, profiles and rules

## Product decision
Dispatch is a **setting**: tactical-police incidents, career personnel, department service and procurement.
Sandbox is a **degree of freedom**, not a competing campaign setting. Five presets are saved
as independent axes in the same Dispatch campaign engine: time mode, equipment scope,
unlock access, economy and initial armory. An authored visual reference establishes
the starting squad, not a blanket claim of official item issue.

## Shipped D12 experience presets
- **Department Career** — 2015 US SWAT, fixed period, department kit, career
  authorizations, conventional funds/issued equipment.
- **Historical Campaign** — default 1995 US SWAT, fixed period, department kit,
  curated historical access and normal procurement. Explicit OMON 2002 also playable
  through the custom starting reference; this is a generic unit-family interpretation.
- **Through the Decades** — 1995 US SWAT → 2015 US SWAT after the tenth
  *completed operation*, with original equipment/owners unchanged and newly recruited
  personnel issued the new chapter's kit. This is a bounded **two-snapshot pilot**, NOT
  a historically verified 1980s-to-modern campaign. No calendar-year interpolation.
- **Open Department** — unrestricted time, combined curated Dispatch catalog,
  all eligible selections immediately offered, but acquisitions and career still cost.
- **Creative Sandbox** — unrestricted time, global existing game equipment catalog,
  all eligible choices immediately offered, full Studio editing, very large starting
  armory, unlimited operating funds and a deep supply pool. This still requires valid
  existing item IDs, equipment slots, installed mount interfaces, and ownership
  transfers. No new sidearms or phantom attachments are introduced.

## Data and ownership
- `CampaignState.dispatchSetup` is an optional strict version-1 setup record.
  Old Dispatch saves missing it **retain the 2015 SWAT interpretation**, not an
  implicit migration, while custom/legacy/sandbox campaigns reject fabricated Dispatch
  setup records.
- Save `referenceId`, not duplicate year, national organization, exact named agency,
  or item issue provenance. Resolve facts through the faction reference/timeline.
- `currentDispatchReference` supplies issuance, eligibility and Studio checks;
  a past issued rifle and its serialized ownership is never changed by chapter entry.
- `dispatch-campaign-eligibility` evaluates new choices against the profile,
  existing curated D2 availability table, access tier, and valid slot. The game
  equipment catalog, inventory, magazine allocation and Arsenal geometry remain
  authoritative for the actual transaction.
- A department-scoped specialist choice with career access requires D11 standing 70
  (or an explicitly unrestricted unlock mode). A loss of standing never confiscates
  existing owned equipment.
- Studio retains exact allowed-diff rules for department/Dispatch scopes; creative
  scope permits the ordinary extensive Studio interface. Embedded and standalone
  Studio use the same campaign and profile authority.
- Existing three distinct campaign save slots remain. The creator asks for destructive
  replacement confirmation only after the user chooses a new configuration and offers
  an export action. No operation or render hot-path uses these policies.

## Historical and art guardrails
- `us-swat-mp5-1995`: navy BDU, existing black PASGT-style helmet, soft armor,
  MP5A3 and the authentic game SMG class/magazines.
- `us-swat-2015`: black BDU/MICH/carbine reference as before.
- `russian-omon-2002`: Urban Kamysh, black protective equipment, AKS-74U
  carbine; explicitly not any named Russian city detachment.
- 2020 patrol remains preview-only: no sidearm/patrol gameplay.
- D7 retired the *separate* police helmet. Keep black PASGT or MICH proxies,
  mark unmodeled police face visor missing; do not resurrect the old model.
- Distinguish authentic appearance, visual proxy and researched issue history.
  No new claims about which agency adopted a given item or when.
- The 1995/2015 chapter boundary is an authored playable game milestone,
  **not** a universal firearm introduction year.

## Post-D12 historical ambition, not misrepresented as shipped
A full multi-decade system needs more authentic reference snapshots, dated gear
availability research with provenance, long-term operator retirement/replacement,
campaign chapter pacing and real agency/role separation. It should be its own
production milestone; current D12 supplies a tested, clearly labeled two-chapter
framework. Historical patrol, negotiation, arrest, pistols, legal disciplinary
judgments and national mission geography remain outside the pilot.

## Acceptance
- All five presets validate, round-trip via the Dispatch slot and distinguish access
  from purchased ownership.
- 1995, 2015 and OMON recruits use resolved weapons, clothing and magazines.
- Ten-operation progression changes *future* issuance and eligibility, not existing
  personnel, ownership, achievements, D10 evidence or D11 standing.
- D6 appearance, D7 helmet retirement, original Quick Play and legacy campaign
  boundaries stay correct. Incompatible edits are rejected atomically.
- Run `node --experimental-strip-types --test tests/dispatch-d12-campaigns.test.mjs`,
  affected old Dispatch and equipment regressions, typecheck, production build, and
  existing mobile Studio smoke.
- Feature-branch commits, one guarded merge checkpoint, verify preceding Pages job
  succeeded and served expected SHA before merge; verify new build after merge.
