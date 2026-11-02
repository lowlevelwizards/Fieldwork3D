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
  const relevant=actors.filter(a=>seeksPassage(a,cluster)&&a.blockedTime<1.5);
  if(!relevant.length)continue;
  const occupant=relevant.find(a=>insidePassage(a,cluster));
  const current=leases?.[key];
  const leased=current&&now<current.until&&relevant.some(a=>a.id===current.actorId);
  // A person between two leaves must leave before an outsider enters.
  const owner=occupant?.id??(leased?current!.actorId:relevant[0].id);
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
  if(clearance>18)return 0;
  return (0.5+progress*1.2)*(1-clearance/22);
}
