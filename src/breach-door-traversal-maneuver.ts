/** D2 / fixed-action doorway muscle memory.
 * A crossing chooses ONE short physically swept maneuver when an actual
 * step fails against its identified hinged leaf. Three repeatable tip
 * clearances + a straight portal are tried in fixed order; none imply a
 * collision exemption or a new authored destination.
 */
import {doorCenter,doorLeafSegment,OPERATOR_RADIUS,pointToSegment,
 type Door,type Pt} from './breach-core.ts';
import type {Session,TeamActor} from './breach-game.ts';
import {sessionWorldGeometry} from './breach-world-context.ts';
import {sweptBodyClear} from './breach-navigation.ts';
import {beginAutoSidestep} from './breach-auto-sidestep.ts';
import {signedDoorSide} from './breach-door-traversal-episode.ts';
import {doorWouldStrikeActors,doorSwingBlocked,type BodyDoorContact} from './breach-door.ts';
import {acquireDoorHandContact} from './breach-door-hand-contact.ts';
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const clone=(p:Pt):Pt=>({x:p.x,y:p.y});
/** Return the first full-body-legal route in an intentionally tiny fixed
 * library, not the shortest route among dozens of generated candidates.
 * A portal-only result yields to ordinary routing AFTER the doorway.
 */
export function rehearseDoorLeafBypass(
 from:Pt,destination:Pt,door:Door,
 clear:(a:Pt,b:Pt)=>boolean,radius=OPERATOR_RADIUS
):Pt[]{
 if(!door.open||door.wedged||door.kind==='sliding'||
    door.kind==='shutter'||(door.openFraction??0)<.32||
    distance(from,destination)<8)return [];
 const leaf=doorLeafSegment(door),tip=leaf.b;
 const length=distance(leaf.a,tip);
 const width=distance(door.a,door.b);
 if(length<10||width<radius*2+3||
    pointToSegment(from,leaf)>radius+56)return [];
 const f={x:(tip.x-leaf.a.x)/length,y:(tip.y-leaf.a.y)/length};
 const across={x:-f.y,y:f.x};
 const side=((from.x-leaf.a.x)*across.x+
   (from.y-leaf.a.y)*across.y)>=0?1:-1;
 const tangent={x:(door.b.x-door.a.x)/width,
  y:(door.b.y-door.a.y)/width};
 const normal={x:-tangent.y,y:tangent.x};
 const center=doorCenter(door);
 const targetSide=signedDoorSide(destination,door)>=0?1:-1;
 if(signedDoorSide(from,door)*targetSide>=0)return [];
 const portal=(offset:number):Pt=>({
  x:center.x+normal.x*targetSide*(radius+14)+tangent.x*offset,
  y:center.y+normal.y*targetSide*(radius+14)+tangent.y*offset
 });
 const candidate=(points:Pt[]):Pt[]=>{
  let at=from;
  for(const point of points){
   if(!clear(at,point))return [];
   at=point;
  }
  // The full authored destination can remain remote/behind other doors.
  // A valid portal is allowed to stage first; no ghosting through walls.
  if(clear(at,destination))return [...points,clone(destination)];
  return points;
 };
 // A directly passable opening is no reason to route around an open leaf.
 const straight=candidate([portal(0)]);
 if(straight.length)return straight;
 // If already outside the open leaf but trapped against its jamb,
 // return to the REHEARSED same-side approach before crossing. This
 // prevents long wall-following routes from treating the jamb as a maze.
 const approach={x:center.x-normal.x*targetSide*(radius+18),
   y:center.y-normal.y*targetSide*(radius+18)};
 if(distance(from,approach)>4){
   const staged=candidate([approach,portal(0)]);
   if(staged.length)return staged;
 }
 // Rehearsed shoulder breadths: tight, normal, generous.
 // No per-frame sorting, path search, or map-relative assumptions.
 for(const [advance,clearance,lateral] of [
  [radius+6,radius+6,0],
  [radius+13,radius+13,5],
  [radius+21,radius+20,-5],
  // Q4 rare outside-tip fallbacks. These reuse the same bounded actual
  // swept-body validation and the recorded maneuver episode, never A*.
  [radius+13,radius+24,9],
  [radius+24,radius+28,-9]
 ]){
  const around={
   x:tip.x+f.x*advance,y:tip.y+f.y*advance};
  const before={
   x:around.x+across.x*clearance*side,
   y:around.y+across.y*clearance*side};
  const after={
   x:around.x-across.x*clearance*side,
   y:around.y-across.y*clearance*side};
  const path=candidate([before,after,portal(lateral)]);
  if(path.length)return path;
 }
 return [];
}
/** Q6: reuse D2's physically rehearsed short portal, but BEFORE a
 * generated entry spends seconds following a transient known-map detour.
 * Never overrides a player waypoint, explicit WATCH, or a committed D2
 * outside-leaf maneuver. Pure swept-body checks decide every new segment.
 */
