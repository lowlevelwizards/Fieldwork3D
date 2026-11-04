# R8 Combat Behavior & Pacing — Release Report
Two deployment checkpoints, no per-stage production queue.

## R8A Contact pacing
- Real scripted approach to the *known* front insertion/objective marker,
  no hidden hostile navigation shortcut. Classify long-range quiet approaches,
  near misses, stalls, and actual confirmed combat separately.
- For the R7 11-seed baseline, five missions had no confirmed contact
  within 14 seconds. R8A does not force enemies into artificial proximity.

## R8B Reaction
- Suppression + morale thresholds now govern tactical withdrawal.
- A HOLD or WITHDRAW choice really suspends firing; a blocked firing lane
  must still be cleared before attack.
- Defensive crouch checks actual incoming ballistic cover height rather
  than solely furniture proximity; no omniscient target coordinates added.

## R8C Readability
- After-action combat review distinguishes uniquely observed projectiles,
  true sampled hits, wound/down events, point/aimed shots and contact-to-first-shot.
- No stats are inferred from random visual cues; no opponent data leaked
  during combat; no invisible shot event is manufactured to fill missing frames.

## R8D QA
- Compare live movement and outcomes in floor-plan versus true-blind
  intelligence modes with the SAME physical site, obstacles, and fixed tick.
- Audit 6 seeded missions in each intel mode, real motor, actor positions,
  replay chronology and host-CPU p95. This is NOT a full mobile touchscreen
  or 2D/3D rendered visual audit and must not be described as such.
- Existing static touch/camera UI tests and critical AI tests are retained.
  Actual iOS gameplay review should follow release for visual clarity,
  camera transitions and player-authored real room-clearing tactics.

Critical checks:
```sh
node --experimental-strip-types --test tests/mission-contact-r8a.test.mjs tests/mission-reactivity-r8b.test.mjs tests/awareness-combat.test.mjs
npm run audit:r8-contacts -- 11
node --experimental-strip-types --test tests/mission-combat-review-r8c.test.mjs tests/mission-mode-probe-r8d.test.mjs tests/ux2-mobile-settings-camera.test.mjs
npm run audit:r8-modes -- 6
npm run build
```
