# D15.5 Suspect escort — staged workstream

Base: production `80f9b45cda2f439cf299b7485f454218f97fbe15`. Branch `feature/d15-5-suspect-escort-20261120`.

## D15.5A — committed
Extract common **pure physical follower policy** from existing civilian mission
helpers into `breach-follow-physical-policy.ts`. Civilian API remains
unchanged; shared leader-corridor goal, separated-by-distance and ordinary
walk pacing are now available to living restrained suspects. No second motor.
Focused tests prove old civilian decisions and new policy match.

## D15.5B — next
Add a real `escort-suspect` and `stop-escorting-suspect` player-authored
PlanNode and context selection. The GO-time action must establish actual
leader ownership only when a living restrained person hears the command.
A held, surrendered unrestrained subject must never be silently treated as
secure custody.

## D15.5C — next
Advance a compliant suspect through existing TeamActor `advanceActorMotor`
in the fixed actor phase, before the non-combatant early return; never
change side to neutral, never fabricate waypoints in player-authored plans.
Use real clearance and the existing shared motion arbiter, route retries,
door openings and bounded 0.55s target updates. Preserve STOP at exact
location and separation/leader casualty rules.

## D15.5D — next
Integrate pace scaling, visible prisoner follow state, shared walking with
restrained hands, and replay restoration. Full CAPTURE requires target
presence at extraction, and incapacitated living target transport remains
a separate physically verified follow-on.

Stage commits use [skip ci]. Do not merge R2 until physically integrated
with TypeScript, targeted real GO tests, M3/M4 and archival replay green,
and the previous Pages deployment verified.
