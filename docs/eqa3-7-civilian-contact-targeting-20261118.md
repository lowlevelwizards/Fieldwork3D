# EQA3.7 — make SECURE and FOLLOW match the actual reachable civilian

## Why this is a gameplay UX correction

The real mobile mission screenshots from [EQA3.6](https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/44442443275) confirm that the apartment and warehouse are correctly unknown before entry; an enemy-position or rescue-location warning would leak undiscovered state. Physical EQA3.6 mission films confirm civilians can be wounded by rounds aimed at an operator, with true FOLLOW/extraction authority.

Source review found a concrete command-target mismatch unrelated to enemy aim:

- The **palette** previously offered `FOLLOW` if a rescue person was within 34 units of the planned route end, but independently chose its candidate using the nearest *any* living visible civilian. A closer unrelated visitor could suppress or misrepresent the rescue action.
- The **dispatcher** picked the nearest living visible civilian again, regardless of rescue identity or whether they were in physical contact across walls/closed solid doors. This could reject an otherwise valid FOLLOW with a farther rescue target, or display SECURE through an obstructing opening.
- **Game authoring** already used 34-unit reach, real physical swept contact, current visibility, and rescue mission stage. We should make player-facing availability and dispatch agree with that authority, not weaken the authority.

## Correction

A single pure `nearestContextCivilian` function is used by both `src/ui/tactical-palette-controller.ts` and `src/breach-tactical-context-command.ts`. It filters in this order:

1. FOLLOW only in extraction, to a living **rescueTarget**. SECURE only living noncompliant targets.
2. Within the existing 34-unit authoring reach of the final planned position.
3. Currently visible according to the actual squad's live knowledge.
4. Physically contactable using the existing 5.5-unit swept body check against the authoritative **session-owned** doors and world geometry.
5. Nearest eligible candidate, preserving stable order on ties. No mutation or extra AI scan.

The actual `planCivilianInteraction` and GO-time execution authority remain unchanged. This is **not** an auto-approach, a rescue auto-success, or a fake protection bubble.

## Verification

[Targeted EQA3.7 CI run 44449005045](https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/44449005045) succeeded: TypeScript `npm run check`; **13 tests passed, 0 failed** across EQA3.7 target selection, C4 contextual civilian interaction, D1 rescue/custody/extraction lifecycle, and C2–C5 existing contextual interaction regressions. A live Session dispatcher test places a normal visitor closer to ROOK than a rescue target and asserts the queued FOLLOW names the actual rescue person and changes neither person's GO-time state.

**Release checkpoint:** The concurrent L2.8 production Pages run [44448973376](https://github.com/lowlevelwizards/Fieldwork3D/actions/runs/44448973376) was still **queued** when this feature was checked. Do not merge to main / stack a second deployment until that run finishes successfully and its public build-ID verification passes. EQA3.5 and EQA3.6 remain independent draft diagnostic PRs #1759/#1760 and are not necessary to ship this narrowly scoped code fix.
