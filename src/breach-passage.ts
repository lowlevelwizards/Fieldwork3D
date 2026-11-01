/** Build 147: deterministic narrow-aperture right-of-way. The player's
 * queued orders never change: only execution can temporarily defer. */
import {doorCenter,doorLeafSegment,pointToSegment,
  type Door,type Pt} from './breach-core.ts';
export type PassageActor={id:string;p:Pt;goal:Pt|null;health:number;
  blockedTime:number;active:boolean};
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const side=(p:Pt,d:Door)=>{
  const m=doorCenter(d),dx=d.b.x-d.a.x,dy=d.b.y-d.a.y;
  return (p.x-m.x)*-dy+(p.y-m.y)*dx;
};
export function crossingDoor(a:PassageActor,d:Door){
  if(!a.active||a.health<=0||!a.goal)return false;
  if(distance(a.p,doorCenter(d))>42)return false;
  const s=side(a.p,d),g=side(a.goal,d);
  return Math.abs(s)<9||s*g<0;
}
export function passageOwner(d:Door,actors:readonly PassageActor[]){
  const eligible=actors.filter(a=>crossingDoor(a,d)&&a.blockedTime<1.5);
  // Stable actor order breaks symmetry. Never use render time or random
  // scores here: the order remains deterministic through pause/replay.
  return eligible[0]?.id??null;
}
/** A real threshold is occupied until its owner clears, not until the
 * opposite actor happens to become one step closer. Author orders are intact.
 */
export type PassageLease={actorId:string;until:number};
export function passageWait(actor:PassageActor,doors:readonly Door[],
  actors:readonly PassageActor[],
  leases?:Record<string,PassageLease>,now=0):boolean{
  for(const d of doors){
    // Wide industrial shutters have space for two independent lanes.
    if(distance(d.a,d.b)>60)continue;
    if(!crossingDoor(actor,d))continue;
    const current=leases?.[d.id];
    const stillCrossing=current&&actors.some(a=>
      a.id===current.actorId&&crossingDoor(a,d));
    const owner=stillCrossing&&now<current!.until?
      current!.actorId:passageOwner(d,actors);
    if(leases&&owner)
      leases[d.id]={actorId:owner,until:now+.38};
    if(owner&&owner!==actor.id)return true;
  }
  return false;
}
/** More leverage near a latch than a hinge; the hinge motor still owns its
 * actual acceleration and collision stops against walls or furniture. */
export function doorContactImpulse(d:Door,point:Pt){
  const leaf=doorLeafSegment(d),length=distance(leaf.a,leaf.b)||1;
  const dx=leaf.b.x-leaf.a.x,dy=leaf.b.y-leaf.a.y;
  const progress=Math.max(0,Math.min(1,(
    (point.x-leaf.a.x)*dx+(point.y-leaf.a.y)*dy)/(length*length)));
  const clearance=pointToSegment(point,leaf);
  if(clearance>18)return 0;
  return (0.5+progress*1.2)*(1-clearance/22);
}
