# Living Encounters v1 — LE0 baseline and authority contract

Baseline main: `6d10dedf527843bbefed7d5f0a1c8e1b95f0ca50` (2026-11-08).

The default mission-quality audit remains behaviorally unchanged. For a small **opt-in** baseline, run `node --experimental-strip-types scripts/audit-mission-quality.mjs 11 --living`; the new output reports provisional incident ID versus eligible dossier ID, initial actor activities/readiness/routines, and generated vs active civilians. Its existing two-second passive replay is **not** evidence of gameplay satisfaction or mobile FPS. The on-demand 11-site smoke is adequate to guide changes, not to estimate universal frequencies.

## Protected authorities

- Keep the encounter director, premise/profile sampling, population/placement, actor AI, and combat. A hostile with role `occupant` is **armed** and cannot be visually depicted as an unarmed civilian.
- Preserve authored WATCH/MOVE/interaction, fog, and four-person sequencing. Open doorway PR #1100 owns movement/entry priority.
- The current operator pose director owns weapon, anatomy and footsteps; new pre-contact expression must be render-only and cannot depict holstering, holding tools, sleeping, full seating or conversations. No alternative animation scheduler.
- Civilians remain opt-in under the existing preview flag; keep `civilianPose`, current SECURE/FOLLOW semantics, custody, and existing mission compatibility.
- A generation intent may legitimately differ from the final eligible dossier. Report and diagnose; never reroll actors or manipulate seed distributions just for ID equality.
- Replay static site/actor identity belongs to the manifest; time-dependent state belongs to frames. Historical metadata-free recordings use a neutral pose and no inferred new activities.
- No new actor AI tick, pathfinding scheduler, forced pauses, or player orders. Device feel remains a manual acceptance item.

## Release discipline

LE0 is a branch-only stage. For Release 1, use only focused pose/replay/incident tests and production typecheck/build. Inspect armed actors and replay at normal tactical zoom. Merge a single compatible LE0–LE2 batch only after the active doorway work is integrated, the last Pages deployment is completed and public SHA verified. LE2 incident behavior changes are conditional, not mandatory.

## Live field-testing activation (November 8, 2026)

The user explicitly authorized enabling the already implemented civilian simulation in standard Quick Play and Campaign. The game entrypoint now enables the existing `enableCivilians` session option by default; `?civilians=0` opts out for comparisons, and `?civilians=1` remains accepted. Existing mission-selected population caps, legitimately empty premises, rescue-target compatibility, fog disclosure, combat targeting, and scoring are unchanged. This is a live player-test release, **not** a claim that full on-device visual/performance acceptance is complete. The old replay constructor can still load legacy films with no physical civilians.
