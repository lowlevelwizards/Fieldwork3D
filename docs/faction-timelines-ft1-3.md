# FT1.3 — evidence-aware, deterministic historical loadout proposals

## Intent and authoritative boundaries

FT1.0–FT1.2 authored appearance lineages and historical item observations,
**not** complete and verified issued kits. FT1.3 is a sparse loadout proposal
system for these observations. Separate three truths: historical identity,
existing model approximation, and valid gameplay equipment. No authored
combination is labeled a documented complete issue ensemble without whole-kit
source evidence.

- **FT1.3A:** `faction-reference-equipment-eligibility.ts` filters by exact
  evidenced year, matching explicit theater/role/environment, tentative opt-in,
  and planned/trial/experimental exclusion. It does not interpolate gaps.
- **FT1.3B:** `faction-reference-game-mapping.ts` checks models against live
  wearable style IDs, printed fabrics, real equipment slots and authored gun
  presets. A G36/FAMAS/AUG/SA80 represented by an AR is always a **proxy**.
  Proxy rifles are not playable historical weapon suggestions.
- **FT1.3C:** `faction-reference-loadout-generator.ts` is pure; it returns a
  versioned proposal with seed, citations, warnings, sorted alternatives,
  explicit category locks and unresolved categories. A stable seeded tie-break
  operates *only* among equally eligible authored alternatives, not artificial
  issue probabilities or historical prevalence.
- **FT1.3D:** Initial acceptance cases use the source-supported windows
  already researched in FT1.1/1.2 (2016 US transition, 2006 USMC, British
  Afghanistan 2010, Australia 2010, Germany 1997, and unsupported years).
  No years are expanded from art snapshots alone.
- **FT1.3E:** Existing Operator Studio reference timeline mode gains compact
  generator controls and a single-operator 3D preview; the browser can select
  researched alternatives, lock categories, and view source/visual status.
  **Apply compatible appearance draft** uses Studio's existing cosmetic-only
  save protocol; it does not issue weapons, gear, ammunition, or stocks.
- **FT1.3F:** `faction-reference-loadout-apply.ts` offers pure draft and
  authorized host-domain adapters for Quick Play and campaign. Real gear passes
  only through existing roster/campaign equip handlers. Applying a proposal
  requires explicit user action by a host; the Studio appearance bridge cannot
  call or serialize these methods. Campaign application rejects active
  contracts, missing ownership, unrepresentable weapons and partial changes.
  No automatic buying, stock creation, or class substitution.
- **FT1.3G:** dedicated deterministic eligibility/provenance/inventory
  regression suite, existing FT1.x reference tests, typecheck/build, Studio
  browser smoke, and post-merge Pages build-stamp verification.

## Expected limitations — do not hide them

Historical research currently covers 9 of 34 timelines, with 32 dated item
associations, often just one category or one year. Evidence-backed mode
generates **partial** kits by design. Playable-composite mode retains the
existing game's legitimate operator gear in unresolved categories; retention is
not verification. Currently, all proposals are individually sourced composites,
not source-confirmed whole outfits. Do not add a default uniform pattern to a
source's unmentioned helmet, rig, or pack.

Exact dates are only year-precision in current data; a boundary year may include
a mid-year introduction/wearout. Month input can be validated but cannot claim
month-specific historical certainty until date-specific records are authored.

## Release checkpoints

Commit each logical stage to feature branch, group A–G into one integration
batch after selected reference/unit tests plus PR build/mobile smoke. Do not
merge if production Pages is already queued/running; verify previous successful
Pages job served its stamped build, then verify the new build after merge.
