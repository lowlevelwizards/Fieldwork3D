/** Bounded projectile impact evidence for rendering and replay.
 * Authoritative hits are resolved elsewhere; presentation evidence must
 * not grow unbounded in long rounds.
 */
import type {ImpactMark,Session} from './breach-game.ts';
import {IMPACT_MARK_LIMIT,BLOOD_MARK_LIMIT} from './breach-effects.ts';
import type {Segment} from './breach-core.ts';
import {confinedGroundRadius} from './breach-ground-geometry.ts';
export function retainImpactMark(s:Pick<Session,'impactMarks'>,mark:ImpactMark,walls:readonly Segment[]=[]):void{
 // The final stop may already be represented by its committed material event.
 if(mark.surfaceRef&&mark.shotId!==undefined&&s.impactMarks.some(other=>
   other.shotId===mark.shotId&&other.surfaceRef?.kind===mark.surfaceRef?.kind&&
   other.surfaceRef?.index===mark.surfaceRef?.index&&other.surfaceRef?.ownerId===mark.surfaceRef?.ownerId&&
   Math.hypot(other.p.x-mark.p.x,other.p.y-mark.p.y)<.01))return;
 if(mark.surface==='blood'){
  const kind=mark.bloodKind??'splat';
  const existing=s.impactMarks.find(other=>{
   if(other.surface!=='blood'||(other.bloodKind??'splat')!==kind||
     kind==='pool'&&other.bloodOwnerId!==mark.bloodOwnerId)return false;
   const distance=Math.hypot(other.p.x-mark.p.x,other.p.y-mark.p.y);
   return distance<6&&confinedGroundRadius(other.p,distance,walls)>=distance-.001;
  });
  if(existing){
   const amount=Math.min(16,(existing.bloodAmount??1)+(mark.bloodAmount??1));
   if(amount!==(existing.bloodAmount??1)){existing.bloodAmount=amount;existing.age=0;}
   return;
  }
  const blood=s.impactMarks.filter(other=>other.surface==='blood');
  if(blood.length>=BLOOD_MARK_LIMIT){
   const oldest=s.impactMarks.findIndex(other=>other.surface==='blood');
   if(oldest>=0)s.impactMarks.splice(oldest,1);
  }
 }
 s.impactMarks.push(mark);
 while(s.impactMarks.length>IMPACT_MARK_LIMIT){
  const other=s.impactMarks.findIndex(m=>m.surface!=='blood');
  s.impactMarks.splice(other<0?0:other,1);
 }
}
