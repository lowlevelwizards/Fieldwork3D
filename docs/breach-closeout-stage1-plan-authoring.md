# Closeout Stage 1 — plan-authoring ownership

## Completion contract

Stage 1 closes the pending Roadmaps 3/4 authored-plan ownership work without
changing live-motor rules, combat, animation, scene rendering, timing, or tactical
UI semantics. Acceptance is **one committed user command = one coherent undo
step**, including all affected squad members; all planning forecasts must
depend on *discovered* architecture, not secret world geometry.

## Before / after authority

| Responsibility | Authoritative home |
| --- | --- |
| Persistent orders, clone, history schema | `breach-plan.ts` |
| Planner transaction, control snapshots, rollback, undo/redo | `breach-plan-authoring.ts` |
| Squad multi-actor atomic transaction | `breach-plan-authoring.ts` via `atomicTeamEdit` |
| PIE preview, door staging, edited route verification | `breach-plan-authoring.ts` with known intel |
| Command-specific legality and semantic verbs | `breach-game.ts` delegates every authored plan write through `edit` or `atomicTeamEdit` |
| Gesture ownership and pointer cancellation | `breach-pointer-command-controller.ts` (unchanged) |
| Knowledge / fog discovery | `breach-intel.ts` and visibility domain (unchanged) |
| Actual collision, movement, throw and execution | Session world, motor, order executor, `breach-flash.ts` (unchanged) |
| Replay | Immutable copied authored plan and recorded knowledge (unchanged) |

`Session` remains the only authority for ticking at 60 Hz. The plan author
does not advance, perceive, or resolve physical outcomes.

## Transaction / lifecycle invariants

- A rejected edit and a no-op consume no IDs and add no history; mutations are
  permitted only while `s.phase === 'planning'`.
- One route edit, HERE stroke with implicit portal orders, and each contextual
  command are individually undoable. Derived motor navigation is never the
  authored plan.
- Base posture, pace, fire policy, contact-stop and executed WATCH intent now
  have aligned before/after snapshots on the same undo stack as plan nodes.
  Base-only edits never restart movement or clear transient motor state.
- `planSync`, `planStackTeam` and `planSquadEntry` commit through a
  session-level atomic team transaction. If a participant rejects a command,
  all participants' plans, histories, IDs and timing state roll back.
- BACK, DELETE, CLEAR and HERE route replacement remove any linked SYNC
  across teammates in the **same** transaction. Undo/redo restores or removes
  that link together.
- Group undo/redo validates exact plan/control state and history depth so
  unrelated later edits cannot accidentally replay the wrong transaction.
- Starting GO discards the old editing timeline. Pausing afterward cannot
  resurrect orders consumed by the execution engine. New sessions and
  deployments begin with empty fresh history.
- Previews use `s.intel` for known walls, cover, door memory, PIE validity
  and flash placement. Hidden geometry may still stop physical execution;
  it is never consulted to accept, clip, or reject a speculative order.

## Deliberate compatibility boundary

Existing exported command functions in `breach-game.ts` remain the stable
public API for the tactical HUD, gesture controller, mission tools and tests.
Their shared plan/controls/history writer is now `breach-plan-authoring.ts`.
Separating semantic command dispatch into another module is optional cleanup,
not a new source of plan truth.

Physical `doorApproach`, `validPieArc`, `validateThrow` and world routing
remain available to the simulation and legacy previews; a planning-only
knowledge-aware path is used for tactical authoring. Do not replace execution
collision tests with intel-based ones.

## Closeout acceptance evidence

Dedicated `Closeout Stage 1` branch gate runs:
- new Stage 1 authored controls, WATCH, SYNC and knowledge tests
- existing route stroke, safe clipping, LOOK/WATCH, PIE, squad-entry and FOW tests
- Roadmap 2 deterministic 60 Hz, session-world isolation and replay coverage
- architecture structural checks, TypeScript and production build
- predecessor GitHub Pages release checkpoint

Final merge and production verification require the GitHub Actions Pages job
to finish successfully, *including* verification that the expected stamped
build is actually being served. Running CI alone does not constitute deployment.
