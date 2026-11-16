# Dispatch D2 — small-set campaign content policy (planned, NOT implemented)

## Design constraint
D2 must not broaden the faction or asset catalogue. Source input is **only**
the existing four police appearance references and already-built gameplay gear,
weapons, clothing and markings. A visual reference is NOT evidence that a
particular firearm or item was officially issued. No new weapon models, pistols,
named agencies, historical issue claims, cosmetic cuts or gameplay mechanics.

D2 is a **policy and selection layer** over existing authoritative catalogs,
not a duplicate gear database. It must preserve unrestricted Quick Play and
Sandbox Campaign; existing legacy campaign saves cannot become restricted
unless an explicit new Dispatch campaign context is selected. The current
`CAMPAIGN_PRESETS.dispatch` is a defined design identity, **not a playable
mode**. Do not simply switch it on before mission creation and save ownership
are safe.

## Policy semantics (D2.1)
- Require explicit context: mode (Dispatch / Quick Play / Sandbox /
  legacy campaign), organization ID, role timeline ID, selected reference ID
  and selected year if applicable.
- Four results: `available`, `specialist`, `not-offered`,
  `unclassified`. `unclassified` remains explicitly unknown; it must not
  become "historically authorized" or silently count as available.
- Separate eligibility from visual fidelity, historical evidence, inventory
  ownership, weapon mechanics and campaign save compatibility.
- Output stable ID, reason and provenance. Missing item or reference ID
  must not silently fall back to a generic weapon.
- For a Dispatch interface, `available` is selectable; `specialist` may
  be offered under an explicit specialist-context rule; `not-offered` and
  `unclassified` are not offered as new selections. Outside an explicitly
  Dispatch campaign context the shared catalogs remain unrestricted.

## Starter coverage (D2.2)
- Reference looks: US SWAT 1995, US SWAT 2015, US patrol 2020, OMON 2002.
- Apply a small curatorial policy to **already existing** gear class IDs,
  weapon preset IDs, palette/camo IDs and identity marking IDs actually
  needed by those four authored appearances.
- Treat generic pump shotguns (if offered) as current *gameplay category
  models*, not invented Remington/Mossberg/Benelli implementations.
- Do not infer full agency inventories from one appearance recipe or add
  broad country-level "ever used" shortcuts.
- Keep per-role differences real: patrol does not automatically carry a
  mandatory rifle simply because its current 3D reference has an AR proxy.
- Explicit exception states for retained legacy/unknown gear, without
  converting ownership or unequipping saved items.

## Pure filtering and preview (D2.3)
- Build a deterministic pure projection of existing catalog choices for a
  supplied mode/context: allowed items, unavailable items, reasons and
  retained-current-choice notice.
- Do not change `EquipmentLoadout`, `CampaignRules`, wardrobe saves, ammo,
  parts, ownership records, mission state or tactical simulation.
- A read-only preview can be added to an existing setup UI **only** where
  explicitly labeled "Dispatch preview"; not a fictional playable mode.
- No extra per-frame computations, new 3D renderer or duplicated asset data.

## Activation boundary (D2.4; separate integration gate)
- A real Dispatch campaign selection requires an explicit creator/launch
  context, safe save ownership and a proven supported equipment-edit path.
- Until those prerequisites exist, keep the feature in preview/policy-only
  status and keep Dispatch labeled planned.
- Restrict **new choices**, never silently discard existing owned items.
  On incompatible saved gear, explain the conflict and allow explicit
  resolution. Never auto-replace a historical proxy with game inventory.
- Quick Play and Sandbox must never see policy restrictions; no global
  wardrobe or weapon catalog filtering.

## Tests and acceptance
1. Policy covers only four authored reference IDs and actual equipment IDs.
2. Valid Dispatch context yields deterministic availability + reason + source.
3. Unknown, unsupported or stale IDs do not unlock implicit content.
4. Patrol, SWAT 1995, SWAT 2015 and OMON have distinct contextual outcomes.
5. Current AR patrol preview does not become evidence of standard patrol rifle
   issue or functioning pistol inventory.
6. Quick Play, Sandbox and legacy campaign selections still resolve against
   unrestricted authoritative catalogs.
7. Existing inventory and saved operator gear stay byte-for-byte unchanged
   by policy reads and preview projection.
8. No changes to ballistics, reloading, catalogs, shared rendering, tactical
   simulation or campaign save schema in policy-only stages.
9. Focused campaign/wardrobe/weapon regression, build and release preflight
   pass before any explicit mode activation or production merge.

## Rolling stages / checkpoints
- **D2.1** pure policy contract, default unknown state and initial tests.
- **D2.2** curated small coverage for four existing reference looks.
- **D2.3** pure, read-only filtered selection and optionally explicit preview.
- **D2.4** compatibility/activation gate, only if campaign slot/creation
  prerequisites are actually present. Otherwise defer playable activation
  without representing it as delivered.

Work on a dedicated D2 feature branch; commit individual stages, use critical
tests, group compatible work for a release checkpoint and do not pile changes
onto `main` while a Pages release is pending.

## Rolling implementation record: D2.1–D2.4 (policy-only)

The initial content-policy pass now has three pure production modules:

- `dispatch-content-policy.ts` — explicit mode, reference, period and catalog-ID
  validation; fail-closed `unclassified` for unresearched Dispatch items;
  `not-applicable` outside Dispatch (existing catalog validity still applies).
  The policy's status and selectable flag are separate: `specialist` can
  only be newly selected with explicit `specialistAuthorized` context.
- `dispatch-starter-choices.ts` — a deliberately small set of existing game
  options, keyed to the four D1 authored references. It is a **curatorial
  preview** for fiction/gameplay, not a historically certified unit issue list.
  It allows the original authored visual weapon in each look and records
  optional specialist equipment explicitly. An unlisted item remains
  `unclassified`, not an inferred universal prohibition.
- `dispatch-selection-projection.ts` — display-only option projection and
  pure pre-write gate helper. It checks the existing equipment slot where
  specified, deduplicates options, and preserves an incompatible current
  selection in the preview without making it selectable as a new choice.
  The caller still owns real inventory, ownership, budget and persistence
  validation; **no runtime equipment UI currently calls this gate**.

D2.4 adds a critical integration regression that checks every authored choice
against the actual equipment/weapon/wardrobe/marking/palette catalogs, detects
duplicated availability tiers, preserves the original reference weapon and
markings, verifies legacy Quick Play/Sandbox unrestricted policy, and ensures
the Dispatch creator remains marked as planned.

**Activation deferred intentionally:** Campaign Foundation v0.2 exposes
Sandbox Campaign creation; Dispatch is still a defined future template, not a
playable campaign with its own safe slot and selection/persistence boundary.
Therefore D2.4 cannot truthfully claim end-to-end enforcement. The next
independently scoped milestone must implement explicit campaign selection,
safe storage ownership, real item-pick commit guards and retention/conflict
resolution before enabling playable Dispatch. D2 does *not* change campaign
save rules, the simulator or the visible equipment browser.

## Release integration checklist

- Focused tests: `tests/dispatch-d2-policy.test.mjs`,
  `tests/dispatch-d2-selection.test.mjs`,
  `tests/dispatch-d2-integration.test.mjs`, plus D1 tests.
- Production typecheck/build, existing campaign/Quick Play and operator
  equipment regression in affected-domain CI.
- Merge at one checkpoint only when the previous Pages release succeeded,
  no Pages publish is queued/running, the site serves the expected main
  SHA stamp, and this stacked branch has been integrated against latest main.
  If preflight cannot be verified, keep the PR open; do not assume success.
