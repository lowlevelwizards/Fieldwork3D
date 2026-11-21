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
/** D3.32 P3C: a REAL blocked authored stride may rejoin an existing
 * physical route before a 0.85-second stall, but only at a locally
 * obstructing, STABLE fully-open leaf. No new motor or route authority.
 * A moving/partial/held door, another pending maneuver, or a generated
 * ENTRY/STACK keeps its existing ownership and timing.
 */
export function earlyStableOpenLeafForBlockedAuthoredMove(
 a:TeamActor,goal:Pt,doors:readonly Door[],now:number,
 physicallyDenied:boolean
):Door|null{
 const order=a.plan[0],tail=a.nav.at(-1);
 if(!physicallyDenied||a.side!=='blue'||order?.kind!=='move'||
    order.entryDoorId||order.stackDoorId||
    d(order.p,goal)>.5||a.nav.length<2||!tail||d(tail,goal)>3||
    a.lastBlocker!=='door'||a.blockedTime<.35||
    a.blockedTime>=.85||now-a.lastNavRepairAt<.65||
    now<a.retryRouteAt||a.squeeze||a.traversal||
    a.traversalPending||a.autoSidestep||a.fireRetreatTarget||
    a.doorTraversal?.maneuver==='outside-leaf')return null;
 const leaf=relevantStableOpenLeaf(a.p,doors,
   a.doorTraversal?.doorId??null);
 if(!leaf||leaf.locked||leaf.jammed||leaf.wedged||leaf.heldBy||
    (leaf.openFraction??0)<.98||
    Math.abs(leaf.angularVelocity??0)>=.08||
    pointToSegment(a.p,doorLeafSegment(leaf))>=OPERATOR_RADIUS+16)
  return null;
 return leaf;
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
 // The CURRENT next node may be standable but its direct first chord
 // crosses an open leaf (Clinic D9 Moss). It is eligible for a *staged*
 // join only, never for reissuing the exact blocked direct stride.
 const joinIndices=[0,1,2,3,4].filter(i=>i<original.length);
 const maxTravel=100;
 // Rejoin a disposable later motor waypoint only if this single physical
 // chord really fits; we don't skip or replace a player-authored order.
 for(const i of joinIndices.filter(i=>i>0)){
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
 // Probe the shortest plausible continuation before spending our two
 // existing cold world searches; iteration order across portal sides is
 // not a useful estimate of which connector will physically reach.
 const pairs:{point:Pt;index:number;cost:number}[]=[];
 for(const point of candidates)for(const i of joinIndices){
  const join=original[i],gap=d(point,join);
  if(gap>80||!bodyClear(join))continue;
  pairs.push({point,index:i,cost:gap+d(from,point)*.25});
 }
 pairs.sort((a,b)=>a.cost-b.cost||a.index-b.index);
 let searched=0;
 for(const candidate of pairs){
  if(searched>=2)break;
  searched++;
  const join=original[candidate.index];
  const path=worldRoute(candidate.point,join);
  if(!path.length)continue;
  const result=joinsExistingMotorRoute(from,goal,original,
    candidate.index,[candidate.point,...path],sweep,maxTravel);
  if(result.length)return result;
 }
 // D3.32 P3: the frozen Clinic D9 witness has a LEGAL two-leg
 // full-body departure while the direct (old) grid chord strikes the
 // fully-open solid leaf. Existing center/portal stages above may miss
 // a short diagonal sidestep along that leaf. Probe only cold, near a
 // stable unowned leaf after those first alternatives fail.
 //
 // Each proposed pair [sidestep, EXISTING original[i]] must be swept
 // end-to-end by the same physical clearance law; the unchanged tail
 // stays attached. This never moves a body, changes a GO, awards arrival,
 // alters the hinge, touches right-of-way or bypasses the collision motor.
 if((door.openFraction??0)>=.98&&
    Math.abs(door.angularVelocity??0)<.16&&
    !door.locked&&!door.jammed&&!door.wedged&&!door.heldBy&&
    pointToSegment(from,doorLeafSegment(door))<OPERATOR_RADIUS+16&&
    !sweep(from,original[0])){
  const toward=Math.atan2(goal.y-from.y,goal.x-from.x);
  for(const radius of [16,24,32,42])
   for(const turn of [-Math.PI/6,Math.PI/6,0,-Math.PI/3,
      Math.PI/3,-Math.PI/2,Math.PI/2]){
    const theta=toward+turn;
    const stage={x:from.x+Math.cos(theta)*radius,
     y:from.y+Math.sin(theta)*radius};
    if(!bodyClear(stage)||
       !fullBodyMotorStrideClear(from,stage,sweep))continue;
    for(const i of joinIndices){
     const join=original[i];
     if(d(stage,join)>maxTravel||!bodyClear(join))continue;
     const verified=joinsExistingMotorRoute(from,goal,original,i,
       [stage,join],sweep,maxTravel);
     if(verified.length)return verified;
    }
   }
 }
 return [];
}


/** D3.32 P3B: a physically clear actor may have no normal or intel route
 * because a stable OPEN leaf interrupts the starting grid cell. A short
 * same-body swept departure can restore the EXISTING first-operable-door
 * prefix (not the authored destination). Called cold only after the
 * ordinary acquisition and portal fallback have returned no route.
 *
 * No body movement, door interaction, lock override or route adoption
 * occurs here. Both the departure and every prefix link are checked
 * against the same live physical collision law. The normal motor will
 * subsequently execute every selected stride and operate any later door.
 */
export function selectColdStaleLeafPortalStage(
 from:Pt,goal:Pt,leaf:Door,
 stand:(p:Pt)=>boolean,
 sweep:(a:Pt,b:Pt)=>boolean,
 portal:(a:Pt,b:Pt)=>Pt[],
 certifiedTerminalDoorContact:(a:Pt,b:Pt)=>boolean
):Pt[]{
 if(!leaf.open||leaf.kind==='sliding'||leaf.kind==='shutter'||
    leaf.locked||leaf.jammed||leaf.wedged||leaf.heldBy||
    (leaf.openFraction??0)<.98||
    Math.abs(leaf.angularVelocity??0)>=.16||
    pointToSegment(from,doorLeafSegment(leaf))>=OPERATOR_RADIUS+16||
    !stand(from)||d(from,goal)<30)return [];
 // A small fixed compass library, not dynamic grid/A* at 60Hz. Favor
 // truly local 8-unit footsteps before larger 16/24-unit departures.
 // Never spend more than four cold portal searches on one claim.
 let probes=0;
 for(const radius of [8,16,24])
  for(const theta of [0,Math.PI/4,-Math.PI/4,Math.PI/2,
    -Math.PI/2,Math.PI,3*Math.PI/4,-3*Math.PI/4]){
   const stage={x:from.x+Math.cos(theta)*radius,
     y:from.y+Math.sin(theta)*radius};
   if(!stand(stage)||!sweep(from,stage))continue;
   const prefix=portal(stage,goal);
   probes++;
   if(prefix.length&&prefix.length<=28&&d(stage,prefix[0])<=96){
    let previous=stage,length=d(from,stage),legal=true;
    for(let i=0;i<prefix.length;i++){
     const point=prefix[i];
     // The EXISTING first-operable-door planner ends immediately after
     // its one proven, still-CLOSED physical leaf. Every other prefix leg
     // must be truly swept-clear. The final leg can only target the
     // verified single door the normal motor will touch and OPEN.
     const clear=stand(point)&&sweep(previous,point);
     if(!clear&&(i!==prefix.length-1||
         !certifiedTerminalDoorContact(previous,point))){
      legal=false;break;
     }
     length+=d(previous,point);previous=point;
    }
    if(legal&&length<=d(from,goal)*2.5+90)
     return [stage,...prefix.map(copy)];
   }
   if(probes>=4)return [];
  }
 return [];
}
