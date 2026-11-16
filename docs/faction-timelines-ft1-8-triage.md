# FT1.8 — verified asset triage and first-production review

## Scope and actual evidence

FT1.8 builds directly on FT1.7's **44 visual references, 34 role timelines,
35 historical equipment identities, 32 dated research associations and 396
category cells**. It adds **no** authored historical claims, campaign equipment,
weapon ballistics, inventories, new geometry, per-frame renderer work, or saves.

### FT1.8A — bounded shortlist
`faction-reference-ft1-8-triage.ts` selects ten candidate IDs from the existing
gap-derived production queue. These are *editorial priorities*, not approval.
Unknown gap IDs are reported and omitted rather than converted into work.

### FT1.8B — game catalog inspection
`faction-reference-ft1-8-asset-checks.ts` verifies two concrete existing presets:
- `fnc-service` is modeled in the weapon family catalog and the Belgian
  Jigsaw reference previously used `ar-m16a2` as an unrelated proxy.
- `hk-g3a3` is modeled and already used by the Norwegian M98 reference;
  this is **not** proof of an exact AG3 national configuration.

All other shortlisted candidates require asset/visual inspection; unresolved
gaps do **not** establish that a mesh is absent. Known unassigned options are
reported separately from new-asset candidates.

### FT1.8C — verified correction
The existing Belgian reference preview now selects `fnc-service` with
`representative` fidelity. Its `fnc-family` gap is **approximate**, not exact.
This corrects a genuine proxy assignment without changing any issued inventory,
weapon stat, dates, or player saves. A human visual pass is still required
before upgrading historical/visual exactness.

### FT1.8D — review and acceptance gates
`faction-reference-ft1-8-review-board.ts` exposes source-controlled decision
status, model checks and required front/side/three-quarter/close-up visual
reviews. No synthetic review scores, photos or evidence are created.
Approvals remain blocked by the original FT1.7 requirements: four reviewed
0–3 scores, date, reviewer, notes and explicit approval rationale.

### FT1.8E — first-asset production draft
`faction-reference-ft1-8-first-asset.ts` proposes **G36-family silhouette**
as the first production candidate because of the existing Bundeswehr woodland
and desert references still showing unrelated AR proxies. It provides bounded
model/material/assembly/pose acceptance, dependencies and exclusions.
**Status is PROPOSED, NOT APPROVED.** Do not begin FT1.9 geometry until period
sources, variant-specific silhouette review, integration effort assessment,
and human authorization are recorded. Mk6/Mk7 and OTV/IOTV are *distinct*
variants and remain separately reviewed.

### FT1.8F — developer planning workbench
The existing `reference-planning.html` now shows the FT1.8 review queue,
known catalog models, remaining evidence, and first-asset approval status.
It exports review CSV/JSON and a bounded production-specification Markdown
draft. There are no runtime equipment or save writes.

### FT1.8G — validation and release
Critical tests: `tests/faction-reference-ft1-8.test.mjs`, FT1.7 planning
regressions, existing reference and weapon issue tests; TypeScript and Vite
production build; desktop/mobile Studio smoke where runner is available.
Stage commits are retained on a feature branch, with one draft PR as a
logical checkpoint. Do not merge while the previous Pages build is unverified,
a production workflow is queued/running, or the focused CI gate fails. Verify
the exact served Pages build stamp after merging.

## Explicitly deferred
- New meshes or additional weapons, armor, helmets, uniforms and issued kits.
- Fabricated model-absence claims, exact fidelity or historical dates.
- Reviewer scores, signoff, visual screenshots or art-cost estimates not
  independently measured.
- FT1.9 modeling work until a selected candidate is actually approved.
