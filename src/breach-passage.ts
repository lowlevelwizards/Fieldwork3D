/** Build 147: deterministic narrow-aperture right-of-way. The player's
 * queued orders never change: only execution can temporarily defer. */
import {doorCenter,doorLeafSegment,pointToSegment,OPERATOR_RADIUS,
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
  // Two side-by-side leaves are distinct passage lanes. Geometric
  // proximity to an adjacent leaf is not enough to reserve its opening.
  const width=distance(d.a,d.b)||1;
  const along=(p:Pt)=>((p.x-d.a.x)*(d.b.x-d.a.x)+
    (p.y-d.a.y)*(d.b.y-d.a.y))/width;
  const buffer=OPERATOR_RADIUS+4;
  const insideWidth=(p:Pt)=>{
    const x=along(p);
    return x>=-buffer&&x<=width+buffer;
  };
  if(!insideWidth(a.p)&&!insideWidth(a.goal))return false;
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
/** Paired leaves are two genuinely separate lanes. At the center seam a
 * shoulder can overlap both apertures; consistently assign that actor to
 * the nearer leaf, not two incompatible leases at once.
 */
function seeksPassage(actor:PassageActor,cluster:readonly Door[],
 all:readonly Door[]=cluster):boolean{
 return cluster.some(d=>{
  if(!crossingDoor(actor,d))return false;
  const partner=d.pairedWith?all.find(o=>o.id===d.pairedWith):undefined;
  if(!partner||!crossingDoor(actor,partner))return true;
  const own=distance(actor.p,doorCenter(d));
  const peer=distance(actor.p,doorCenter(partner));
  return own<peer-.01||(Math.abs(own-peer)<=.01&&
    d.id.localeCompare(partner.id)<0);
 })||insidePassage(actor,cluster);
}
/** Body-diameter spacing (16 units) plus a small visual buffer.
 * Followers can enter the throat as soon as the person ahead has advanced,
 * rather than waiting for that person to finish their room-side movement. */
export const PASSAGE_FOLLOW_GAP=20;
/** The waiting point is just outside the door, not at the start of the plan. */
export const PASSAGE_STACK_DEPTH=22;
const travelSign=(actor:PassageActor,door:Door):number=>{
 if(!actor.goal)return 0;
 const from=side(actor.p,door),toward=side(actor.goal,door);
 return Math.sign(toward-from);
};
const sameQueueLane=(a:PassageActor,b:PassageActor,door:Door):boolean=>{
 const dx=door.b.x-door.a.x,dy=door.b.y-door.a.y;
 const width=Math.hypot(dx,dy)||1;
 const lateral=Math.abs(((b.p.x-a.p.x)*dx+(b.p.y-a.p.y)*dy)/width);
 // Two independently authored lanes should not be serialized simply
 // because they share a relatively wide door. Body-width proximity, not
 // a percentage of door width, determines a shared moving queue.
 return lateral<19.5;
};
/** Dynamic convoy spacing: only a teammate physically ahead in the same
 * travel direction can hold the follower. This affects both single doors
 * and the middle of a long aligned two-door vestibule.
 * No authored route or friendly collision footprint is modified.
 */
function tooCloseToLeader(actor:PassageActor,others:readonly PassageActor[],
 cluster:readonly Door[],intendedStep?:Pt):boolean{
 for(const door of cluster){
  const heading=travelSign(actor,door);
  if(!heading)continue;
  for(const other of others){
   if(other.id===actor.id||!sameQueueLane(actor,other,door)||
      travelSign(other,door)!==heading)continue;
   const ahead=(side(other.p,door)-side(actor.p,door))*heading;
   if(ahead>.01){
    // Consider the whole intended tick, not only today's gap. Without
    // this a follower 21 units back may step 4 units into a 20-unit body
    // buffer, then oscillate while the leader rounds the doorway.
    const advance=intendedStep?
      (side(intendedStep,door)-side(actor.p,door))*heading:0;
    if(intendedStep&&advance<=.025)continue;
    if(ahead-Math.max(0,advance)<PASSAGE_FOLLOW_GAP)return true;
   }
  }
 }
 return false;
}
/** The exclusive lease is still meaningful for *opposing* streams. Let
 * everyone approach the threshold first, then stop the non-owner just
 * outside the mouth. People already moving out of the aperture must never
 * be frozen in it.
 */
function atOpposingEntry(actor:PassageActor,cluster:readonly Door[],
 intendedStep?:Pt):boolean{
 return cluster.some(door=>{
  const heading=travelSign(actor,door);
  if(!heading)return false;
  // A WAIT for counterflow must never forbid backing out or stepping
  // laterally to make room. Defer only attempted forward penetration.
  if(intendedStep&&
     (side(intendedStep,door)-side(actor.p,door))*heading<=.025)
    return false;
  const approach=side(actor.p,door)*heading;
  if(approach>0||approach<-PASSAGE_STACK_DEPTH)return false;
  const dx=door.b.x-door.a.x,dy=door.b.y-door.a.y;
  const length=Math.hypot(dx,dy)||1;
  const along=((actor.p.x-door.a.x)*dx+(actor.p.y-door.a.y)*dy)/length;
  return along>=-10&&along<=length+10;
 });
}
export function passageWait(actor:PassageActor,doors:readonly Door[],
  actors:readonly PassageActor[],
  leases?:Record<string,PassageLease>,now=0,intendedStep?:Pt):boolean{
 const seen=new Set<string>();
 for(const door of doors){
  // Wide shutters permit several independent lanes.
  if(distance(door.a,door.b)>60)continue;
  const cluster=passageCluster(door,doors);
  const passageKey=cluster.length===1?door.id:
    'zone:'+cluster.map(d=>d.id).join('+');
  const key=actor.side?actor.side+':'+passageKey:passageKey;
  if(seen.has(key))continue;seen.add(key);
  if(!seeksPassage(actor,cluster,doors))continue;
  // Opposing sides are handled by combat and solid enemy collision, not
  // the friendly traffic queue. A hostile must not reserve our squad lane.
  const relevant=actors.filter(a=>
    (!actor.side||!a.side||actor.side===a.side)&&
    seeksPassage(a,cluster,doors)&&
    (a.blockedTime<1.5||insidePassage(a,cluster)||
     cluster.some(d=>inDoorway(a,d))));
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
  // A prior, still-active claimant keeps its turn even if a later actor
  // becomes geometrically closer at the doorway while finishing a WAIT.
  // Only someone already trapped *between two doors* can override that lease
  // to escape a vestibule; ordinary near-threshold positions cannot steal it.
  const insideVestibule=cluster.length>1?
    relevant.find(a=>insidePassage(a,cluster)):undefined;
  const owner=insideVestibule?.id??
    (leased?current!.actorId:occupant?.id??nearest.id);
  if(leases)leases[key]={actorId:owner,until:now+.38};
  // Same-direction squad members form a moving queue. The second operator
  // advances immediately behind the first, and the third behind the second.
  // No one waits for a teammate to reach a distant interior waypoint.
  if(tooCloseToLeader(actor,relevant,cluster,intendedStep))return true;
  if(owner===actor.id)continue;
  const leader=relevant.find(a=>a.id===owner);
  const sameDirection=leader&&cluster.some(door=>{
    const direction=travelSign(actor,door);
    return direction!==0&&travelSign(leader,door)===direction;
  });
  if(sameDirection)continue;
  // A counterflow or unaligned claimant gets a short staging queue instead
  // of racing against the existing occupant. Do not stop them far outside.
  if(atOpposingEntry(actor,cluster,intendedStep))return true;
 }
 return false;
}
/** Existing passage reservations manage spacing near narrow openings.
 * Do not add cosmetic friendly sidestepping that drives a later follower
 * into the jamb; neither geometry nor opposing-body collision is relaxed.
 */
export function approachingNarrowThreshold(from:Pt,goal:Pt,
 doors:readonly Door[]):boolean{
 return doors.some(door=>{
  const width=distance(door.a,door.b);
  if(width>60||distance(from,doorCenter(door))>102)return false;
  const before=side(from,door),after=side(goal,door);
  if(before*after>=0)return false;
  const center=doorCenter(door);
  const tx=(door.b.x-door.a.x)/Math.max(1,width);
  const ty=(door.b.y-door.a.y)/Math.max(1,width);
  const across=Math.abs((from.x-center.x)*tx+(from.y-center.y)*ty);
  return across<width/2+35;
 });
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
