/** Shared NPC lifecycle transitions. Evidence memory stays separate;
 * these helpers own transient tasks, not perception or weapon permissions. */
import type {TeamActor} from './breach-game.ts';
import type {Pt} from './breach-core.ts';
export function clearNpcSearch(a:TeamActor):void{
 a.searchOrigin=null;a.searchQueue=[];a.searchPauseUntil=0;
}
export function clearNpcCoordination(a:TeamActor):void{
 a.coordinationRole=null;a.coordinationUntil=0;
}
export function commitNpcWithdrawal(a:TeamActor,point:Pt,now:number):void{
 clearNpcSearch(a);clearNpcCoordination(a);
 a.defense=null;a.retreatPoint={...point};a.alert='retreat';
 a.nav=[];a.defenseUntil=now+3;
}
export function clearNpcTasks(a:TeamActor):void{
 clearNpcSearch(a);clearNpcCoordination(a);
 a.contact=null;a.heard=null;a.contacted=false;a.watch=null;
 a.retreatPoint=null;a.defense=null;a.nav=[];a.alert='idle';
}
