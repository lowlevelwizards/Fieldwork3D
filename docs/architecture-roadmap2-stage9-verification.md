# Roadmap 2 — Stage 9: Enemy AI Decision Architecture

## Objective and baseline
Complete the previous acoustic / visual evidence partial extractions by moving enemy tactical decisions and physically delivered reports out of `breach-game.ts`. Preserve the authoritative 60 Hz session clock, existing deterministic operation ordering, simulation evidence, collision/nav authority, firing lanes, and replay history.

## Ownership after extraction
- `breach-visual-acquisition.ts`: fixed-step acquisition progress and independent direct visual observations. LOS predicate stays game-owned and physical.
- `breach-ai-visual-evidence.ts` / `breach-ai-acoustic-perception.ts`: existing source-specific suspicion and hearing evidence.
- `breach-ai-reconciliation.ts`, `breach-ai-policy.ts`, `breach-ai-*-response.ts`: pre-existing pure or focused tactical policies remain authoritative; do not duplicate their logic.
- `breach-enemy-decision-controller.ts`: evidence response orchestration, intent selection, reaction latency, cover and move commitments, search, routines, report delivery, and local team assignments.
- `breach-game.ts`: fixed simulation scheduling, authoritative LOS and geometry, gun-clearance movement, physical motor/route cache, events, and exported world/session contracts.

## Invariants
1. No hidden blue positions or telepathic warning reports. Contacts are individually observed or physically reported and retain uncertainty.
2. No second AI clock, tick, random generator, or immediate navigation from low-quality evidence.
3. Exactly the same encounter reaction, willingness to retreat/surrender, credible cover/approach, bounded search candidate expansion, and door interaction rules.
4. AI movement still goes through `advanceActorMotor`, existing verified route/door gates and `requestClearFireStep`. No direct movement teleport.
5. Preserve visibility/fog disclosure and replay truth.
6. One `AiWorkScheduler` per session for bounded elective decisions, no starvation or unbounded all-pairs search.
7. Player-authored orders, Quick Play/Campaign lifecycle and user pacing are unchanged.

## Focused acceptance gates
- TypeScript production build `npm run build`.
- Live seeded 60 Hz deterministic scenario and frozen combat/door/medical/civilian outcome baselines in `breach-roadmap2-stage1-contracts.test.mjs`.
- `breach-roadmap2-stage9-enemy-ai.test.mjs` for extraction ownership, evidence boundaries and no second clock.
- Existing awareness, coordination, suspicion, search, retreat, replay and AI-scheduler tests.
- CI critical integration and simulation budget, verifying latest **head commit**, not an obsolete earlier run.

## Deployment
Keep Stage 9 in a draft PR until the focused checks pass and main/Pages release baseline is safe. Do not queue a new production deployment while another is active; compare Pages with the expected published main commit before releasing.
