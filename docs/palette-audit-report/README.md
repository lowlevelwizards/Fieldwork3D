# Fieldwork 3D / Breach — source color census
Generated from the checked-out repository HEAD by `node scripts/audit-game-colors.mjs`. No game colors were modified.

## Scope and limitations
- Includes active `src/` TypeScript, CSS, JS, shaders, and top-level HTML; excludes docs, tests, scripts, dependency bundles, and compiled output.
- Counts literal hex colors (`0xRRGGBB`, `#RGB`, `#RRGGBB`, alpha variants), literal integer `rgb/rgba()` calls, and `[R,G,B]` triplets explicitly defined in camouflage `colors` recipe arrays.
- A *source occurrence* is an authored literal, **not** pixel coverage, run-time screen area, or actual frequency of an item spawning. Multiple alpha values share the same RGB row, but are separately recorded in uses CSV.
- Generated color mixes, lighting, wear, camouflage sampling, gradients, HSL and runtime variants cannot be exhaustively enumerated statically. These require a subsequent runtime render/screenshot palette pass.
- The number of nearest neighbors is a discovery aid, **not** license to merge semantic roles indiscriminately. Color contrast, material readability, palette coverage, and context must be verified.

## Totals
- Source files inspected: **528**
- Literal color occurrences: **2617**
- Distinct normalized RGB values: **2297**
- Single-use RGB colors: **2109**
- Colors appearing in only one file: **2222**
- Near-neighbor non-protected same-domain colors flagged for human review (OKLab < 0.022): **948**

| System | Source color mentions | Unique RGB values |
|---|---:|---:|
| UI / HUD | 1068 | 910 |
| Combat / mission | 389 | 354 |
| Architecture / props | 333 | 331 |
| Landscape / other | 329 | 302 |
| Camouflage inks | 258 | 220 |
| Operator / equipment | 222 | 195 |
| Skin / hair | 18 | 18 |

## Consolidation queue (human review; never automatic)
Two colors should merge only if they play **the same material or semantic role** and after representative visual checks. Values below are OKLab Euclidean distance; roughly <0.01 is very close, 0.01–0.022 is a possible near-match.

