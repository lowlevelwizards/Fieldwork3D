# FT1.7 — Historical coverage and future-content planning

**Systems-only release. No new meshes, weapons, equipment, authored historical
facts, faction kits, campaign state, issue rules, or player-save writes.**

## Staged implementation

- **FT1.7A/B · Coverage matrix** — `faction-reference-coverage-matrix.ts`
  evaluates all 44 existing authored appearances across nine gear categories
  (396 cells). No authored gap is `unassessed`, not automatically exact.
  An unresolved gap can be exact selected, representative selected, selected
  visual proxy, known modeled but unassigned, or unverified needing review.
  `modelAbsenceConfirmed` is always false in the current evidence model
  unless separately verified in a future project; unknown gap IDs cannot prove
  a mesh does not exist. The old FT1.4 demand calculation and game mapping
  contracts are preserved.
- **FT1.7C/D · Production candidate consolidation** —
  `faction-reference-production-candidates.ts` groups existing gap IDs
  into *planning* candidates, with distinct counts of affected references,
  factions, role timelines, significant/defining needs, and proxy states.
  British Mk6/Mk7 helmets and US OTV/IOTV armor are explicit variant-family
  planning buckets. They are separate historical items and are not
  interchangeable representations or approvals for one mesh.
- **FT1.7E · Human review** — silhouette, importance, reuse and estimated
  technical effort are four nullable 0–3 review scores, deliberately null by
  default. Notes, reviewer, date and an explicit approval rationale are
  required before `approved-for-future-work` is accepted. These
  project-review decisions live in `faction-reference-production-decisions.ts`,
  initially empty. Readiness is distinct from production authorization.
- **FT1.7F · Developer workbench** —
  `reference-planning.html` is an isolated Vite page, not part of the game
  renderer or campaign. It provides search, gear-category, faction, snapshot
  era, readiness filters, and three deterministic priority lenses:
  visual need, unique reference coverage, or **reviewed** benefit/effort.
  Unreviewed complexity never receives fabricated low-cost scoring. Candidate
  detail shows real affected looks, current selected stand-ins, reasons and
  missing reviews. Studio's collapsed demand section links to the workbench.
- **FT1.7G · Export production briefs** —
  `faction-reference-production-briefs.ts` generates pure Markdown and
  JSON per candidate and a sanitized CSV backlog; the workbench offers
  download actions. Briefs include explicit art acceptance tasks but never
  automatically create new geometry, equipment, GitHub tickets or sources.
- **FT1.7H · Validation** — catalog invariants, 396-cell matrix, no invented
  model-absence claims, unique kit credit per candidate, distinct grouped
  variants, review approval gates, stable multi-lens prioritization, CSV
  formula neutralization, and workbench Vite build.

## Score semantics

The *known demand* score uses documented counts of existing authored gaps.
It does not imply historical issuance prevalence, physical silhouette
distance, asset effort, gameplay power, or future production approval.
The effort-based ranking prefers reviewed assessments. An unreviewed
candidate stays unreviewed.

Coverage scope reflects existing authored gaps, not a complete inventory
of every historically relevant real-world equipment item. Unlisted gear
categories stay unassessed; additional historical associations require
independent sourcing in a separate content/research milestone.

## Acceptance and releases

Retain 34 faction role timelines, 44 reference looks, 35 historical
equipment identities, and 32 researched associations. Preserve legitimate
visual proxies and FT1.3/FT1.6 generator behavior. No changes to inventories,
campaign saves, model geometry, or per-frame renderer.

Commit finished stages to a feature branch, run only affected-domain regression,
production TypeScript/build, and critical Studio mobile smoke. Merge as one
logical FT1.7 checkpoint only if prior Pages deployment succeeded and serves
its expected stamp, with no queued/in-progress deployment. Confirm the new
public Pages stamp before calling the workbench live.

## Future content work excluded

Any actual weapon/helmet/armor/rig geometry, historical research expansion,
new equipment mechanics, or approved production tasks are **not** FT1.7.
Later asset work may begin one specifically reviewed candidate at a time.
