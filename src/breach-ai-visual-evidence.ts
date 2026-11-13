/** AI's confirmed visual evidence intake, not a hidden world query.
 * One contact impulse per acquisition; sustained direct sight keeps alert
 * pressure current without manufacturing new independent observations.
 */
import type {Session,TeamActor} from './breach-game.ts';
import {observeSuspicion,advanceSuspicion,maintainVisualContact}
 from './breach-ai-suspicion.ts';
import {encounterReactionDelay} from './breach-encounter-readiness.ts';
import {detectedSight} from './breach-visual-perception.ts';
export function scanEnemyVisualEvidence(s:Session,a:TeamActor,dt:number,
 inSight:(observer:TeamActor,target:TeamActor,s:Session)=>boolean
):TeamActor[]{
 const visible=s.operators.filter(b=>b.side==='blue'&&inSight(a,b,s));
 const visualId=visible[0]?.id??null;
 // Progress was accumulated only from physical, facing-valid optical LOS.
 // An unconfirmed person can make a guard curious, but cannot create a
 // target belief, a hostile ID, a squad report or permission to shoot.
 const glimpse=visualId?null:s.operators.find(b=>b.side==='blue'&&
   detectedSight(a.awareness.visualProgress[b.id]??0));
 const observation=visualId?'identified/'+visualId:
   glimpse?'silhouette/'+glimpse.id:null;
 if(observation!==a.lastVisualSuspicionId){
  a.lastVisualSuspicionId=observation;
  if(visualId)observeSuspicion(a.suspicion,{
   id:'visual/'+visualId+'/'+Math.round(s.seconds*60),
   at:s.seconds,kind:'contact',cause:'confirmed-sight'
  });
  else if(glimpse)observeSuspicion(a.suspicion,{
   id:'glimpse/'+glimpse.id+'/'+Math.round(s.seconds*60),
   at:s.seconds,kind:'orient',cause:'unidentified-silhouette'
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
