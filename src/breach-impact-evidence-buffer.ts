/** Bounded projectile impact evidence for rendering and replay.
 * Authoritative hits are resolved elsewhere; presentation evidence must
 * not grow unbounded in long rounds.
 */
import type {ImpactMark,Session} from './breach-game.ts';
import {IMPACT_MARK_LIMIT,BLOOD_MARK_LIMIT} from './breach-effects.ts';
export function retainImpactMark(s:Pick<Session,'impactMarks'>,mark:ImpactMark):void{
 // The final stop may already be represented by its committed material event.
 if(mark.surfaceRef&&mark.shotId!==undefined&&s.impactMarks.some(other=>
   other.shotId===mark.shotId&&other.surfaceRef?.kind===mark.surfaceRef?.kind&&
   other.surfaceRef?.index===mark.surfaceRef?.index&&other.surfaceRef?.ownerId===mark.surfaceRef?.ownerId&&
   Math.hypot(other.p.x-mark.p.x,other.p.y-mark.p.y)<.01))return;
 if(mark.surface==='blood'){
  const existing=s.impactMarks.find(other=>other.surface==='blood'&&
   Math.hypot(other.p.x-mark.p.x,other.p.y-mark.p.y)<6);
  if(existing){existing.age=0;return;}
  const blood=s.impactMarks.filter(other=>other.surface==='blood');
  if(blood.length>=BLOOD_MARK_LIMIT){
   const oldest=s.impactMarks.findIndex(other=>other.surface==='blood');
   if(oldest>=0)s.impactMarks.splice(oldest,1);
  }
 }
 s.impactMarks.push(mark);
 if(s.impactMarks.length>IMPACT_MARK_LIMIT)
  s.impactMarks.splice(0,s.impactMarks.length-IMPACT_MARK_LIMIT);
}
