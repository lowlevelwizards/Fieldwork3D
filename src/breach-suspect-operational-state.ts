/** D15.1 operational eligibility: life and hostile intent are not synonyms.
 * This read-only authority prepares living submission without changing D9 surrender
 * until the genuine weapon-release/pose checkpoint is ready to publish.
 */
import type {TeamActor} from './breach-game.ts';
export type CombatantState=Pick<TeamActor,'health'|'surrendered'>;
export type HostileState=CombatantState&Pick<TeamActor,'side'>;
export function activeCombatant(actor:CombatantState):boolean{
 return Number.isFinite(actor.health)&&actor.health>0&&actor.surrendered!==true;
}
/** Resolved target does not imply custody, restraint or extraction. */
export function captureTargetResolved(actor:HostileState):boolean{
 return actor.side==='red'&&Number.isFinite(actor.health)&&
   (actor.health<=0||actor.surrendered===true);
}
