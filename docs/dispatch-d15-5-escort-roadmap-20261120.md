# D15.5 Suspect escort — staged workstream

Base: production `80f9b45cda2f439cf299b7485f454218f97fbe15`. Branch `feature/d15-5-suspect-escort-20261120`.

## D15.5A — committed
Extract common **pure physical follower policy** from existing civilian mission
helpers into `breach-follow-physical-policy.ts`. Civilian API remains
unchanged; shared leader-corridor goal, separated-by-distance and ordinary
walk pacing are now available to living restrained suspects. No second motor.
Focused tests prove old civilian decisions and new policy match.

## D15.5B — committed player command and replay contract
- A GO-time voice order establishes/restores one exact suspect escort owner,
  or stops at the actual location. A person must already be living,
  surrendered and physically restrained. The plan does not change custody.
- Contextual ESCORT SUSPECT / STOP ESCORT show only eligible, heard subjects;
  replay samples retain leader and goal identity without creating a puppet.
- This commit deliberately does not yet move prisoners. D15.5C is required.

## D15.5B — next
Add a real `escort-suspect` and `stop-escorting-suspect` player-authored
PlanNode and context selection. The GO-time action must establish actual
leader ownership only when a living restrained person hears the command.
A held, surrendered unrestrained subject must never be silently treated as
secure custody.

## D15.5C — committed actual motor custody
- Fixed-tick living submitted actor phase now calls exactly the same existing
  `advanceActorMotor` as player/AI, gated by issued RESTRAINT + explicit ESCORT.
- Shared physical route goal samples no faster than 0.55s; STOP/leader death
  cancels without teleport, changes of allegiance or generated player orders.
- Only the escorting squad member slows ordinary walking; explicit RUN and
  entry movements retain their original authority.
- 3D restrained follow stands and walks with hands behind, 2D remains
  restrained; active custody has the same player-visible exception as civilian
  FOLLOW, replay-owned and absent in legacy films.
- Fixed-step and real-motor acceptance still required before merging R2.

## D15.5C — next
Advance a compliant suspect through existing TeamActor `advanceActorMotor`
in the fixed actor phase, before the non-combatant early return; never
change side to neutral, never fabricate waypoints in player-authored plans.
Use real clearance and the existing shared motion arbiter, route retries,
door openings and bounded 0.55s target updates. Preserve STOP at exact
location and separation/leader casualty rules.

## D15.5D — living capture extraction gate
- A living restrained CAPTURE target must actually be in the extraction zone,
  under an active escort or direct same-zone physical contact. A lone squadmate
  touching the extraction marker cannot teleport the prisoner or win early.
- Incapacitated target transport still needs a separate physical carrier path;
  legacy downed-target compatibility stays in place until that is proven.

## D15.5D — next
Integrate pace scaling, visible prisoner follow state, shared walking with
restrained hands, and replay restoration. Full CAPTURE requires target
presence at extraction, and incapacitated living target transport remains
a separate physically verified follow-on.

Stage commits use [skip ci]. Do not merge R2 until physically integrated
with TypeScript, targeted real GO tests, M3/M4 and archival replay green,
and the previous Pages deployment verified.
