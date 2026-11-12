# Fieldwork Breach — Release 5 / Living Tactical Encounters

## Baseline and target
Baseline: main `76b96c3a07d90ae14fa82ecb364cbd745c5b1fe7` (November 12, 2026), after Release 4 and performance P2.3.
Feature branch: `feature/release5-living-encounters-20261112`, draft PR #1275.

Goal: credible full-encounter consequences from existing sight, acoustics, uncertainty, roles, mission, civilian response, movement, replay and perception/AI scheduling. No parallel AI system, reveal of hidden hostile/blue positions, extra render tick, or teleport.

## Stages
1. **R5.1 investigation continuity**: Consume sound evidence before optional muzzle-clearance early exit; genuine alarms interrupt that maneuver; a physically stalled investigator moves to existing uncertain candidates or settles rather than holding an impossible route. Opt-in long behavior audit runs 20s actual fixed-step Sessions and records progress. Maintains the 6s audit mode and no-contact validity.
2. **R5.2 local audio response**: Heard alarm creates at most one verbal report per sound ID in a plausible nearby social group, with original uncertainty + speech degradation. Only physically audible recipients are assigned existing investigate/watch/support roles; the reporter remains investigation lead. Direct visual reports unchanged.
3. **R5.3 mission role behavior**: Actual sensed threat near an assigned objective can cause a sentry/reserve/leader to defend the post rather than chasing. Direct visual contact, severe suppression and other mission types retain historical emergency priority; physical cover and approach remain authoritative.
4. **R5.4 civilian danger**: Geometrically confirmed armed presence alone causes caution; a witnessed actual shot, gun pointed at the civilian or close armed approach triggers alarm. Repeated sight does not stack fake evidence. Persona thresholds, SECURE/FOLLOW, real refuge paths and replay truth unchanged.
5. **R5.5 fixture-based quiet observations**: Selected relaxed armed occupants inspect a real nearby same-room fixture, gaze in its direction, dwell and optionally take existing physically swept routes. Existing armed `observe` pose shows a mild head cue. No fake seated, unarmed, working or conversing actor.

## Protected invariants
- All enemy knowledge derives from personally perceived sight/sound, uncertain memory and actually delivered physical reports.
- All travel, cover choice, weapon posture, firing and door handling use existing simulation physics.
- No forced firefight, autonomous player squad order, gameplay camera action or extra simulation/renderer scheduler.
- Deterministic commitments and scheduled nonurgent route work, with a bounded candidate count and no per-frame new A*.
- Civilian mission state, injury, rescue and replay compatibility remain stable.

## Required release gates
- [ ] New R5.1–R5.5 focused tests, core sound/awareness/morale and civilian fear tests.
- [ ] Production Node/TypeScript build, architecture, mission correctness, replay and movement tests.
- [ ] Real WebGL tactical phone/desktop, replay/bodycam and Operator Lab acceptance on final exact head.
- [ ] Previous Pages successfully completed and served current main SHA; queue clear.
- [ ] Single PR merge to main and exact Pages served-SHA validation.
- [ ] Manual physical iPhone Safari encounters: quiet population, real auditory evidence, neighboring guards, mission-specific hold, civilian caution/panic, replay.

## Honest acceptance boundary
Passing CI demonstrates contract correctness, physical simulator regressions and browser acceptance; it does not independently establish subjective encounter quality. The optional 20-second deterministic behavioral survey is an observation tool, not scripted success. No spontaneous human interaction is falsely claimed without corresponding runtime expression.
