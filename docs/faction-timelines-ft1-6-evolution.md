# FT1.6 — Individual equipment evolution and dated snapshot resolution

## Locked scope

Systems only. **No** new 3D meshes, weapon families, equipment/wardrobe items,
historical equipment identities, source claims, factual dates, faction references,
campaign rules, inventory writes, or save schema. The existing 34 role timelines,
44 authored appearances, 35 research identities and 32 dated associations
remain authoritative and unchanged.

FT1.5 provided faction -> role -> dated look grouping. FT1.6 exposes the
individual fields that change, without claiming a whole outfit swaps at once.
Historical research remains independent of authored appearance.

## Staged implementation

**A — Detailed category model.** Extend the existing category breakdown with
independent footwear, modern/period helmet setup, face accessories, waist load,
harness and pouch colors, operator field dress, uniform cuffs, magazine-order
details and glove materials. Resolve the existing reference looks with their
existing game assets; never copy individual appearance identity (skin/hair) into
reference equipment history.

**B — Individual evolution events.** `faction-reference-equipment-evolution.ts`
derives one visual-baseline event per appearance field for each
first/parallel environment-specific snapshot, and one visual-change event per
changed setting for subsequent same-environment looks. Historical observation
events use only the existing claim's actual start/end research-window boundaries.
**No boundary implies first issue, retirement, replacement, prevalence or
continuous service.** Research records have source IDs, confidence and issue
status; visual events never gain fabricated citations.

**C — Date/context resolver.**
`faction-reference-dated-gear-snapshot.ts` is a read-only,
per-category evaluation for a selected faction/role, year and environment. An
exact representative appearance year is labeled `exact-visual-index` (not
historically exact), another year within the authored period is
`period-visual-proxy`. Multiple competing environments yield
`ambiguous-environment` unless the user selects a valid context/look.
Out-of-range looks remain missing, never inherited. Historical items resolve
exclusively from existing eligibility rules, including explicit role/theater
constraints and trial/tentative opt-ins. Absent research is always unknown.
The result never claims that individually researched items were co-issued as a
complete ensemble.

**D — Preserve all 44 authored looks.** Reuse all FT1.5 reference recipes and
IDs without duplicating them, generating synthetic historical variants,
converting an approximation to exact equipment, or changing Quick Play /
campaign saves.

**E — Operator Studio.** The existing faction-first timeline gets a compact
per-category event summary, a read-only year assessment, complete category
inspection even where a look has a change diff, and a two-look selector.
A visual comparison is blocked for different roles, missing references or
different environments. The existing single 3D Studio rig stays intact;
visual preview is never an inventory/equipment grant.

**F — Future content need linking.** The selected dated look links to
FT1.4's *existing* prioritized asset queue. No automatic art generation, new
tickets, or new historical asset associations. Proxy distinctiveness remains
heuristic and explicitly needs human silhouette review.

**G — Release gates.** FT1.6 focused deterministic tests (whole-catalog
coverage, complete resolved item fields, event provenance, per-year unknown
states, environment guards, immutable apps), affected-domain regressions,
TypeScript+production build, and Studio mobile smoke. Commit each stage on the
feature branch; merge one compatible release batch only after the preceding
Pages deployment is complete and its exact served build has been verified.
Confirm the subsequent public GitHub Pages SHA matches the merge.

## Design invariants

- A snapshot is a COMPLETE independently authored visual look, *not* a
  universally issued set, and not an inherited accumulation from prior years.
- A gear change is shown as an exact per-field visual difference. A confirmed
  historical introduction/retirement would need separate primary evidence,
  which FT1.6 does not add.
- A first or parallel-environment visual look is a full baseline. Desert,
  woodland and other settings are not forced into a predecessor/successor chain.
- Different faction/role timelines do not share inferred transitions merely
  because they belong to the same national organization.
- No model availability affects whether historical research is eligible.
- The demand queue counts *existing authored reference gaps*, not issue
  prevalence or historical collection completeness.
