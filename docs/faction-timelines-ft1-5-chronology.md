# FT1.5 — faction-first gear categories and change-point snapshots

## Objective

Turn 44 flat authored references into a navigable hierarchy:

```
Faction / organization
  ├─ role / branch timeline (existing organization membership)
  │   ├─ year — authored appearance (whole visual configuration)
  │   │   └─ individual changes by uniform / headgear / armor / carriage /
  │   │      pack / weapon / accessories / markings
  │   └─ year — research boundary (individual claim; NOT assumed kit swap)
  └─ other branch timelines (not merged into first branch)
```

## Important truth boundaries

- A **visual snapshot year** indexes an existing authored appearance, NOT an
  asserted service-wide issue or replacement date.
- Compare a snapshot only to its immediately preceding snapshot **of the same
  role timeline AND environment**. Woodland and desert are peer contexts, not
  chronological replacements for one another.
- A historical research start/end year is a documented *research window*, NOT
  the first/last service year or a proven switch of all soldiers' equipment.
  Research markers must display linked IDs and confidence/issue qualifiers;
  planned items are never promoted to field issue.
- A snapshot does not inherit all earlier snapshot items: it is a distinct
  resolved visual recipe. Future authored incremental change events would
  require specifically grounded dates and item-level evidence.
- When a role has no historical gear research, keep its authored appearance
  snapshots and explicitly report that source coverage is missing.
- Preserve organizational identity: Army reconnaissance and infantry share
  the Army umbrella but retain separate branches. East German NVA, Bundeswehr,
  special operations, and generic police are not merged solely by nationality.
- Do not generate new content in this milestone: existing reference catalog,
  historical identity, evidence association, weapon geometry, gear definitions,
  save formats, inventory, and campaign rules remain untouched.

## Implementation

**FT1.5A** adds `src/faction-reference-gear-chronology.ts`:

- `consolidatedFactions()`: organization registry collapsed to one entry per
  existing ID, with nested role timelines; deterministic alphabetical order.
- `referenceGearSettings(id)`: the existing resolved look across all real
  loadout slots and visible wardrobe styles, camouflage by independent textile
  channel, helmet details, weapon family preset, variant fidelity and markings.
- `compareReferenceGear(previous,current)`: every individual changed
  setting, paired previous/current values, without manufacturing history.
- `timelineGearMilestones(id)`: sorted union of authored visual-index years
  and source record boundary years. Each marker says where its date came from.

**FT1.5B** updates the existing Studio browser to default to faction-first
navigation, with role selector constrained to the selected organization.
The **All reference looks** flat browser remains available. A folded chronology
shows gear-change categories, each changed setting, first full snapshot, and
research events as separate evidence; click a visual entry to preview the
already authored look in the existing single rig.

**FT1.5C** includes tests asserting exact original 34 timelines/44 visual
snapshots/35 equipment identities/32 research associations, memberships,
deterministic category diffs, same-environment comparisons and distinction
between evidence and visual transitions.

## Release process

Stage commits stay on a feature branch until critical tests and TypeScript/build
plus mobile Studio smoke pass. Group the staged work into one release checkpoint,
only after confirming prior Pages success and public build match and ensuring
no pending production job. Verify the merged Pages SHA and served build stamp.

## Follow-on opportunities, excluded

- Actually researching dated gear-change events for every period/variant.
- Turning documented issue adoption into automatic loadout restrictions.
- New helmet, rifle, webbing meshes or clothing assets.
- New research records or invented universal issue windows.

The data hierarchy is ready for those future expansions without claiming they
are already historically established.
