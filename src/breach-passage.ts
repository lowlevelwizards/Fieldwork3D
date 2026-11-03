/** Build 147: deterministic narrow-aperture right-of-way. The player's
 * queued orders never change: only execution can temporarily defer. */
import {doorCenter,doorLeafSegment,pointToSegment,
  type Door,type Pt,type Side} from './breach-core.ts';
export type PassageActor={id:string;p:Pt;goal:Pt|null;health:number;
  blockedTime:number;active:boolean;side?:Side};
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const side=(p:Pt,d:Door)=>{
  const m=doorCenter(d),dx=d.b.x-d.a.x,dy=d.b.y-d.a.y;
  const width=Math.max(1,Math.hypot(dx,dy));
  return ((p.x-m.x)*-dy+(p.y-m.y)*dx)/width;
};
/** The center is on the actual passage plane, not necessarily centered on
 * the swing leaf. A crossing actor must finish with their body behind it. */
const inDoorway=(actor:PassageActor,d:Door)=>{
  const width=distance(d.a,d.b)||1;
  const along=((actor.p.x-d.a.x)*(d.b.x-d.a.x)+
    (actor.p.y-d.a.y)*(d.b.y-d.a.y))/width;
  return along>=-6&&along<=width+6&&Math.abs(side(actor.p,d))<14;
};
export function crossingDoor(a:PassageActor,d:Door){
  if(!a.active||a.health<=0||!a.goal)return false;
  // Acquire the lane while approaching, but don't reserve a far-away door.
  if(distance(a.p,doorCenter(d))>66)return false;
  const from=side(a.p,d),goal=side(a.goal,d);
  // Both endpoints on the same side are not a doorway crossing.
  // Once actually inside, retain priority until the body has exited.
  return from*goal<0||
    (inDoorway(a,d)&&Math.abs(goal)>Math.abs(from)+5);
}
/** Nearest *active* approach wins the first claim. Queue order stays stable
 * while the lease is owned, so who is first in the squad array is irrelevant. */
export function passageOwner(d:Door,actors:readonly PassageActor[]){
  const eligible=actors.filter(a=>crossingDoor(a,d)&&a.blockedTime<1.5);
  const inside=eligible.filter(a=>inDoorway(a,d));
  const pool=inside.length?inside:eligible;
  return [...pool].sort((a,b)=>
    distance(a.p,doorCenter(d))-distance(b.p,doorCenter(d))||
    a.id.localeCompare(b.id))[0]?.id??null;
}
/** A real threshold is occupied until its owner clears, not until the
 * opposite actor happens to become one step closer. Author orders are intact.
 */
export type PassageLease={actorId:string;until:number};
/** Identify short aligned two-door passages, not unrelated nearby rooms.
 * One reservation covers the space between leaves as well as both entries. */
function passageCluster(door:Door,all:readonly Door[]):Door[]{
 if(distance(door.a,door.b)>60)return [door];
 const center=doorCenter(door);
 const tangent={x:(door.b.x-door.a.x)/Math.max(1,distance(door.a,door.b)),
   y:(door.b.y-door.a.y)/Math.max(1,distance(door.a,door.b))};
 const connected=all.filter(other=>{
  if(other===door||distance(other.a,other.b)>60)return false;
  const delta={x:doorCenter(other).x-center.x,y:doorCenter(other).y-center.y};
  const gap=Math.hypot(delta.x,delta.y);
  if(gap<27||gap>135)return false;
  const otherT={x:(other.b.x-other.a.x)/Math.max(1,distance(other.a,other.b)),
    y:(other.b.y-other.a.y)/Math.max(1,distance(other.a,other.b))};
  const parallel=Math.abs(tangent.x*otherT.x+tangent.y*otherT.y)>.88;
  const sideOffset=Math.abs(tangent.x*delta.x+tangent.y*delta.y);
  return parallel&&sideOffset<20;
 });
 return [door,...connected].sort((a,b)=>a.id.localeCompare(b.id));
}
/** Actors occupying a vestibule have right-of-way to finish leaving.
 * Do not let an approaching teammate reserve the other door against them. */
function insidePassage(actor:PassageActor,cluster:readonly Door[]):boolean{
 if(cluster.length<2||!actor.active||actor.health<=0||!actor.goal)return false;
 const first=doorCenter(cluster[0]),last=doorCenter(cluster[cluster.length-1]);
 const dx=last.x-first.x,dy=last.y-first.y,len=Math.hypot(dx,dy);
 if(len<25)return false;
 const ox=actor.p.x-first.x,oy=actor.p.y-first.y;
 const along=(ox*dx+oy*dy)/len;
 const across=Math.abs(ox*dy-oy*dx)/len;
 return along>5&&along<len-5&&across<
  Math.min(...cluster.map(d=>distance(d.a,d.b)))/2+9;
}
function seeksPassage(actor:PassageActor,cluster:readonly Door[]):boolean{
 return cluster.some(d=>crossingDoor(actor,d))||insidePassage(actor,cluster);
}
export function passageWait(actor:PassageActor,doors:readonly Door[],
  actors:readonly PassageActor[],
  leases?:Record<string,PassageLease>,now=0):boolean{
 const seen=new Set<string>();
 for(const door of doors){
  // Wide shutters permit several independent lanes.
  if(distance(door.a,door.b)>60)continue;
  const cluster=passageCluster(door,doors);
  const key=cluster.length===1?door.id:
    'zone:'+cluster.map(d=>d.id).join('+');
  if(seen.has(key))continue;seen.add(key);
  if(!seeksPassage(actor,cluster))continue;
  // Opposing sides are handled by combat and solid enemy collision, not
  // the friendly traffic queue. A hostile must not reserve our squad lane.
  const relevant=actors.filter(a=>
    (!actor.side||!a.side||actor.side===a.side)&&
    seeksPassage(a,cluster)&&a.blockedTime<1.5);
  if(!relevant.length){
    if(leases)delete leases[key];
    continue;
  }
  // Physically inside beats someone approaching from either direction.
  // Once past the 14-unit shoulder-clearance plane, the next queued unit
  // may enter even though the previous unit is still near the doorway.
  const occupant=relevant.filter(a=>insidePassage(a,cluster)||
    cluster.some(d=>inDoorway(a,d))).sort((a,b)=>
      Math.min(...cluster.map(d=>distance(a.p,doorCenter(d))))-
      Math.min(...cluster.map(d=>distance(b.p,doorCenter(d))))||
      a.id.localeCompare(b.id))[0];
  const current=leases?.[key];
  const leased=current&&now<current.until&&
    relevant.some(a=>a.id===current.actorId);
  const nearest=[...relevant].sort((a,b)=>
    Math.min(...cluster.map(d=>distance(a.p,doorCenter(d))))-
    Math.min(...cluster.map(d=>distance(b.p,doorCenter(d))))||
    a.id.localeCompare(b.id))[0];
  // Active owner keeps priority, except an actor physically inside has
  // priority to exit. A WAIT or stopped task is not a crossing contender.
  const owner=occupant?.id??(leased?current!.actorId:nearest.id);
  if(leases)leases[key]={actorId:owner,until:now+.38};
  if(owner!==actor.id)return true;
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
  if(clearance>24)return 0;
  return (0.5+progress*1.2)*(1-clearance/22);
}
