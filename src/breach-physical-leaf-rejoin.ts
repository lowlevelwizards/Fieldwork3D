/** D3.17E3/E4/E5: cold local recovery for a real stalled body at a
 * known physically OPEN leaf, even if the transient door episode is
 * absent. The SAME normal motor executes all steps and preserves every
 * authored GO, later door, action, sync and collision test.
 *
 * No guessing around an unseen or closed door. The motor must first
 * witness a real physical obstruction within the stable leaf footprint.
 */
import type {Pt,Door} from './breach-core.ts';
import type {TeamActor} from './breach-game.ts';
import {OPERATOR_RADIUS,doorCenter,doorLeafSegment,pointToSegment}
 from './breach-core.ts';
import {physicalDoorPoseKey} from './breach-recovery-proposal-gate.ts';
import {fullBodyMotorStrideClear} from './breach-stack-micro-corner.ts';
import {joinsExistingMotorRoute} from './breach-recovery-route-validation.ts';
const d=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const copy=(p:Pt):Pt=>({x:p.x,y:p.y});
type Witness={orderId:number;doorId:string;anchor:Pt;goal:Pt;
 pose:string;revision:number;attempts:number;lastAt:number};
const witnesses=new WeakMap<TeamActor,Witness>();
export function claimPhysicalLeafRejoin(a:TeamActor,door:Door,goal:Pt,
 now:number,revision:number,nearbyDoors:readonly Door[]):boolean{
 const order=a.plan[0];
 if(a.side!=='blue'||order?.kind!=='move'||a.squeeze||
    a.traversal||a.traversalPending||
    (a.doorTraversal?.maneuver==='outside-leaf'&&
     a.doorTraversal.waypoints.length>0))return false;
 const pose=physicalDoorPoseKey(a.p,nearbyDoors),prior=witnesses.get(a);
 const same=!!prior&&prior.orderId===order.id&&
  prior.doorId===door.id&&d(prior.goal,goal)<.5&&
  d(prior.anchor,a.p)<4&&prior.pose===pose&&
  prior.revision===revision;
 if(!same){
  witnesses.set(a,{orderId:order.id,doorId:door.id,goal:copy(goal),
   anchor:copy(a.p),pose,revision,attempts:1,lastAt:now});
  return true;
 }
 if(prior.attempts>=2||now-prior.lastAt<5)return false;
 prior.attempts++;prior.lastAt=now;return true;
}
export function relevantStableOpenLeaf(from:Pt,doors:readonly Door[],
 episodeDoorId:string|null=null):Door|null{
 let best:Door|null=null,bestGap=Infinity;
 for(const door of doors){
  if(!door.open||door.wedged||door.kind==='sliding'||
     door.kind==='shutter'||(door.openFraction??0)<.82||
     Math.abs(door.angularVelocity??0)>.16)continue;
  if(episodeDoorId&&door.id!==episodeDoorId)continue;
  const gap=pointToSegment(from,doorLeafSegment(door));
  if(gap<OPERATOR_RADIUS+36&&gap<bestGap){
   best=door;bestGap=gap;
  }
 }
 return best;
}
/** Direct later transient node first, THEN a bounded library of full-body
 * stage points around the *actual* open aperture. At most TWO cold
 * A* connectors, only from a swept-clear stage to an existing nav node.
 * Never selects a physically impossible first waypoint or searches from
 * an unsafe stage. Return [] on any uncertainty; no invented crossing.
 */
export function selectPhysicalOpenLeafRejoin(
 from:Pt,goal:Pt,original:readonly Pt[],door:Door,
 sweep:(a:Pt,b:Pt)=>boolean,
 bodyClear:(p:Pt)=>boolean,
 worldRoute:(a:Pt,b:Pt)=>Pt[]
):Pt[]{
 if(original.length<2||d(original[original.length-1],goal)>3||
    !door.open||(door.openFraction??0)<.82)return [];
 const width=d(door.a,door.b);
 if(width<OPERATOR_RADIUS*2+4)return [];
 const tangent={x:(door.b.x-door.a.x)/width,
  y:(door.b.y-door.a.y)/width};
 const normal={x:-tangent.y,y:tangent.x};
 const center=doorCenter(door);
 const joinIndices=[1,2,3,4].filter(i=>i<original.length);
 const maxTravel=100;
 // Rejoin a disposable later motor waypoint only if this single physical
 // chord really fits; we don't skip or replace a player-authored order.
 for(const i of joinIndices){
  const at=original[i];
  if(d(from,at)>maxTravel||!bodyClear(at))continue;
  const result=joinsExistingMotorRoute(from,goal,original,i,[at],
   sweep,maxTravel);
  if(result.length)return result;
 }
 const candidates:Pt[]=[];
 const half=Math.max(0,width/2-OPERATOR_RADIUS-3);
 for(const side of [1,-1])
  for(const depth of [OPERATOR_RADIUS+12,OPERATOR_RADIUS+23])
   for(const offset of [0,half*.65,-half*.65]){
    const point={x:center.x+normal.x*side*depth+tangent.x*offset,
     y:center.y+normal.y*side*depth+tangent.y*offset};
    if(d(from,point)>80||!bodyClear(point)||
       !fullBodyMotorStrideClear(from,point,sweep))continue;
    candidates.push(point);
    // Prefer an exact, zero-A* full-body physical continuation.
    for(const i of joinIndices){
     const join=original[i];
     if(!bodyClear(join))continue;
     const result=joinsExistingMotorRoute(from,goal,original,i,
       [point,join],sweep,maxTravel);
     if(result.length)return result;
    }
   }
 let searched=0;
 for(const point of candidates){
  if(searched>=2)break;
  for(const i of joinIndices){
   const join=original[i];
   if(d(point,join)>80||!bodyClear(join))continue;
   searched++;
   const path=worldRoute(point,join);
   const result=joinsExistingMotorRoute(from,goal,original,i,
     [point,...path],sweep,maxTravel);
   if(result.length)return result;
   break;
  }
 }
 return [];
}