export function preferShortPhysicalEntry(
 a:TeamActor,s:Session,goal:Pt
):boolean{
 const order=a.plan[0],episode=a.doorTraversal;
 if(!order?.entryDoorId||order.kind!=='move'||!episode||
    episode.doorId!==order.entryDoorId||
    episode.maneuver==='outside-leaf'||episode.phase==='release'||
    s.seconds<(episode.lastShortEntryProbeAt??-10)+1.25)return false;
 const door=s.doors.find(x=>x.id===episode.doorId);
 if(!door||!door.open||(door.openFraction??0)<.82||
    Math.abs(door.angularVelocity??0)>.16||
    distance(a.p,doorCenter(door))>65)return false;
 episode.lastShortEntryProbeAt=s.seconds;
 const world=sessionWorldGeometry(s);
 const candidate=rehearseDoorLeafBypass(a.p,goal,door,
  (from,to)=>sweptBodyClear(from,to,s.doors,OPERATOR_RADIUS,world));
 if(!candidate.length||distance(candidate.at(-1)!,goal)>3)return false;
 const pathLength=(points:readonly Pt[])=>{
  let cost=0,from=a.p;
  for(const point of points){cost+=distance(from,point);from=point;}
  return cost;
 };
 const shortest=pathLength(candidate),existing=pathLength(a.nav);
 const direct=distance(a.p,goal);
 const first=a.nav[0];
 const away=!!first&&
  (first.x-a.p.x)*(goal.x-a.p.x)+
  (first.y-a.p.y)*(goal.y-a.p.y)<-12;
 const slowOrMisrouted=a.squeeze||episode.maneuver==='grab-and-hold'||
  a.lastBlocker==='door'||away;
 if(shortest>direct*1.65+20||
    (slowOrMisrouted?shortest>existing*1.22+12:
      shortest+12>=existing))return false;
 episode.waypoints=candidate.map(clone);
 episode.waypointIndex=0;
 episode.maneuver='outside-leaf';
 episode.phase='clear-leaf';
 episode.lastTransitionAt=s.seconds;
 a.nav=candidate.map(clone);
 a.retryRouteAt=0;
 a.recoveryAttempts=0;
 return true;
}
/** Called only on physically blocked contact; an active maneuver never
 * gets a fresh route every 60Hz tick. A significant stall can authorize
 * one later retry, after ordinary dynamic bodies have had time to move.
 */
export function tryRehearsedDoorManeuver(a:TeamActor,s:Session,
 next:Pt,canAutoSidestep:boolean):boolean{
 const episode=a.doorTraversal;
 if(!episode||episode.phase==='release'||
    s.seconds<episode.nextManeuverAt)return false;
 const door=s.doors.find(d=>d.id===episode.doorId);
 if(!door||!door.open)return false;
 // Plan from the leaf's stable physical angle. Otherwise a previously
 // valid correction becomes obsolete as another operator shoves it wide.
 if(Math.abs(door.angularVelocity??0)>.16)return false;
 const leafChanged=Math.abs((door.openFraction??0)-
    episode.selectedLeafFraction)>.14;
 if(episode.maneuverAttempts>=2&&!leafChanged)return false;
 if(episode.maneuverAttempts>=4)return false;
 if(episode.maneuver!=='direct'&&
   s.seconds-episode.lastProgressAt<1.8)return false;
 episode.maneuverAttempts++;
 episode.selectedLeafFraction=door.openFraction??0;
 episode.nextManeuverAt=s.seconds+1.5;
 const world=sessionWorldGeometry(s);
 const path=rehearseDoorLeafBypass(a.p,episode.destination,door,
  (from,to)=>sweptBodyClear(from,to,s.doors,OPERATOR_RADIUS,world));
 if(!path.length)return false;
 episode.waypoints=path.map(clone);
 episode.waypointIndex=0;
 episode.maneuver='outside-leaf';
 episode.phase='clear-leaf';
 episode.lastTransitionAt=s.seconds;
 a.nav=path.map(clone);
 a.autoSidestep=beginAutoSidestep(a.p,next,path[0],
  a.heading,episode.destination,s.seconds,canAutoSidestep);
 a.retryRouteAt=0;a.recoveryAttempts=0;
 a.squeeze=false;a.squeezeTime=0;
 return true;
}
/** A truly wayward approach can be recovered by one deterministic move
 * back to the safe side of the SAME doorway, not a new broad A* expedition.
 * No ghosting: reject the correction unless the whole shoulder sweep fits.
 * One correction per episode avoids oscillation between staging and door.
 */
