# Roadmap 2 Stage 10 — authoritative firing and damage resolution

**Baseline:** main after Stage 9 and subsequent verified release.  
**Branch:** `refactor/roadmap2-stage10-firing-pipeline-20261110`

## Complete ownership and boundaries
- `breach-game.ts`: single authoritative 60 Hz session, actor tick, reload/tactical events callbacks, physical LOS and fog evidence, session state, death/mission progression. It delegates exactly one firing tick per actor to the combat controller.
- `breach-firing-pipeline.ts`: one-session-authoritative firing execution for player and enemy: readiness, reload, suppression, confirmed targeting, muzzle and friendly-lane safety, controlled physical lane recovery, spread, projectile tracing, penetration, glass/cover impact, armor, wound and death consequences, acoustic evidence, civil harm, shots, casings and replay effects.
- Existing `breach-ballistic-resolution.ts`, `breach-fire-safety.ts`, `breach-weapon-clearance.ts`, `breach-target-selection.ts`, `breach-shot-ignition.ts`, `equipment-armor.ts` and wound/impact/neutral modules remain specialized authoritative policy/geometry helpers; no duplicate ballistic rules.
- `breach-enemy-decision-controller.ts` asks the firing controller for a permitted physical muzzle recovery via the shared port; it never bypasses shot/clearance gates.

## Non-negotiable contracts
1. **Determinism:** game-local seed, LCG RNG call order, shot-ID order, hit/armor timing, evidence recording and authoritative 60 Hz tick sequence are unmodified. Do not regenerate golden fingerprints.
2. **Correct safety:** actual weapon muzzle, cover, walls, doors, panes, friendly fire corridors and *observed* civilian corridors gate shots. Physical neutral ray/body test occurs only after firing, with no hidden acquisition from civilians.
3. **Causality:** only real projectile impacts wound, break objects, produce suppression pressure, morale changes and attribution; no visual-only effects write simulation truth.
4. **Compatibility:** explicit suppress mode, return fire, reload and sprint/short-stock/carry/medical restrictions, AI morale and retreat, cover damage, capture/rescue and Campaign persistence are unchanged.
5. **Budget:** no second clock, no per-frame allocations, no new all-pairs LOS loops; simulation workload probe must pass.
6. **Replay:** same shot events, shot IDs, blood/surface height, casing, noise, civilian harm and death attribution.

## Completion gates
- Production TypeScript compilation and bundling `npm run build`.
- Frozen deterministic live scenarios including Stage 1 combat/civilian goldens and Stage 2 physics.
- Focused `tests/breach-roadmap2-stage10-combat.test.mjs` ownership contracts.
- Barrel/clearance tests `breach-171` and `breach-179`, adjusted to read the new owner without weakening any assertion.
- Existing firing, ballistic, armor, civilians and replay tests; all PR critical GitHub Actions and simulation budget.
- Verify previous production Pages served matching commit and no queued deploy before merging; verify new Pages build after merge.

## Changes deliberately excluded
This refactor does not rebalance weapon damage, alter hitboxes, add enemy omniscience, change difficulty, add camera/rendering dependencies, reset golden results or alter campaign health persistence.