| Value | Uses | Nearest | ΔOKLab | Scopes | Where |
|---|---:|---|---:|---|---|
| #223b32 | 1 | #213b32 | 0.0012 | UI / HUD | operator-lab.html:28 |
| #213b32 | 1 | #223b32 | 0.0012 | UI / HUD | src/ui/ux-r1-sheets.css:47 |
| #182e2a | 1 | #192e2a | 0.0012 | UI / HUD | operator-lab.html:150 |
| #192e2a | 1 | #182e2a | 0.0012 | UI / HUD | physicality-lab.html:18 |
| #294239 | 3 | #284239 | 0.0013 | UI / HUD | src/breach-style.css:720 |
| #284239 | 1 | #294239 | 0.0013 | UI / HUD | src/ui/ux-r1-sheets.css:137 |
| #688779 | 1 | #678779 | 0.0013 | UI / HUD | src/breach-style.css:611 |
| #678779 | 1 | #688779 | 0.0013 | UI / HUD | src/ui/ux-r1-sheets.css:136 |
| #688879 | 1 | #698879 | 0.0013 | UI / HUD | physicality-lab.html:7 |
| #698879 | 1 | #688879 | 0.0013 | UI / HUD | src/ui/ux-r1-sheets.css:121 |
| #b8cfbf | 1 | #b9cfbf | 0.0013 | UI / HUD | operator-armor-rig-lab.html:18 |
| #b9cfbf | 1 | #b8cfbf | 0.0013 | UI / HUD | src/style.css:240 |
| #354e42 | 1 | #344e42 | 0.0013 | UI / HUD | src/operator-headwear-picker.css:16 |
| #344e42 | 1 | #354e42 | 0.0013 | UI / HUD | src/ui/ux-r1-sheets.css:121 |
| #1b302b | 1 | #1c302b | 0.0013 | UI / HUD | map-lab.html:4 |
| #1c302b | 1 | #1b302b | 0.0013 | UI / HUD | physicality-lab.html:3 |
| #344d44 | 2 | #354d44 | 0.0013 | UI / HUD | operator-lab.html:112 |
| #354d44 | 1 | #344d44 | 0.0013 | UI / HUD | world.html:43 |
| #182c27 | 5 | #192c27 | 0.0013 | UI / HUD | operator-lab.html:119; src/breach-style.css:1131 |
| #192c27 | 2 | #182c27 | 0.0013 | UI / HUD | map-lab.html:43; operator-studio.html:5 |
| #728b7c | 1 | #718b7c | 0.0013 | UI / HUD | operator-lab.html:104 |
| #718b7c | 1 | #728b7c | 0.0013 | UI / HUD | src/breach-style.css:575 |
| #b9c9bc | 1 | #b8c9bc | 0.0013 | UI / HUD | src/style.css:140 |
| #b8c9bc | 1 | #b9c9bc | 0.0013 | UI / HUD | src/ui/ux-r1-sheets.css:82 |
| #243a34 | 1 | #253a34 | 0.0013 | UI / HUD | physicality-lab.html:7 |
| #253a34 | 1 | #243a34 | 0.0013 | UI / HUD | src/breach-style.css:826 |
| #fff1d8 | 1 | #fff1d7 | 0.0013 | UI / HUD | operator-lab.html:12 |
| #fff1d7 | 1 | #fff1d8 | 0.0013 | UI / HUD | src/breach-style.css:495 |
| #172925 | 3 | #162925 | 0.0013 | UI / HUD | src/breach-style.css:715 |
| #162925 | 2 | #172925 | 0.0013 | UI / HUD | src/breach-style.css:611 |
| #83998b | 2 | #82998b | 0.0013 | UI / HUD | src/ui/ux-r1-sheets.css:21 |
| #82998b | 1 | #83998b | 0.0013 | UI / HUD | src/breach-style.css:1116 |
| #1d302c | 1 | #1c302c | 0.0013 | UI / HUD | asset-lab.html:16 |
| #1c302c | 1 | #1d302c | 0.0013 | UI / HUD | operator-lab.html:218 |
| #84998b | 1 | #83998b | 0.0013 | UI / HUD | src/operator-headwear-picker.css:16 |
| #f2e8cf | 1 | #f2e8ce | 0.0013 | UI / HUD | src/style.css:49 |
| #f2e8ce | 1 | #f2e8cf | 0.0013 | UI / HUD | src/style.css:253 |
| #f0e6cc | 1 | #f0e6cd | 0.0013 | Landscape / other | src/rendering/pixel-signage.ts:12 |
| #f0e6cd | 1 | #f0e6cc | 0.0013 | Landscape / other | src/rendering/pixel-signage.ts:14 |
| #a8b995 | 2 | #a7b995 | 0.0013 | UI / HUD | operator-lab.html:22 |
| #a7b995 | 1 | #a8b995 | 0.0013 | UI / HUD | src/ui/fieldwork-design.css:18 |
| #e4e7d8 | 1 | #e5e7d8 | 0.0013 | UI / HUD | src/breach-style.css:1101 |
| #e5e7d8 | 1 | #e4e7d8 | 0.0013 | UI / HUD | src/study-style.css:2 |
| #f3f0dc | 1 | #f2f0dc | 0.0013 | UI / HUD | operator-lab.html:172 |
| #f2f0dc | 1 | #f3f0dc | 0.0013 | UI / HUD | src/ui/ux-r1-sheets.css:131 |
| #937b58 | 1 | #937b59 | 0.0013 | Operator / equipment | src/operator-garment-color-policy.ts:18 |
| #937b59 | 1 | #937b58 | 0.0013 | Operator / equipment | src/operator-head-accessory-catalog.ts:76 |
| #263a34 | 1 | #253a34 | 0.0013 | UI / HUD | physicality-lab.html:10 |
| #142426 | 1 | #132426 | 0.0013 | UI / HUD | src/breach-style.css:103 |
| #132426 | 1 | #142426 | 0.0013 | UI / HUD | src/breach-style.css:137 |
| #eee9d9 | 1 | #ede9d9 | 0.0013 | UI / HUD | src/breach-style.css:105 |
| #ede9d9 | 1 | #eee9d9 | 0.0013 | UI / HUD | world.html:111 |
| #fef4df | 1 | #fff4df | 0.0013 | UI / HUD | operator-lab.html:29 |
| #fff4df | 1 | #fef4df | 0.0013 | UI / HUD | src/operator-fabric-camo-picker.css:5 |
| #e5e7d7 | 1 | #e5e7d8 | 0.0013 | UI / HUD | src/operator-headwear-picker.css:2 |
| #e2e8db | 1 | #e2e8da | 0.0014 | UI / HUD | src/breach-style.css:287 |
| #e2e8da | 1 | #e2e8db | 0.0014 | UI / HUD | src/style.css:175 |
| #273a34 | 1 | #263a34 | 0.0014 | UI / HUD | src/breach-style.css:1171 |
| #172824 | 2 | #182824 | 0.0014 | UI / HUD | operator-lab.html:22 |
| #182824 | 1 | #172824 | 0.0014 | UI / HUD | physicality-lab.html:6 |
| #c5d1c2 | 1 | #c5d1c3 | 0.0014 | UI / HUD | src/breach-style.css:809 |
| #c5d1c3 | 1 | #c5d1c2 | 0.0014 | UI / HUD | src/campaign-style.css:15 |
| #182724 | 2 | #172724 | 0.0014 | UI / HUD | world.html:112 |
| #172724 | 1 | #182724 | 0.0014 | UI / HUD | src/campaign-style.css:49 |
| #e9d6b1 | 1 | #e8d6b1 | 0.0014 | Combat / mission | src/breach-main.ts:2697 |
| #e8d6b1 | 1 | #e9d6b1 | 0.0014 | Combat / mission | src/breach-main.ts:2861 |
| #1b2a24 | 1 | #1a2a24 | 0.0014 | UI / HUD | src/study-style.css:25 |
| #1a2a24 | 1 | #1b2a24 | 0.0014 | UI / HUD | src/ui/ux-r1-sheets.css:53 |
| #83998c | 1 | #83998b | 0.0015 | UI / HUD | operator-lab.html:215 |
| #6b8179 | 1 | #6b8178 | 0.0015 | Landscape / other | src/study-world.ts:351 |
| #6b8178 | 1 | #6b8179 | 0.0015 | Landscape / other | src/water-visual-model.ts:7 |
| #587364 | 1 | #587365 | 0.0015 | UI / HUD | src/operator-headwear-picker.css:5 |
| #587365 | 1 | #587364 | 0.0015 | UI / HUD | src/ui/ux-r1-sheets.css:24 |
| #514e42 | 1 | #514e43 | 0.0016 | Combat / mission | src/breach-3d.ts:2105 |
| #514e43 | 1 | #514e42 | 0.0016 | Combat / mission | src/breach-main.ts:2083 |
| #344d43 | 2 | #344d44 | 0.0017 | UI / HUD | asset-lab.html:18; operator-lab.html:172 |
| #243b32 | 1 | #243b31 | 0.0017 | UI / HUD | operator-lab.html:170 |
| #243b31 | 1 | #243b32 | 0.0017 | UI / HUD | src/operator-appearance-grid.css:11 |
| #f5e4bc | 1 | #f4e4bd | 0.0018 | UI / HUD | operator-lab.html:28 |
| #f4e4bd | 1 | #f5e4bc | 0.0018 | UI / HUD | src/breach-style.css:322 |
| #253a33 | 2 | #253a34 | 0.0018 | UI / HUD | src/operator-studio.css:23 |
| #e6e9db | 2 | #e5e9dc | 0.0018 | UI / HUD | src/operator-studio.css:1 |
| #e5e9dc | 1 | #e6e9db | 0.0018 | UI / HUD | src/style.css:35 |
| #f4eddb | 1 | #f5edda | 0.0018 | UI / HUD | asset-lab.html:11 |
| #f5edda | 1 | #f4eddb | 0.0018 | UI / HUD | src/operator-headwear-picker.css:16 |
| #07120f | 1 | #06120f | 0.0018 | UI / HUD | src/breach-style.css:612 |
| #06120f | 1 | #07120f | 0.0018 | UI / HUD | src/breach-style.css:1065 |
| #ebe7d8 | 1 | #ece7d7 | 0.0018 | UI / HUD | src/breach-style.css:352 |
| #ece7d7 | 1 | #ebe7d8 | 0.0018 | UI / HUD | world.html:126 |
| #1c302a | 1 | #1c302b | 0.0018 | UI / HUD | src/breach-style.css:1099 |
| #1b2a23 | 1 | #1b2a24 | 0.0018 | UI / HUD | physicality-lab.html:14 |
| #1c302d | 1 | #1c302c | 0.0018 | UI / HUD | map-lab.html:9 |
| #1b2a25 | 1 | #1b2a24 | 0.0018 | UI / HUD | src/operator-studio.css:17 |
| #172825 | 3 | #172824 | 0.0019 | UI / HUD | breach-visual-lab.html:15; src/breach-style.css:567 |
| #142425 | 1 | #142426 | 0.0019 | UI / HUD | src/breach-style.css:218 |
| #31483d | 1 | #30483e | 0.0020 | UI / HUD | operator-armor-rig-lab.html:12 |
| #30483e | 1 | #31483d | 0.0020 | UI / HUD | src/ui/ux-r1-sheets.css:30 |
| #2a4238 | 1 | #294239 | 0.0020 | UI / HUD | src/ui/ux-r1-sheets.css:131 |
| #f0f2e9 | 1 | #f1f2ea | 0.0020 | Architecture / props | src/worldgen/building-palettes.ts:50 |
| #f1f2ea | 1 | #f0f2e9 | 0.0020 | Architecture / props | src/worldgen/building-palettes.ts:51 |
| #e1e8d9 | 1 | #e2e8da | 0.0020 | UI / HUD | operator-armor-rig-lab.html:16 |
| #e8e9d7 | 1 | #e9e9d8 | 0.0020 | UI / HUD | operator-lab.html:215 |
| #e9e9d8 | 1 | #e8e9d7 | 0.0020 | UI / HUD | src/breach-style.css:360 |
| #eddaa5 | 3 | #eedaa6 | 0.0020 | UI / HUD | src/operator-headwear-picker.css:17; src/operator-material-browser.css:26 |
| #eedaa6 | 1 | #eddaa5 | 0.0020 | UI / HUD | src/study-style.css:55 |
| #b7ccc5 | 2 | #b6ccc4 | 0.0020 | UI / HUD | src/style.css:196 |
| #b6ccc4 | 1 | #b7ccc5 | 0.0020 | UI / HUD | world.html:36 |
| #d9dccc | 2 | #d8dccb | 0.0020 | UI / HUD | operator-lab.html:31 |
| #d8dccb | 1 | #d9dccc | 0.0020 | UI / HUD | world.html:25 |
| #c5d2c5 | 2 | #c4d2c4 | 0.0020 | UI / HUD | src/ui/ux-r1-sheets.css:98; world.html:18 |
| #c4d2c4 | 1 | #c5d2c5 | 0.0020 | UI / HUD | src/operator-headwear-picker.css:7 |
| #1b3028 | 2 | #1a3029 | 0.0020 | UI / HUD | operator-lab.html:24 |
| #1a3029 | 2 | #1b3028 | 0.0020 | UI / HUD | src/breach-style.css:145; src/operator-headwear-picker.css:2 |
| #07120e | 2 | #07120f | 0.0021 | UI / HUD | src/breach-style.css:1100 |
| #1c2d29 | 2 | #1b2d2a | 0.0021 | UI / HUD | asset-lab.html:8; src/ui/tactical-feedback.ts:116 |
| #1b2d2a | 2 | #1c2d29 | 0.0021 | UI / HUD, Operator / equipment | src/campaign-style.css:102; src/equipment-preview.ts:36 |
| #061110 | 1 | #06110f | 0.0021 | UI / HUD | src/breach-style.css:568 |
| #06110f | 1 | #061110 | 0.0021 | UI / HUD | src/breach-style.css:1069 |
| #192b29 | 3 | #1a2b28 | 0.0021 | UI / HUD | operator-lab.html:104; src/breach-style.css:554 |
| #1a2b28 | 1 | #192b29 | 0.0021 | UI / HUD | src/operator-studio.css:9 |
| #617c71 | 1 | #607c70 | 0.0021 | UI / HUD | src/breach-style.css:227 |
| #607c70 | 1 | #617c71 | 0.0021 | UI / HUD | src/ui/ux-r1-sheets.css:69 |
| #152623 | 1 | #162622 | 0.0022 | UI / HUD | breach-visual-lab.html:11 |
| #162622 | 1 | #152623 | 0.0022 | UI / HUD | src/breach-style.css:382 |
| #667f76 | 1 | #677f77 | 0.0022 | Architecture / props | src/worldgen/asset-character-visuals.ts:115 |
| #677f77 | 1 | #667f76 | 0.0022 | Architecture / props | src/worldgen/detailed-fixture-visuals.ts:155 |
| #23392f | 1 | #22392e | 0.0023 | UI / HUD | operator-lab.html:14 |
| #22392e | 1 | #23392f | 0.0023 | UI / HUD | src/operator-material-browser.css:22 |
| #0b1415 | 1 | #0a1416 | 0.0024 | UI / HUD | src/breach-style.css:23 |
| #0a1416 | 1 | #0b1415 | 0.0024 | UI / HUD | src/breach-style.css:1164 |
| #fff0d6 | 1 | #fff1d7 | 0.0024 | UI / HUD | src/breach-style.css:98 |
| #1b2d28 | 2 | #1c2d29 | 0.0025 | UI / HUD | map-lab.html:13; src/breach-style.css:1379 |
| #20302e | 2 | #1f302d | 0.0025 | UI / HUD | src/breach-style.css:111; src/campaign-style.css:26 |
| #1f302d | 1 | #20302e | 0.0025 | UI / HUD | operator-lab.html:143 |
| #d6ae75 | 1 | #d6af76 | 0.0025 | UI / HUD | map-lab.html:38 |
| #d6af76 | 1 | #d6ae75 | 0.0025 | UI / HUD | src/breach-style.css:52 |
| #f4ecda | 2 | #f4eddb | 0.0025 | UI / HUD | src/operator-appearance-grid.css:31 |
| #192a23 | 1 | #1a2a24 | 0.0025 | UI / HUD | world.html:137 |
| #eeeada | 1 | #eee9d9 | 0.0025 | UI / HUD | src/operator-studio.css:110 |
| #162721 | 1 | #172722 | 0.0025 | UI / HUD | operator-lab.html:115 |

