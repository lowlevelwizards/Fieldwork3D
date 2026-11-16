# FT1.0 — Faction timeline foundation

Implementation branch: `feature/ft1-0-faction-timelines`.

## Intent

Connect existing dated **appearance references** to stable organizational lineages.
No inventory ownership, historical issue enforcement, combat effects, playable
faction doctrine, save-format migration, campaign equipment progression or new
3D assets are introduced. The old Reference Kits list and Apply Compatible Look
remain available, unchanged in meaning.

## Authorities

- `src/faction-reference-catalog.ts`: original 44 appearance references, their
  authored date ranges, environments and source notes (IDs unchanged).
- `src/faction-reference-gear-profiles.ts`: dated visual recipes.
- `src/faction-reference-weapons.ts`: curated preview weapons and proxy fidelity.
- `src/faction-reference-timelines.ts`: stable organizations, related reference
  snapshots and **empty** future evidence/equipment associations.
- `src/faction-reference-timeline-resolver.ts`: pure year lookup and audit.
- `src/faction-reference-browser.ts`: existing Studio browser with timeline mode.

## Selection contract

Representative snapshot year is an index, not the start of an actual
issue period. A timeline year matches only when an existing authored reference
already includes it in `era.start..era.end`. Environment filters are strict.
Multiple overlapping context-specific references remain separate choices.
Year gaps return no match; nearest snapshots may be displayed as navigation
hints but **must never be applied automatically**. The user must deliberately
choose a supported kit. There is no silent fallback to the nearest year.

The browser defaults to the legacy kits view. Timeline mode adds a timeline
selector, year input, and optional environment filter, and reuses the existing
single Studio 3D preview and historical-fidelity labels. If there is no match,
the former preview is explicitly described as stale for that year and the
Apply Compatible Look action is disabled.

A country is not sufficient to identify a lineage. Historical organizations
that dissolved, reformed, or share geographic territory are not merged by
default. Generic US SWAT/patrol references explicitly describe archetypes,
not equipment policies of any named police department.

## Research integrity

Historical appearance, modeled visual fidelity and issued equipment
availability are different facts. A proxy 3D weapon is not a verified
historical weapon. Existing descriptive source notes stay descriptive; they
are **not upgraded to verified research**. Empty `evidence` and `equipment`
arrays are intentional until primary or clearly documented secondary sources
support entries. Later availability data must include year interval, role,
confidence and evidence IDs.

## Integration boundaries and release checks

- No changes to `equipment-catalog`, `equipment-loadouts`, campaign saves,
  gameplay faction IDs or combat simulation.
- No second viewer, persistent timer, animation loop or per-frame year query.
- Preserve existing reference IDs and existing compatibility warnings.
- Targeted validation: `node --experimental-strip-types --test
  tests/faction-reference-timelines.test.mjs tests/faction-reference.test.mjs`.
- Production gate: `npm run build` plus existing PR checks.
- Only merge/deploy after confirming no prior Pages release is queued/running
  and the previous build is actually served; do not queue deploys blindly.

## Next stage (not FT1.0)

FT1.1 can attach researched equipment-specific availability, sourced identity
changes, more snapshots and per-organization historical coverage reports.
FT1.0 does not imply complete historical equipment coverage for any year.
