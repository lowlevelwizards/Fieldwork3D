/** Awareness decay is an authoritative observation-phase write.
 * It never uses replay/renderer knowledge; each actor disproves only an
 * estimated contact position that they could physically observe.
 */
import {angleDifference,length,targetAngle} from './breach-plan.ts';
import {ageAwareness,clearObservedPosition} from './breach-awareness.ts';
import type {Pt} from './breach-core.ts';
import type {Session} from './breach-game.ts';
const d=length,angle=targetAngle;
export type BeliefSightTest=(from:Pt,to:Pt,s:Session,lowBlocks:boolean)=>boolean;
export function advanceBeliefAgingPhase(s:Session,h:number,
  unobstructed:BeliefSightTest):void{
  for(const actor of s.operators){
    if(actor.health<=0)continue;
    ageAwareness(actor.awareness,h,s.seconds);
    for(const belief of Object.values(actor.awareness.contacts)){
      // Only direct vision of the *estimated floor position* can disprove it.
      if((actor.awareness.visualProgress[belief.id]??0)>.95)continue;
      if(s.seconds-belief.lastAt<.65||d(actor.p,belief.estimate)>235)continue;
      if(Math.abs(angleDifference(actor.heading,angle(actor.p,belief.estimate)))>.90)continue;
      if(unobstructed(actor.p,belief.estimate,s,actor.posture==='crouch'))
        clearObservedPosition(actor.awareness,belief.id);
    }
  }
}
