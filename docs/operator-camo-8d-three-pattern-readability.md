# Camouflage 8D — clustered prints and restrained M98 textile repeat

## Scope
This release follows 8C. Improve **only** JGSDF Type II, South African Soldier 2000, and Norwegian M98; keep the approved Greek Lizard, Urban Kamysh, Russian Izlom, SS-Leto, PenCott MetroPolis, Kryptek Typhon and all other artwork unchanged.

Registry stays **54 IDs**; the exact 64×64 indexed master, palette bytes, nearest-neighbor sampling, seeded cutting phase, save/load IDs, garment eligibility, and common fabric/headgear/gear path remain authoritative. No network assets or per-frame generation.

## 8D stage implementation
- **8D-A · JGSDF Type II:** retain 22 individually authored parent positions, reduce oversized isolated parent radius, attach four overlapping differently sized flecks and two tiny offshoots per family. A low-density finishing pass reconnects shared-color members and adds only in-cluster dark punctuation. No scatterfield of standalone dots.
- **8D-B · South African Soldier 2000:** retain the 8C polygon ground/island composition and add sparse deterministic hooked edge extensions. Expansion is limited by the **38% Kalahari-brown minimum** and a maximum of 56 pixels on the 4096-pixel master. Existing island-bound contrasting dots remain; occasional paired 1px contrast accents sit wholly inside green. This is visibly earth-ground with green islands, not JGSDF clusters.
- **8D-C · Norwegian M98:** do **not** redraw the approved three-ink large rounded lobe master. Tune only garment repeat from **2.4 to 2.55**. 2.7 is a higher-density comparison, not the selected default.

## Scale comparison, same master and cutting phase
| M98 cloth density | 64px atlas world period | Decision |
|---|---:|---|
| 2.40 (8C) | 26.67 model units | Old baseline, too much near-solid garment panel |
| **2.55 (8D)** | **25.10 model units** | Selected conservative increase, no shape change |
| 2.70 (candidate) | 23.70 model units | Hold pending actual side/back/on-field visual review to avoid shrinking iconic lobes too much |

Headwear print densities and index tiles remain unchanged. All sewn panels, rig, and pack channels continue using their existing shared material/UV behavior.

## Focused acceptance gate
1. Exact 54 camouflage IDs and preserved saved-look identity.
2. Deterministic 64px masters, 5 fixed cutting seeds (0, 5, 17, 73, 401), original opacity/ink roles, nearest sampling and cross-channel metric texture repeat.
3. JGSDF's multi-scale cluster edge detail and green field remain distinct from brown-ground Soldier 2000.
4. Soldier 2000 remains **over 38% earth ground**, with green extensions bounded and internal cool pale/dark dots preserved. It must read as richer than M98, less granular than JGSDF.
5. M98 retains exactly three inks and varied 32px panel crops. World repeat changes without touching its pixels.
6. PenCott MetroPolis == GreenZone index geometry and Typhon == Highlander index geometry, with 7C SS-Leto and all approved 8C patterns unchanged.

Visual acceptance still requires a same-seed **swatch + operator front/side/back + tactical zoom** review before any follow-up art pass; automated structural tests are not a substitute for rendered appraisal.

## Release discipline
Commit A, B, C independently on feature branch, then commit focused QA and this build note. The CI branch gate runs 8D + existing 8C/8B/8A/7C identity and R9 density tests followed by TypeScript and production Vite build. Merge only when green, main's latest Pages deployment is successful and publicly serves its build SHA, and no competing production run is active. If main advanced, reconcile and rerun checks; never queue overlapping releases.
