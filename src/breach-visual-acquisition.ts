/** Roadmap 2 / Stage 9: authoritative fixed-step visual acquisition and
 * personally observed sight evidence. Both sides use the exact same LOS
 * contract; contact belief is never inferred from presentation fog.
 */
import {length} from './breach-core.ts';
import {angleDifference} from './breach-plan.ts';
import {visualGain,advanceSight} from './breach-visual-perception.ts';
import {actorLightingLevels,lightVisibilityGain} from './equipment-sight-lighting.ts';
import {perceptualReadiness} from './breach-encounter-readiness.ts';
import {addObservation,visibleObservation} from './breach-awareness.ts';
import type {Session,TeamActor} from './breach-game.ts';
type SightTest=(observer:TeamActor,target:TeamActor,session:Session)=>boolean;
const d=length;

export function advanceActorSightProgress(s:Session,dt:number,geometricallyVisible:SightTest){
 // One scene sample per simulation-time bucket, never one raycast per sight pair.
 const lighting=actorLightingLevels(s);
 for(const observer of s.operators){
  if(observer.health<=0)continue;
  for(const subject of s.operators){
   if(subject.side===observer.side||subject.health<=0)continue;
   const visible=geometricallyVisible(observer,subject,s);
   const signal=visible?visualGain(d(observer.p,subject.p),
    angleDifference(observer.heading,angle(observer.p,subject.p)),
    subject.velocity>10,subject.posture==='crouch')*
    lightVisibilityGain(lighting.get(subject.id)??1)*
    (subject.weaponLightOn&&subject.weaponConfiguration?.slots.light==='light-compact'?1.18:1)*
    (observer.side==='red'?perceptualReadiness(
      observer.encounterReadiness??'attentive'):1):0;
   const old=observer.awareness.visualProgress[subject.id]??0;
   observer.awareness.visualProgress[subject.id]=advanceSight(old,dt,signal,visible);
  }
 }
}

/** Each actor keeps its own direct observations; no team-shared enemy truth.
 * Observation cadence remains the historical ten times per second.
 */
export function observeActorContactEvidence(s:Session,inSight:SightTest):void{

  // Every actor receives independent sightings; this never shares enemy truth.
  if(s.seconds===0||Math.floor(s.seconds*10)!==Math.floor((s.seconds-1/60)*10))
    for(const observer of s.operators){
      if(observer.health<=0)continue;
      for(const subject of s.operators){
        if(subject.side===observer.side||!inSight(observer,subject,s))continue;
        addObservation(observer.awareness,visibleObservation(
          observer.id,subject.id,subject.p,s.seconds));
      }
    }
}