## Rarely authored non-camouflage, non-skin colors
Every entry here deserves inspection; one-off emergency signage, muzzle flashes, lighting and technical markings may be good exceptions.

| Value | Uses | Files | Nearest | Source |
|---|---:|---:|---|---|
| #04110c | 1 | 1 | #05100d | src/breach-style.css:352 |
| #04110f | 1 | 1 | #06110f | src/campaign-style.css:176 |
| #041113 | 1 | 1 | #051013 | src/breach-style.css:130 |
| #041311 | 1 | 1 | #061310 | src/breach-style.css:1052 |
| #050a0a | 1 | 1 | #020b0b | src/breach-main.ts:528 |
| #05100d | 1 | 1 | #04110f | src/ui/ux-r1-sheets.css:3 |
| #051013 | 1 | 1 | #041113 | src/breach-style.css:17 |
| #051313 | 1 | 1 | #061314 | src/breach-style.css:908 |
| #060c0b | 1 | 1 | #050a0a | src/breach-main.ts:538 |
| #06110f | 1 | 1 | #061110 | src/breach-style.css:1069 |
| #061110 | 1 | 1 | #06110f | src/breach-style.css:568 |
| #06120f | 1 | 1 | #07120f | src/breach-style.css:1065 |
| #061215 | 1 | 1 | #061314 | src/breach-style.css:219 |
| #061314 | 1 | 1 | #051313 | src/breach-style.css:309 |
| #061413 | 1 | 1 | #071311 | src/breach-style.css:520 |
| #071008 | 1 | 1 | #090f0a | src/study-style.css:50 |
| #07120f | 1 | 1 | #06120f | src/breach-style.css:612 |
| #071311 | 1 | 1 | #061310 | src/breach-style.css:555 |
| #071416 | 1 | 1 | #0a1416 | src/breach-3d.ts:294 |
| #071819 | 1 | 1 | #0b181a | src/breach-3d.ts:297 |
| #080f13 | 1 | 1 | #051013 | src/style.css:190 |
| #081212 | 1 | 1 | #091110 | src/breach-style.css:1377 |
| #081812 | 1 | 1 | #0b1911 | src/ui/ux-r1-sheets.css:80 |
| #090f0a | 1 | 1 | #071008 | src/breach-style.css:748 |
| #091110 | 1 | 1 | #081212 | src/breach-style.css:104 |
| #091617 | 1 | 1 | #0b1515 | src/breach-style.css:139 |
| #0a1416 | 1 | 1 | #0b1415 | src/breach-style.css:1164 |
| #0b1415 | 1 | 1 | #0a1416 | src/breach-style.css:23 |
| #0b1515 | 1 | 1 | #0b1415 | src/breach-3d.ts:1592 |
| #0b181b | 1 | 1 | #0b181a | src/breach-main.ts:2172 |
| #0b1911 | 1 | 1 | #081812 | src/study-style.css:13 |
| #0b1f16 | 1 | 1 | #101d1b | src/operator-studio.css:106 |
| #0c1417 | 1 | 1 | #0a1416 | src/style.css:37 |
| #0d1b20 | 1 | 1 | #0e1c20 | src/breach-main.ts:2873 |
| #0f1b1c | 1 | 1 | #121a1c | src/breach-main.ts:2157 |
| #101c1f | 1 | 1 | #0e1c20 | src/breach-main.ts:2976 |
| #101d1b | 1 | 1 | #111d1c | src/breach-style.css:91 |
| #102021 | 1 | 1 | #102020 | src/breach-main.ts:4380 |
| #111111 | 1 | 1 | #0b1415 | src/breach-style.css:36 |
| #111e20 | 1 | 1 | #141e20 | src/breach-main.ts:2414 |
| #112024 | 1 | 1 | #122022 | src/style.css:188 |
| #112321 | 1 | 1 | #152421 | src/breach-style.css:130 |
| #121713 | 1 | 1 | #0b1911 | src/study-style.css:9 |
| #121a1c | 1 | 1 | #0f1b1c | src/breach-style.css:3 |
| #122022 | 1 | 1 | #102021 | src/breach-fog-mask.ts:36 |
| #12221a | 1 | 1 | #15221c | src/study-style.css:61 |
| #122521 | 1 | 1 | #15251f | src/breach-style.css:283 |
| #131f1c | 1 | 1 | #102020 | breach-visual-lab.html:14 |
| #132426 | 1 | 1 | #142426 | src/breach-style.css:137 |
| #141e20 | 1 | 1 | #111e20 | src/breach-main.ts:3048 |
| #142025 | 1 | 1 | #112024 | src/style.css:36 |
| #142425 | 1 | 1 | #142426 | src/breach-style.css:218 |
| #142426 | 1 | 1 | #132426 | src/breach-style.css:103 |
| #14251c | 1 | 1 | #14251e | src/operator-studio.css:131 |
| #14251e | 1 | 1 | #15251f | world.html:120 |
| #142525 | 1 | 1 | #162524 | src/breach-style.css:351 |
| #142528 | 1 | 1 | #142426 | river-lab.html:10 |
| #142723 | 1 | 1 | #162723 | src/breach-style.css:836 |
| #142829 | 1 | 1 | #16272a | src/breach-main.ts:2585 |
| #152019 | 1 | 1 | #12221a | src/study-soldier.ts:85 |
| #152123 | 1 | 1 | #122022 | src/breach-style.css:53 |
| #15231b | 1 | 1 | #15221c | world.html:113 |
| #15251f | 1 | 1 | #14251e | world.html:34 |
| #152623 | 1 | 1 | #162622 | breach-visual-lab.html:11 |
| #152a28 | 1 | 1 | #192a27 | src/breach-style.css:308 |
| #152b2c | 1 | 1 | #182b2c | src/operator-figure.ts:95 |
| #152c29 | 1 | 1 | #152d2a | world.html:86 |
| #152d2a | 1 | 1 | #172d29 | world.html:32 |
| #16231f | 1 | 1 | #152421 | operator-lab.html:66 |
| #162524 | 1 | 1 | #142525 | src/breach-style.css:560 |
| #162622 | 1 | 1 | #152623 | src/breach-style.css:382 |
| #162721 | 1 | 1 | #172722 | operator-lab.html:115 |
| #16272a | 1 | 1 | #142829 | src/style.css:175 |
| #162d27 | 1 | 1 | #172d29 | src/physicality-lab-main.ts:164 |
| #171f22 | 1 | 1 | #142025 | index.html:6 |
| #172322 | 1 | 1 | #152421 | src/breach-operator-lab.ts:720 |
| #172522 | 1 | 1 | #182523 | src/breach-style.css:91 |
| #172526 | 1 | 1 | #162524 | src/breach-style.css:229 |
| #172722 | 1 | 1 | #162723 | src/breach-style.css:687 |
| #172724 | 1 | 1 | #182724 | src/campaign-style.css:49 |
| #172d29 | 1 | 1 | #152d2a | src/breach-style.css:1163 |
| #18241f | 1 | 1 | #16231f | operator-armor-rig-lab.html:7 |
| #182523 | 1 | 1 | #172522 | src/campaign-style.css:80 |
| #182824 | 1 | 1 | #172824 | physicality-lab.html:6 |
| #182b2c | 1 | 1 | #152b2c | src/breach-main.ts:2647 |
| #182d22 | 1 | 1 | #162d27 | src/study-style.css:57 |
| #182e2a | 1 | 1 | #192e2a | operator-lab.html:150 |
| #19271d | 1 | 1 | #1a2820 | src/study-style.css:22 |
| #192a23 | 1 | 1 | #1a2a24 | world.html:137 |
| #192a27 | 1 | 1 | #1a2927 | src/campaign-style.css:60 |
| #192b26 | 1 | 1 | #182c27 | src/breach-style.css:1340 |
| #192e2a | 1 | 1 | #182e2a | physicality-lab.html:18 |
| #1a2522 | 1 | 1 | #182523 | operator-lab.html:12 |
| #1a2527 | 1 | 1 | #172526 | src/breach-main.ts:2884 |
| #1a2820 | 1 | 1 | #182923 | src/study-style.css:49 |
| #1a282a | 1 | 1 | #1b282b | src/breach-style.css:41 |
| #1a2927 | 1 | 1 | #1c2927 | src/equipment-preview.ts:38 |
| #1a2a24 | 1 | 1 | #1b2a24 | src/ui/ux-r1-sheets.css:53 |
| #1a2b28 | 1 | 1 | #192b29 | src/operator-studio.css:9 |
| #1a2b3c | 1 | 1 | #1e3045 | src/environment-conditions.ts:37 |
| #1b282b | 1 | 1 | #1a282a | src/breach-style.css:31 |
| #1b2a23 | 1 | 1 | #1b2a24 | physicality-lab.html:14 |
| #1b2a24 | 1 | 1 | #1a2a24 | src/study-style.css:25 |
| #1b2a25 | 1 | 1 | #1b2a24 | src/operator-studio.css:17 |
| #1b302b | 1 | 1 | #1c302b | map-lab.html:4 |
| #1c2727 | 1 | 1 | #1e2726 | src/breach-main.ts:2208 |
| #1c291e | 1 | 1 | #1a2820 | src/study-style.css:31 |
| #1c2927 | 1 | 1 | #1a2927 | asset-lab.html:7 |
| #1c3025 | 1 | 1 | #1b3028 | src/ui/ux-r1-sheets.css:104 |
| #1c302a | 1 | 1 | #1c302b | src/breach-style.css:1099 |
| #1c302b | 1 | 1 | #1b302b | physicality-lab.html:3 |
| #1c302c | 1 | 1 | #1d302c | operator-lab.html:218 |
| #1c302d | 1 | 1 | #1c302c | map-lab.html:9 |
| #1c312b | 1 | 1 | #1c302a | src/ui/ux-r1-sheets.css:112 |
| #1d2624 | 1 | 1 | #1e2726 | src/breach-main.ts:2463 |
| #1d2e29 | 1 | 1 | #1c2d29 | map-lab.html:38 |
| #1d302c | 1 | 1 | #1c302c | asset-lab.html:16 |
| #1d332d | 1 | 1 | #1e342c | src/breach-style.css:1168 |
| #1e3045 | 1 | 1 | #1a2b3c | src/environment-conditions.ts:47 |
| #1e3334 | 1 | 1 | #203338 | river-lab.html:15 |
| #1f302d | 1 | 1 | #20302e | operator-lab.html:143 |
| #202b28 | 1 | 1 | #202c2b | asset-lab.html:4 |
| #202b2e | 1 | 1 | #222b2c | src/breach-3d.ts:2105 |
| #202d2b | 1 | 1 | #202c2b | map-lab.html:8 |
| #202e2d | 1 | 1 | #202d2b | src/breach-main.ts:2939 |
| #20302b | 1 | 1 | #1f302d | world.html:132 |
| #20332f | 1 | 1 | #22332e | map-lab.html:10 |
| #203338 | 1 | 1 | #1e3334 | river-lab.html:10 |
| #20342f | 1 | 1 | #20332f | src/breach-style.css:693 |
| #203732 | 1 | 1 | #203733 | src/breach-main.ts:2427 |
| #203733 | 1 | 1 | #203732 | world.html:101 |
| #203834 | 1 | 1 | #203935 | src/breach-style.css:320 |
| #20392f | 1 | 1 | #22392e | operator-lab.html:183 |
| #203935 | 1 | 1 | #203834 | world.html:56 |
| #203a30 | 1 | 1 | #20392f | src/ui/ux-r1-sheets.css:84 |
| #21362d | 1 | 1 | #23352e | src/operator-studio.css:102 |
| #213a33 | 1 | 1 | #213b35 | asset-lab.html:11 |
| #213b32 | 1 | 1 | #223b32 | src/ui/ux-r1-sheets.css:47 |
| #213b35 | 1 | 1 | #213a33 | world.html:78 |
| #222527 | 1 | 1 | #1e2726 | src/operator-head-accessory-catalog.ts:53 |
| #222b2b | 1 | 1 | #222b2c | src/breach-main.ts:425 |
| #222b2c | 1 | 1 | #222b2b | src/worldgen/fixture-visuals.ts:145 |
| #222c32 | 1 | 1 | #202b2e | src/operator-head-accessory-catalog.ts:82 |
| #222f26 | 1 | 1 | #232e24 | src/study-style.css:37 |
| #22332e | 1 | 1 | #20332f | src/operator-studio.css:5 |
| #223631 | 1 | 1 | #203732 | src/ui/fieldwork-design.css:11 |
| #22392e | 1 | 1 | #23392f | src/operator-material-browser.css:22 |
| #223b32 | 1 | 1 | #213b32 | operator-lab.html:28 |
| #23312f | 1 | 1 | #24302e | operator-lab.html:70 |
| #23372f | 1 | 1 | #26362e | operator-lab.html:215 |
| #23392f | 1 | 1 | #22392e | operator-lab.html:14 |
| #233b39 | 1 | 1 | #273a37 | src/breach-main.ts:2584 |
| #233d37 | 1 | 1 | #253c36 | world.html:90 |
| #24302e | 1 | 1 | #23312f | src/breach-3d.ts:101 |
| #24322c | 1 | 1 | #22332e | operator-lab.html:79 |
| #24322f | 1 | 1 | #23312f | src/breach-main.ts:2661 |
| #24392b | 1 | 1 | #22392e | src/regional-visuals.ts:18 |
| #243a34 | 1 | 1 | #253a34 | physicality-lab.html:7 |
| #243b31 | 1 | 1 | #243b32 | src/operator-appearance-grid.css:11 |
| #243b32 | 1 | 1 | #243b31 | operator-lab.html:170 |
| #243c33 | 1 | 1 | #243b32 | src/operator-studio.css:105 |
| #252b2b | 1 | 1 | #242c2b | src/worldgen/fixture-visuals.ts:205 |
| #25342f | 1 | 1 | #243530 | world.html:125 |
| #253528 | 1 | 1 | #27352b | src/breach-style.css:1061 |
| #253831 | 1 | 1 | #23372f | world.html:136 |
| #253a34 | 1 | 1 | #243a34 | src/breach-style.css:826 |
| #253b40 | 1 | 1 | #233b39 | river-lab.html:17 |
| #253c36 | 1 | 1 | #233d37 | src/equipment-weapon-workbench.ts:49 |
| #254239 | 1 | 1 | #284239 | world.html:47 |
| #262e30 | 1 | 1 | #292f30 | src/breach-main.ts:3039 |
| #26362e | 1 | 1 | #23372f | src/breach-style.css:796 |
| #263836 | 1 | 1 | #273a37 | src/breach-main.ts:2413 |
| #263a31 | 1 | 1 | #253a33 | operator-armor-rig-lab.html:16 |
| #263a34 | 1 | 1 | #253a34 | physicality-lab.html:10 |
| #263d37 | 1 | 1 | #233d37 | src/breach-style.css:681 |
| #263e35 | 1 | 1 | #263d37 | src/operator-studio.css:16 |
| #264039 | 1 | 1 | #293f3a | src/breach-main.ts:2600 |
| #27352b | 1 | 1 | #26362e | src/breach-style.css:1110 |
| #273a34 | 1 | 1 | #263a34 | src/breach-style.css:1171 |
| #273a37 | 1 | 1 | #293a37 | src/study-world.ts:135 |
| #284239 | 1 | 1 | #294239 | src/ui/ux-r1-sheets.css:137 |
| #28433d | 1 | 1 | #29423d | breach-visual-lab.html:13 |
| #292e2d | 1 | 1 | #292f2d | src/operator-headwear-colors.ts:9 |
| #292f2d | 1 | 1 | #292e2d | src/operator-garment-color-policy.ts:21 |
| #292f30 | 1 | 1 | #292e2d | src/breach-main.ts:2173 |
| #293332 | 1 | 1 | #2b3433 | src/worldgen/asset-character-visuals.ts:47 |
| #293a37 | 1 | 1 | #273a37 | src/campaign-style.css:28 |
| #293b37 | 1 | 1 | #293a37 | src/campaign-style.css:78 |
| #293d37 | 1 | 1 | #263d37 | src/breach-style.css:809 |
| #293f3a | 1 | 1 | #2b403c | src/breach-style.css:563 |
| #294438 | 1 | 1 | #2b443a | world.html:91 |
| #294840 | 1 | 1 | #29483d | world.html:54 |
| #2a3936 | 1 | 1 | #293a37 | src/breach-style.css:95 |
| #2a4238 | 1 | 1 | #294239 | src/ui/ux-r1-sheets.css:131 |
| #2a493a | 1 | 1 | #29483d | src/operator-appearance-grid.css:31 |
| #2b3836 | 1 | 1 | #2a3936 | src/breach-style.css:132 |
| #2b403c | 1 | 1 | #2c4039 | src/breach-style.css:227 |
| #2b443a | 1 | 1 | #294438 | map-lab.html:49 |
| #2c3733 | 1 | 1 | #2b3836 | src/breach-main.ts:2072 |
| #2c3b39 | 1 | 1 | #293b37 | src/breach-main.ts:2135 |
| #2c4039 | 1 | 1 | #2b403c | src/campaign-style.css:65 |
| #2c433c | 1 | 1 | #2d423c | src/breach-style.css:287 |
| #2d423c | 1 | 1 | #2c433c | src/ui/fieldwork-design.css:12 |
| #2e463d | 1 | 1 | #30473c | operator-lab.html:204 |
| #2f514a | 1 | 1 | #314f47 | src/breach-style.css:411 |
| #302d29 | 1 | 1 | #332e29 | src/operator-visual-kit.ts:79 |
| #303a33 | 1 | 1 | #313a31 | src/study-soldier.ts:23 |
| #303a38 | 1 | 1 | #303b38 | src/equipment-weapon-workbench.ts:20 |
| #303b36 | 1 | 1 | #313b37 | src/operator-visual-kit.ts:78 |
| #303b38 | 1 | 1 | #313b37 | src/worldgen/detailed-fixture-visuals.ts:318 |
| #304338 | 1 | 1 | #2e4338 | src/clouds.ts:95 |
| #30473c | 1 | 1 | #31483d | src/ui/ux-r1-sheets.css:73 |
| #30483e | 1 | 1 | #31483d | src/ui/ux-r1-sheets.css:30 |
| #304b43 | 1 | 1 | #304d42 | src/breach-style.css:558 |
| #304d42 | 1 | 1 | #344d43 | src/surface-materials.ts:27 |
| #313935 | 1 | 1 | #323936 | src/breach-operator-rig.ts:235 |
| #313b37 | 1 | 1 | #303b38 | src/breach-3d.ts:2128 |
| #313b39 | 1 | 1 | #323b39 | src/worldgen/asset-character-visuals.ts:534 |
| #313c3a | 1 | 1 | #313b39 | src/operator-figure.ts:32 |
| #31483d | 1 | 1 | #30483e | operator-armor-rig-lab.html:12 |
| #314f47 | 1 | 1 | #355047 | src/breach-style.css:316 |
| #323936 | 1 | 1 | #313935 | src/operator-wardrobe-head-visuals.ts:64 |
| #323b39 | 1 | 1 | #313b39 | src/operator-figure.ts:76 |
| #33271b | 1 | 1 | #3a2920 | src/breach-main.ts:2205 |
| #333d3c | 1 | 1 | #343c3b | src/worldgen/asset-character-visuals.ts:43 |
| #334640 | 1 | 1 | #34473f | src/breach-style.css:292 |
| #343a34 | 1 | 1 | #353b37 | src/rendering/wear-finish.ts:13 |
| #343c3b | 1 | 1 | #353c3c | src/worldgen/fixture-visuals.ts:370 |
| #343e3c | 1 | 1 | #343e3d | src/breach-3d.ts:1141 |
| #343e3d | 1 | 1 | #343e3c | src/worldgen/building-palettes.ts:30 |
| #344136 | 1 | 1 | #344236 | src/main.ts:195 |
| #34443e | 1 | 1 | #34453d | src/breach-3d.ts:1256 |
| #34484a | 1 | 1 | #39484a | river-lab.html:14 |
| #344b60 | 1 | 1 | #364c60 | src/environment-conditions.ts:37 |
| #344e40 | 1 | 1 | #344e42 | src/operator-headwear-picker.css:14 |
| #344e42 | 1 | 1 | #354e42 | src/ui/ux-r1-sheets.css:121 |
| #344f43 | 1 | 1 | #354e42 | src/operator-fabric-camo-picker.css:5 |
| #34554b | 1 | 1 | #39554a | src/breach-style.css:1218 |
| #353b37 | 1 | 1 | #343c39 | src/study-soldier.ts:24 |
| #353c3c | 1 | 1 | #343c3b | src/operator-upper-colorways.ts:50 |

