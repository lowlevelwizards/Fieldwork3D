# FT1.2 — Research coverage expansion / transparent historical claims

## Purpose

Expand the evidence-bound equipment reference system established in FT1.1 without
expanding gameplay issue rules or making undocumented years look complete.
FT1.2 adds **five** researched timelines, bringing the total from four to nine
out of the existing 34. All 44 FT1.0 appearance references retain their stable
IDs, date windows, and art/weapon preview semantics.

The new content resides in
`src/faction-reference-equipment-ft1-2.ts`, referenced by the existing historical
identity, evidence and association catalogs. Its type-only imports avoid runtime
cycles and keep the authored research separately reviewable.

## Research additions

| Timeline | Evidence examples | Temporal limit |
| --- | --- | --- |
| Bundeswehr field | 1991 Flecktarn introduction; 1997 G36; 2026 arid three-color uniform description | No fabricated 2010 Tropentarn adoption claim |
| Canadian field | 2020 CADPAT TW use; 2022 C7A2 equipment listing; 2024 MT phase-in plan | Planned MT rollout is not confirmed universal issue |
| Finnish field | 2016 M05 textile license reference; 2025 government RK62 continuation | 2016 supplier evidence is **tentative**, not proof of 2015 unit issue |
| Australian field | 2001 DPCU field specimen; 2004 RBH 303AU introduction; 2006 DPCU specimen; 2009–2016 F88A2, 2016 EF88 | The F88A2/EF88 overlap is intentional; no retroactive F88A2 assertion for 2004 |
| French field | Official 2022 CE uniform and FAMAS information; 2024 BME distribution **plan** | Plans are not upgraded to confirmed delivery or retirement |

Every record stores its citation IDs, confidence, explicit issue status, and
limited supported year window. A museum object or supplier statement gets a
tentative record when it does not prove real unit-by-unit issue. Historical
weapon identities are separate from the in-game render: an M16 mesh is **not**
a G36, FAMAS or AUG.

## Interface and coverage

Operator Studio's existing reference timeline panel now displays the number
of authored research records, distinct source citations and historical gear
identities. Clickable year milestones jump only to boundaries of documented
records; no continuous service life or retirement is inferred by the browser.
The same 3D operator renderer, legacy reference picker and 'Use Compatible Look'
safety contract remain unchanged.

The pure `researchTimelineCoverage` and `researchMilestoneYears` selectors
do not mutate any gameplay or save state. Research records can exist in years
with no authored visual reference.

## Release and tests

Run focused reference tests:
```sh
node --experimental-strip-types --test \
 tests/faction-reference.test.mjs \
 tests/faction-reference-timelines.test.mjs \
 tests/faction-reference-equipment-ft1-1.test.mjs \
 tests/faction-reference-equipment-ft1-2.test.mjs
npm run build
```

Use the existing PR CI selector and mobile Studio smoke. Commit each stage
separately on the feature branch. Group the finished FT1.2 stages into one
merge checkpoint. Do not merge while a previous Pages deployment is active,
and ensure the previous public build stamp matches its successful run before
issuing the next production release. Afterward confirm the new deployed stamp.

## Deferred

Further faction research beyond nine lineages, actual 3D proxies, historical
kit generation, weighted equipment prevalence, campaign/economy progression,
AI doctrine, and changes to live operator loadouts are *not* FT1.2.
