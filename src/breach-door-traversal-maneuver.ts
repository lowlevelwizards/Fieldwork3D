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
 // Rehearsed shoulder breadths: tight, normal, generous.
 // No per-frame sorting, path search, or map-relative assumptions.
 for(const [advance,clearance,lateral] of [
  [radius+6,radius+6,0],
  [radius+13,radius+13,5],
  [radius+21,radius+20,-5]
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
/** Called only on physically blocked contact; an active maneuver never
 * gets a fresh route every 60Hz tick. A significant stall can authorize
 * one later retry, after ordinary dynamic bodies have had time to move.
 */
export function tryRehearsedDoorManeuver(a:TeamActor,s:Session,
 next:Pt,canAutoSidestep:boolean):boolean{
 const episode=a.doorTraversal;
 if(!episode||episode.phase==='release'||episode.maneuverAttempts>=2||
    s.seconds<episode.nextManeuverAt)return false;
 let door=s.doors.find(d=>d.id===episode.doorId);
 if(!door||!door.open)return false;
 if(episode.maneuver!=='direct'&&
   s.seconds-episode.lastProgressAt<1.8)return false;
 episode.maneuverAttempts++;
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
