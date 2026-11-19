# EQA3.6 — Apartment13 and Warehouse17 rescue approach choices

**Status:** targeted physical simulations GREEN. Real mobile presentation capture is a separate required acceptance step. Work remains on `feature/eqa3-6-rescue-scene-choices-20261118`, stacked on audit-only EQA3.5 draft PR #1759, not production. No gameplay, AI, fog, damage, objective or civilian behavior change in this stage.

## Replication

[Corrected exact-case 90-second simulation and SVG scene artifact](https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/44442318349) — **SUCCESS** for Apartment13 and Warehouse17 `--mission=rescue`, UNKNOWN and CONFIRMED briefing, real GO-time doors, combat, true rescue civilian, real FOLLOW and extraction.

`scripts/audit-eqa3-mission-decisions.mjs --smoke --seed=N --mission=rescue --seconds=90 --intel=unknown|confirmed --door-aware --forensic` now requires exact seed+mission when specified, so seed17's older INTEL fixture is never silently conflated with its RESCUE fixture. The normal smoke corpus remains unchanged. `scripts/audit-eqa3-6-rescue-scene.mjs` independently reconstructs **initial physical world truth** from the same seed/site and overlays only actual recorded civilian-harm shots. It exports one deterministic SVG per entry and a JSON manifest.

**Important visual limitation:** SVGs show a top-down *forensic geometry schematic* with full hostile truth. They are **not** screenshots from the game's three.js renderer, nor player-visible line of sight. The 23-unit contact ring only tests local physical reach and geometric optical exposure from initial hostile positions; it cannot guarantee a valid route, a recognized threat, a safe time window, or a player's plan.

## Apartment seed 13 RESCUE — one genuine FRONT insertion

| Actual measure (90s) | UNKNOWN | CONFIRMED |
| --- | ---: | ---: |
| First hostile contact | 1.93s | 1.93s |
| First shot | 2.03s | 2.03s |
| Rescue objective secured | 5.07s | 5.07s |
| Actual mission DONE | **19.37s** | **19.37s** |
| Hostile civilian hit | **one wound at 4.07s** | **one wound at 4.07s** |
| Rescue person | Wounded, secured, FOLLOW | Wounded, secured, FOLLOW |
| Script rejections / route aborts | 0 / 0 | 0 / 0 |

The shot's **intended** opponent was ROOK, with the rescue person physically intercepting the shot. The rescue person initially sits at (276.5,367.5); initial sentry is 47.17 world units away, guard 110.62, both have unobstructed *optical* ray. All 16 local 23-unit ring samples were physically contact-clear; all 16 also had at least one unobstructed ray from an initially placed hostile. This does **not** mean the civilian was unsalvageable: the actual scripted rescue succeeded with one injury. The prior EQA3.3 observation of a civilian ~85 units from first contact was a proximity clue, **not** proof of injury at initial contact.

## Warehouse seed 17 RESCUE — two real insertions

Same generation policy, same objective, civilian initially at (173.5,464), initial guard 78.08 units away and sentry 143.68. All 16 23-unit local interaction-ring samples were contact-clear yet optically exposed to at least one initial hostile. No points were optically covered at that exact radius/initial-door snapshot. **Do not infer an unstoppable firefight from that static result**; angles, actual doors, perception, real squad suppression, and alternative standoff/cover routes remain meaningful.

| Physical 90s episode | Result |
| --- | --- |
| UNKNOWN FRONT | Objective reached 37.57s; one real guard-to-ROOK shot wounds the civilian at 37.40s; civilian secured and FOLLOW established, but no extraction by 90s |
| UNKNOWN SERVICE | Objective not reached by 90s; original scout incapacitated and a real surviving squadmate assumed the script, with no fake route failure |
| CONFIRMED FRONT | Objective reached 25.07s; two guard shots intended at ROOK intercept civilian at 24.67s/25.30s; civilian incapacitated; no extraction |
| CONFIRMED SERVICE | Objective reached 20.57s; two same-intent actual hits at 20.30s/20.93s; civilian incapacitated; no extraction |

All four corrected episodes had **zero rejected script commands, zero route aborts and zero world-integrity errors**. EQA3.5's separate optional stand-off policy was **mixed**, not a global cure: its UNKNOWN SERVICE actor completed with a real wound and FOLLOW at 67.87s, but CONFIRMED SERVICE still injured then incapacitated the civilian; CONFIRMED FRONT had a route abort and never reached the person. This narrow cohort cannot justify generic enemy nerfs, invisible noncombatant shielding, or auto-approach rules.

## Decision and next validation

1. **Real browser presentation:** capture exact-seed Quick Play RESCUE via its public scenario creator on mobile, in briefing, live iso and 2D views; verify actual mission seed/type and preserve fog rather than substituting an omniscient developer map. A CI browser issue must be fixed rather than claiming visual verification.
2. **Assessment:** contrast actual scene legibility (operator-to-person gap, visible threat, cover/furniture, open/closed doors, understandable command affordance) with physical shot/civilian harm timeline. Explore if a player can choose to hold/cover/clear the guard **before** sending the rescuer through its fire corridor.
3. **Gameplay gate:** only ship a minimal fix if a specific rendered/accessibility or physical regression remains. An injured but successful Apartment rescue and hard Warehouse rescue should both remain possible; no guaranteed success, silent civilian protection, objective truth leak, or forced gunfight. Preserve the real FRONT/SERVICE divergence.
4. **Release:** keep audit and presentation work in its feature PR, run focused CI, and do not stack another Pages deployment or merge to main until an actual gameplay feature is justified and the previous Pages checkpoint is verified.


## Actual mobile browser capture — CI green

[Real Chromium iPhone-sized screenshot workflow 44442443275](https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/44442443275) **SUCCESS** after adapting the pinned Playwright browser installer to the GitHub Ubuntu 26.04 runner. [Six PNG screenshots + manifest](https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/44442443275/artifacts/14491537376) were captured via the **ordinary** `?quick=1` browser startup, Settings/Quick Play scenario creator, real GENERATE MISSION button, and game-presented camera view controls. No Session, enemy, objective or fog mutation was used.

- Apartment13: exact site seed **13**, selected building **APARTMENT**, selected **RESCUE & ESCORT**, size small, UNKNOWN briefing; three screenshots: briefing, live mobile iso, live mobile 2D.
- Warehouse17: exact seed **17**, building **WAREHOUSE**, same RESCUE & ESCORT/UNKNOWN context; three analogous screenshots.
- Browser emitted **zero page exceptions**. Reproduction and screenshot paths are logged in `artifacts/eqa3-6-browser/manifest.json`.

This closes the **capture plumbing** gate and provides genuine, player-visible phone visuals. It does **not** claim a human reviewed the images for fairness, that the browser was a physical iPhone, or that live threats are visible before acquisition. The independently generated omniscient SVG maps and shot traces remain developer-only forensic comparisons, not gameplay visibility. Keep the PR in draft until a visual reviewer inspects exposure/readability and judges whether any narrow gameplay correction is actually necessary.
