# Arsenal A3 — release review
Date: 2026-11-16. Features merged in PR #1570, merge SHA `4d2c7e09f04a125570390ce398638715dc2fccc1`.

## Implemented
- Shared, per-owner low-poly attachment primitives, retaining safe geometry cleanup.
- Open-frame reflex optic; faceted magnified optic, suppressor, flash hider and brake.
- Sculpted handstop and vertical grip; **removed duplicate MP5 tri-rail vertical grip**.
- Faceted four-part weapon light with unchanged controlled `weapon-light-lens`.
- HK claw rail unified from eight separate boxes into **one** draw submission.
- Two-point sling mounts consolidated and reseated; optic placed correctly onto HK claw.
- All source equipment IDs, compatibility, sockets, gameplay light, saves, and A2 shared finishes preserved.

## Verified performance
Actual nine-platform accepted-loadout census: **118 A2 accessory draw submissions → 84 A3**, 34 fewer (28.8% reduction). These are submissions, not FPS. Per-owner geometry remains safely disposable; no new per-frame construction.

| Preset | A2 submissions | A3 submissions |
| --- | ---: | ---: |
| M4A1 | 15 | 14 |
| AK-74M | 12 | 11 |
| G3A3 | 18 | 10 |
| HK33A2 | 16 | 9 |
| HK53A3 | 16 | 9 |
| MP5A3 | 21 | 12 |
| MP5SD3 | 6 | 5 |
| FAL 50.00 | 7 | 7 |
| FNC | 7 | 7 |

## QA evidence
- A3 dedicated CI: all focused accessory tests, TypeScript, production Vite build, nine-platform cost inventory and Chromium real WebGL contact sheet passed. Run 43958396348.
- PR #1570: Ground Zero and D3 mainline merge checkpoints passed, with physical holdout checks running independently.
- Asset `arsenal-a3-equipped-visual-review` contains 36 side/three-quarter/top/grayscale panels for nine **accepted** equipment configurations plus JSON cost inventory.
- Geometry changes are visual only and do not modify the ballistics or weapon assembly resolver.

## Release discipline
This document is a release record associated with the completed A3 checkpoint,
not a new content stage. Production is confirmed only when Pages' verify-public-build
step succeeds for the checked-out main SHA.