## Protected families
- **Camouflage inks:** retain each pattern’s recognizable proportion, contrast and hue. Merge only within an individual pattern after visual reference comparison. Identical values may still be shared as a constant without altering the rendered result.
- **Skin and hair:** preserve distinct identities and physically plausible luminance steps; similarity in RGB alone is not a justification to reduce options.
- **UI semantic states and combat telegraphs:** explicit meaning and legibility override numerical closeness.
- **Architectural theme variation:** keep deliberate warm/cool tonal relationships, but consolidate identical *roles* (wood/trim/caps) if no meaningful visible difference.

## Source dynamic color-generation hotspots
- src/breach-operator-rig.ts: 25 matching operations
- src/regional-terrain.ts: 7 matching operations
- src/terrain.ts: 7 matching operations
- src/traffic-field.ts: 5 matching operations
- src/breach-3d.ts: 4 matching operations
- src/clouds.ts: 4 matching operations
- src/first-place-scene.ts: 4 matching operations
- src/breach-ik.ts: 3 matching operations
- src/study-world.ts: 3 matching operations
- src/vegetation-field.ts: 3 matching operations
- src/flow-field.ts: 2 matching operations
- src/grass-patch-field.ts: 2 matching operations
- src/main.ts: 2 matching operations
- src/operator-appearance-grid.ts: 2 matching operations
- src/puddles.ts: 2 matching operations
- src/regional-visuals.ts: 2 matching operations
- src/vegetation-inspection.ts: 2 matching operations
- src/world-main.ts: 2 matching operations
- src/breach-operator-lab.ts: 1 matching operations
- src/breach-weapon-pose.ts: 1 matching operations
- src/equipment-weapon-workbench.ts: 1 matching operations
- src/operator-armor-rig-lab.ts: 1 matching operations
- src/operator-armor-rig-silhouettes.ts: 1 matching operations
- src/operator-d2-mask-geometry.ts: 1 matching operations
- src/operator-studio.ts: 1 matching operations
- src/rain.ts: 1 matching operations
- src/river-lab-main.ts: 1 matching operations
- src/study-main.ts: 1 matching operations

## Files
- [Full unique-RGB inventory](all-unique-colors.csv) — one row per normalized RGB, including usage count, source examples, nearest neighbor, and suggested review flag.
- [All source occurrences](all-color-uses.csv) — every detected literal location and alpha variant.

