# Release 6 — Tactical Doctrine & Mission Identity

Baseline main: `a3c228b53a4ee490e2dcf4dc2ce81d41e7718008`. PR #1279: one batch, not five production deployments.

## Complete stage scope
1. **R6.1 Mission identity:** Mission-specific post reactions based on actual heard threats and assigned objective distance, not extra data or invented hostiles. CLEAR investigates; HOLD and INTEL guard eligible objectives from verified cover; CAPTURE/RESCUE protect nearby approaches without pursuing every noise. Direct sight and urgent suppression always override the doctrine.
2. **R6.2 Local coordinated intentions:** When a report is physically delivered, preserve active commitments; if a real objective sentry would otherwise run toward that same alarm, an available nearby listener may take investigation while the sentry watches. Never assign roles to unnotified allies or from world truth.
3. **R6.3 Morale and surrender context:** Bounded pressure from real personally seen recent opponents, actual nearby friendly support and a physically blocked retreat, retaining existing thresholds and surrender events. No psychically counted blue squad members.
4. **R6.4 Group doctrine:** Derive irregular/security/organised mentality from generated group purpose, NOT visual costume/faction catalogs. Seeded personality/morale and real audible coordination lease duration change without additional RNG draws or new actor schema.
5. **R6.5 Encounter comparative matrix:** Opt-in `node --experimental-strip-types scripts/audit-mission-quality.mjs 10 --doctrine-matrix` uses existing fixed-step 20s real Sessions. Record actually observed investigation, audible coordination, defense, retreat, surrender and generated doctrine actors per mission. A valid quiet/unoccupied mission is not a failed test.

## Non-negotiable
No new global AI state machine, no hidden player positions, no map/hostile-generation reroll, no faction identity claims based only on art, no fake human routines, no physical collision bypass, no extra per-frame rendering work, no breaking replay. Maintain standalone headless regression execution and phone-friendly performance.

## Release gate
- [ ] Stage-focused policy, coordination, morale, seeded doctrine and actual offline audit tests.
- [ ] Primary CI / TypeScript build, architecture, existing mission/AI/civilian, deterministic replay, motor and performance regressions.
- [ ] Phone/desktop WebGL tactical + Replay/Bodycam + Operator Lab acceptance on final exact PR head.
- [ ] Prior Pages deployment completed SUCCESS and **publicly served** exact current main SHA, production queue clear.
- [ ] Single PR merge to main; public Pages verify exact newly merged SHA.
- [ ] Manual physical iPhone Safari scenario feel, performance and extended encounter quality review remain separate from automated browser smoke.

**Reproducibility caveat:** The matrix reports real observed simulations, not forced success or proof that every mission plays differently. Broader balance still needs multiple seeds and user acceptance.
