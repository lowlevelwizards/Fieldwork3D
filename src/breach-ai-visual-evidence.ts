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
 // One roster scan computes the exact same confirmed list and first
 // detectable shape. Progress is owned by the fixed-step visual phase.
 const visible:TeamActor[]=[];
 let glimpse:TeamActor|null=null;
 for(const b of s.operators){
  if(b.side!=='blue')continue;
  if(inSight(a,b,s))visible.push(b);
  if(glimpse===null&&detectedSight(
    a.awareness.visualProgress[b.id]??0))glimpse=b;
 }
 const visualId=visible[0]?.id??null;
 // An unconfirmed person can make a guard curious, but cannot create a
 // target belief, a hostile ID, a squad report or permission to shoot.
 const observation=visualId?visualId:
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
  // Only a directly confirmed actor may set this initial reaction
  // clock; unidentified silhouettes cannot accelerate or delay a shot.
  const first=visible[0];
  a.encounterReactionUntil=s.seconds+encounterReactionDelay(
   a.encounterReadiness??'attentive',a.id,
   Math.hypot(first.p.x-a.p.x,first.p.y-a.p.y));
 }
 return visible;
}
