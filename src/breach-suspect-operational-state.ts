/** D15.2: operational threat and target resolution are not synonyms for
 * physical health. A living, voluntarily submitted suspect must not fire,
 * be auto-targeted, hold a contested position or block a capture objective.
 *
 * This policy does not itself produce living submission or physical custody.
 * Legacy D9 surrendered/down actors continue to resolve identically.
 */
import type {TeamActor} from './breach-game.ts';

export type CombatantState=Pick<TeamActor,'health'|'surrendered'>;
export type HostileState=CombatantState&Pick<TeamActor,'side'>;

/** Never permits firing at or by an actor whose surrender is recorded. */
export function activeCombatant(actor:CombatantState):boolean{
 return Number.isFinite(actor.health)&&actor.health>0&&actor.surrendered!==true;
}
/** Only a specific hostile target can satisfy an existing capture objective. */
export function captureTargetResolved(actor:HostileState):boolean{
 return actor.side==='red'&&Number.isFinite(actor.health)&&
  (actor.health<=0||actor.surrendered===true);
}
