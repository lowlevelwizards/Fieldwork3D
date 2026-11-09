/** AI's confirmed visual evidence intake, not a hidden world query.
 * One contact impulse per acquisition; sustained direct sight keeps alert
 * pressure current without manufacturing new independent observations.
 */
import type {Session,TeamActor} from './breach-game.ts';
import {observeSuspicion,advanceSuspicion,maintainVisualContact}
 from './breach-ai-suspicion.ts';
import {encounterReactionDelay} from './breach-encounter-readiness.ts';
export function scanEnemyVisualEvidence(s:Session,a:TeamActor,dt:number,
 inSight:(observer:TeamActor,target:TeamActor,s:Session)=>boolean
):TeamActor[]{
 const visible=s.operators.filter(b=>b.side==='blue'&&inSight(a,b,s));
 const visualId=visible[0]?.id??null;
 if(visualId!==a.lastVisualSuspicionId){
  a.lastVisualSuspicionId=visualId;
  if(visualId)observeSuspicion(a.suspicion,{
   id:'visual/'+visualId+'/'+Math.round(s.seconds*60),
   at:s.seconds,kind:'contact',cause:'confirmed-sight'
  });
 }
 advanceSuspicion(a.suspicion,s.seconds,dt,
  a.alert==='investigating'&&!!a.contact);
 if(visualId)maintainVisualContact(a.suspicion,s.seconds);
 if(visible.length&&a.encounterReactionUntil===Number.POSITIVE_INFINITY){
  a.encounterReactionStartedAt=s.seconds;
  a.encounterReactionUntil=s.seconds+encounterReactionDelay(
   a.encounterReadiness??'attentive',a.id);
 }
 return visible;
}
