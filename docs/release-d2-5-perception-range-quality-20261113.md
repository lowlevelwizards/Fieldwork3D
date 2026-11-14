# D2.5 — Detection, Positive ID, Reaction and Range Quality

**Base:** D2.4 public-verified production `09bc3f21993a8bf8e944194941df4c13266521e6`, successful Pages workflow `43541630614`.
**Branch:** `feature/d2-5-perception-identification-range-20261113` (staged development; no main merge or production release until reviewed checkpoint).

## Current ownership audit

- `breach-game.ts::geometricallyVisible`: authoritative real facing, site-diagonal range, session-scoped cached wall/door/cover LOS. The V1 long-range visual and ground/fog work already shipped; avoid a redundant 240-unit cutoff or extra long-range scan.
- `breach-visual-acquisition.ts`: one 60 Hz `advanceActorSightProgress` per live opposing actor pair. Gets spatially valid geometry, range/off-axis/motion/crouch/light and enemy readiness before recording the actor-personal `awareness.visualProgress`.
- `breach-visual-perception.ts`: one scalar `visualProgress`, detection at .16 and confirmation at .999; a shared linear slope previously made post-glimpse identification respond with the exact same rate as initial human detection. Direct occlusion immediately clears evidence.
- `breach-ai-visual-evidence.ts`: only confirmed `inSight` contacts receive threat intelligence and reports; a mere silhouette creates a bounded curiosity event. Formerly made a filter roster then a second opposing-team search for glimpses.
- `breach-encounter-readiness.ts`: deterministic hashed guard response delay, starts only upon confirmed direct sight. This clock is distinct from identification and weapon acquisition.
- `breach-firing-cadence.ts`: existing distance-dependent time-to-aim with attachment/handling, independent from sight. `breach-shot-ignition.ts`: existing physically angular, range-graded spread with weapon, optic, skill, motion and suppression modifiers; no hidden second hit roll or projectile cutoff.
- `breach-firing-pipeline.ts`: one real confirmed contact roster, physical muzzle/friendly/civilian veto, shot-time RNG/trajectory. Preserve existing urgency, correction and 60 Hz fire policies.
- `breach-replay-visibility.ts`: recorded detection and confirmed sight remain distinct; old recordings cannot be upgraded from new knowledge.

## Staged implementation

### D2.5.0 — Audit and acceptance definition
This plan records baseline source authority and positive-ID/reaction/range constraints. No new visual field, per-frame raycast, physics object, actor clock, replay field, or target source.

### D2.5.1 — Two-phase recognition in the existing scalar
Introduce a cheap bounded distance-only **post-glimpse** identification rate. The original initial silhouette gain and detection threshold remain bit-for-bit for given LOS and fixed tick; farther positive ID requires sustained sight after the silhouette, but close CQB remains unchanged. One scalar, no extra pair query. Losing geometry must reset both, so fleeting doorway contact never grants ID. Keep compatibility for `advanceSight` calls lacking the optional rate.

### D2.5.2 — Real-contact response separation
Add a small bounded distance response cost to existing deterministic `encounterReactionDelay`, supplied only by a **confirmed, directly visible** contact when the enemy's first reaction clock starts. Preserve readiness order, hashed jitter, near-contact time, AI alert/engagement gates, and no new clock. Existing ranged weapon acquisition remains separate.

### D2.5.3 — One visual-evidence roster scan
Replace the two opposing-team searches in AI visual evidence with one pass collecting confirmed contacts and remembering the first legitimate silhouette. Preserve selection order, no hidden intel/target/report on detection, suppression, cover and report rules. No extra LOS probes; after positive ID use exactly the existing `inSight` calls.

### D2.5.4 — Range/shot integrity and performance acceptance
Do not stack another distance multiplier onto V3's already range-scaled physical shot cone and optical modifiers. Test monotonic near/far `acquisitionSeconds`, `rangeSpreadScale`, optics and ammunition/trajectory determinism. Prove the scan makes at most one per-candidate `inSight` call and there is no second geometry pass. CI: focused D2.5, V1–V3 long sight/detection/combat, Stage9 AI evidence and replay, existing firing/door/civilian safety, production typecheck and bundle. No claims about device FPS or gameplay accuracy without measured seeded trajectories.

## Acceptance/non-goals

1. Same sight geometry/fog site bounds; fully occluded/opposite-facing contacts never appear.
2. Distant silhouette detected before ID, without hostile marker, shot, global report or exact belief.
3. Long-range positive ID takes measurably more continuous optical time; near CQB baseline unchanged.
4. A confirmed distant guard reacts more cautiously but not indefinitely; already-alerted and prepared remain quicker than unaware.
5. Independent existing shot-time accuracy, optic effects, ammunition, penetration, civilian and friendly safety remain intact.
6. No new simulation task, render-owned vision, per-actor timers, persistent LOS cache, extra RNG consumption or historical-film rewrite.

**Release gate:** keep compatible stages on the branch. Inspect exact PR-head critical CI, fix blockers, then merge a single checkpoint only after prior main Pages deployment is successful and the expected version is publicly served. A rollout needs new final Pages exact-build confirmation.
