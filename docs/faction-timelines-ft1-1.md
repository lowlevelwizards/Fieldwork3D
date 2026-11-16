# FT1.1 — Sourced historical equipment reference, research coverage, Studio browser

**Scope:** Historical evidence and visual representation only. No gameplay issue rules,
campaign saves, owned items, combat characteristics, AI doctrine or new geometry.

## Historical semantics

- `faction-reference-historical-equipment.ts` defines distinct real-world equipment
  identities. Optional visual model mappings are **not** equipment issue records.
- `faction-reference-equipment-data.ts` holds explicit timeline, source, role,
  environment and time-window associations. An interval is an **evidence-covered
  window**, not a complete service lifetime. The year granularity means the 2019
  UCP wear-out date applies to only part of that calendar year.
- `faction-reference-evidence.ts` contains clickable claim-specific primary/museum
  sources, not a generalized guarantee that an entire uniform snapshot is verified.
- `faction-reference-equipment-resolver.ts` queries these associations without
  interpolating absent years. Two-year comparisons describe only which claims
  appear in the dataset, **never** introduction, retirement, absence or rarity.
- `faction-reference-timelines.ts` retains the same organizations, 34 timelines
  and 44 appearance reference memberships as FT1.0.

## Initial researched content

Four intentionally bounded timelines: US Army conventional infantry, US Marine
Corps field infantry, British Army field infantry, historical East German NVA.
Research entries prioritize independently supported claims. Examples:

- US Army: M16A2 Desert Storm maintenance in 1991, initial PASGT/ACH fielding
  dates, Iraq Interceptor variation in 2003, and overlapping UCP/OCP policy
  2015–2019, plus 2010 Afghanistan OEF-CP treated distinctly from Scorpion W2.
- USMC: 2002–2006 MARPAT transition, documented LWH, and **planned** 2006
  MTV development kept distinct from confirmed issue.
- British Army: 2010 deployed MTP and Osprey, and 2011 SA80-family evidence;
  2010 research can exist even when FT1.0 has no 2010 visual snapshot.
- NVA: DDR Museum 1981 Strichtarn specimen and M56 collection piece;
  1980 M56 connection stays explicitly **tentative**, not verified.

Equipment outside these windows remains **not researched**, not absent.
Generic US police archetypes still cannot be treated as one real agency.

## Studio

Only the existing Reference browser gains a compact research section in timeline
mode. It groups equipment by category, gives each claim a collapsible source and
visual mapping note, and compares research coverage for two selected years.
The single existing operator renderer and all old preview/apply actions persist.
The historical research section can appear even where there is no valid 3D
appearance reference; the existing `Use Compatible Look` button still prohibits
applying an unsupported snapshot.

## Regression and release policy

Run `node --experimental-strip-types --test
tests/faction-reference-equipment-ft1-1.test.mjs
tests/faction-reference-timelines.test.mjs
tests/faction-reference.test.mjs` and the PR's existing Studio gates and
production typecheck/build. No full historical tests unless a domain regression
demands it. Commit the staged batch on the feature branch; do not merge over a
queued/running Pages deployment. Before a merge, confirm the preceding Pages
job succeeded and verified the public stamped build. After the merge, verify
the new Pages run and public stamp.

## Defer

Do not extrapolate researched item prevalence into probability weights;
do not automatically generate or enforce historical loadouts; do not expand
every timeline; do not create new weapon or armor models. FT1.2 is richer
research coverage, FT1.3 potential constrained loadout generation.
