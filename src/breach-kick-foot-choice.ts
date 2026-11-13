/** A3.9-K1: deterministic kicking-leg choice. The authoritative door
 * impulse, character motor, planted footstep owner and damage are unchanged.
 */
import {doorLeafSegment,pointToSegment,type Door,type Pt}
 from './breach-core.ts';
import {sessionWorldGeometry} from './breach-world-context.ts';
import type {Session,TeamActor} from './breach-game.ts';
export type KickFoot=0|1;
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const shoe=(p:Pt,h:number,foot:KickFoot):Pt=>{
 const side=foot===0?-1:1;
 return {x:p.x-Math.sin(h)*side*5.6,
   y:p.y+Math.cos(h)*side*5.6};
};
export function kickFootChoice(
 position:Pt,heading:number,target:Pt,
 clear:(foot:KickFoot,starting:Pt,support:Pt,target:Pt)=>boolean
):KickFoot|null{
 const candidates=([0,1] as const).map(index=>{
  const from=shoe(position,heading,index);
  const support=shoe(position,heading,index===0?1:0);
  return {index,distance:distance(from,target),from,support};
 }).filter(x=>x.distance<24.5&&
   clear(x.index,x.from,x.support,target));
 candidates.sort((a,b)=>a.distance-b.distance||b.index-a.index);
 return candidates[0]?.index??null;
}
export function selectActualKickFoot(
 s:Session,a:TeamActor,d:Door):KickFoot|null{
 if(a.health<=0||a.traversal||a.squeeze||a.pace==='run')
  return null;
 const leaf=doorLeafSegment(d);
 const target={x:leaf.a.x+(leaf.b.x-leaf.a.x)*.78,
   y:leaf.a.y+(leaf.b.y-leaf.a.y)*.78};
 const world=sessionWorldGeometry(s);
 return kickFootChoice(a.p,a.heading,target,(_foot,from,support,to)=>{
  if(!world.passable(support,2.5))return false;
  if(s.doors.some(other=>other.id!==d.id&&
     pointToSegment(support,doorLeafSegment(other))<3))return false;
  if(world.staticWallBlocksRay({a:from,b:to}))return false;
  return !s.operators.some(peer=>peer!==a&&peer.health>0&&
      distance(peer.p,support)<8) &&
    !s.civilians.some(peer=>peer.health>0&&
      distance(peer.p,support)<8);
 });
}