export function recoverDoorApproachDrift(a:TeamActor,s:Session):boolean{
 const e=a.doorTraversal;
 if(!e||e.phase==='release'||e.driftRecoveries>=1||
    s.seconds<e.nextManeuverAt)return false;
 const door=s.doors.find(d=>d.id===e.doorId);
 if(!door||!door.open||signedDoorSide(a.p,door)*e.approachSide<=0)
   return false;
 const center=doorCenter(door);
 const dx=a.p.x-center.x,dy=a.p.y-center.y;
 if(dx*dx+dy*dy<110*110)return false;
 const width=distance(door.a,door.b)||1;
 const normal={x:-(door.b.y-door.a.y)/width,
   y:(door.b.x-door.a.x)/width};
 const staging={
  x:center.x+normal.x*e.approachSide*(OPERATOR_RADIUS+19),
  y:center.y+normal.y*e.approachSide*(OPERATOR_RADIUS+19)
 };
 const world=sessionWorldGeometry(s);
 if(!sweptBodyClear(a.p,staging,s.doors,OPERATOR_RADIUS,world))
  return false;
 e.driftRecoveries++;
 e.nextManeuverAt=s.seconds+1.5;
 e.maneuver='outside-leaf';
 e.waypoints=[clone(staging)];
 e.waypointIndex=0;
 a.nav=[clone(staging)];
 a.retryRouteAt=0;a.recoveryAttempts=0;
 a.squeeze=false;a.squeezeTime=0;
 return true;
}
/** Record a REAL contact accepted by the hinge motor. A support-hand
 * marker is valid only if the actual panel/handle was within reach;
 * D4 will extend this transient cue into sustained hand IK/retention.
 * Never switch away from an actively owned outside-leaf footpath merely
 * because it also brushed the panel during the same crossing.
 */
export function recordDoorManeuverContact(
 actor:TeamActor,s:Session,contact:BodyDoorContact|null):void{
 const episode=actor.doorTraversal;
 if(!episode||!contact||contact.doorId!==episode.doorId)return;
 if(contact.handAssist){
  const door=s.doors.find(d=>d.id===contact.doorId);
  if(door)acquireDoorHandContact(s,actor,door,true);
 }else if(contact.advanced&&episode.maneuver==='direct')
  episode.maneuver='push-through';
}
/** R2.1: existing physical motor recovery can use ONE legal correction
 * when an unowned, self-blocked partial hinge cannot advance. No authored
 * edit, new GO controller, body pushing, or door-angle modification.
 * This function is never called on a normal frame: only a bounded,
 * genuine door-collision retry after the existing blocked-time threshold.
 */
export function selfBlockingHingeRelief(
 a:TeamActor,s:Session,goal:Pt
):Pt|null{
 const world=sessionWorldGeometry(s);
 const otherPositions=s.operators.filter(other=>other!==a&&other.health>0)
   .map(other=>other.p);
 const aim=Math.atan2(goal.y-a.p.y,goal.x-a.p.x);
 for(const door of s.doors){
  const fraction=door.openFraction??(door.open?1:0);
  if(!door.open||door.kind==='sliding'||door.kind==='shutter'||
     door.locked||door.wedged||door.heldBy||
     fraction<.15||fraction>=.72||
     Math.abs(door.angularVelocity??0)>.16)continue;
  const leaf=doorLeafSegment(door);
  const initial=pointToSegment(a.p,leaf);
  if(initial>=OPERATOR_RADIUS+4)continue;
  const future=Math.min(1,fraction+.025);
  if(!doorWouldStrikeActors(door,future,[a.p],OPERATOR_RADIUS)||
     doorSwingBlocked(door,future,[],OPERATOR_RADIUS,world))continue;
  // Favor forward footwork; fixed small angular offsets permit shoulder
  // clearance without converting the maneuver into broad pathfinding.
  // First retain the original eight close, goal-oriented candidates.
  // If a teammate is already EMBEDDED against the stopped leaf, those
  // angles can all lie inside its swing. D3.7's exact warehouse witness
  // showed a swept-clear 14–22-unit step away from the authored goal.
  // This is a single cold-stall attempt, never a 60 Hz search.
  for(const radius of [8,14,22,32])
    for(const turn of [0,Math.PI/8,-Math.PI/8,Math.PI/4,
      -Math.PI/4,3*Math.PI/8,-3*Math.PI/8,Math.PI,
      Math.PI/2,-Math.PI/2,5*Math.PI/8,-5*Math.PI/8,
      3*Math.PI/4,-3*Math.PI/4,7*Math.PI/8,-7*Math.PI/8]){
      const theta=aim+turn;
      const p={x:a.p.x+Math.cos(theta)*radius,
       y:a.p.y+Math.sin(theta)*radius};
      if(pointToSegment(p,leaf)<initial+3||
         doorWouldStrikeActors(door,future,[p],OPERATOR_RADIUS)||
         otherPositions.some(q=>distance(p,q)<OPERATOR_RADIUS*2+1)||
         !sweptBodyClear(a.p,p,s.doors,OPERATOR_RADIUS,world))
        continue;
      return p;
    }
 }
 return null;
}
/** When the current motor route is the saved maneuver, its chosen
 * clearance corridor owns navigation until finished or truly stalled.
 */
export function ownsDoorManeuverRoute(a:TeamActor):boolean{
 const episode=a.doorTraversal;
 if(!episode||episode.maneuver!=='outside-leaf'||
  !episode.waypoints.length||!a.nav.length)return false;
 const next=a.nav[0];
 return episode.waypoints.some(p=>distance(p,next)<3);
}
