/** D3.17D: cold rejoin of a real transient GO route past a stable open
 * leaf when the ultimate GO is behind additional doors. This is route
 * selection only: no second controller, guessed door clearance, new GO or
 * authored order edits. Called after 3 separately accepted rehearsals.
 */
import type {Pt} from './breach-core.ts';
import {fullBodyMotorStrideClear} from './breach-stack-micro-corner.ts';

const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const clone=(p:Pt):Pt=>({x:p.x,y:p.y});

/** Candidate joins must actually reconnect to an existing disposable
 * waypoint, not merely reach a portal and claim mission success.
 * All route legs UP TO that waypoint receive motor-size physical sweeps;
 * the saved downstream route is still checked live by the ordinary motor.
 *
 * One world search from current body, and only if that fails one from an
 * already swept physical portal stage. No work on ordinary fixed ticks.
 */
export function coldSweptDoorWaypointJoin(
 from:Pt,goal:Pt,original:readonly Pt[],portalStage:readonly Pt[],
 search:(from:Pt,to:Pt)=>Pt[],
 sweep:(from:Pt,to:Pt)=>boolean
):Pt[]{
 if(original.length<2||distance(original[original.length-1],goal)>3||
    distance(from,goal)<30)return [];
 const join=original[0];
 const span=distance(from,join);
 if(span<14||span>145||distance(join,goal)<18)return [];
 const costLimit=span*2.35+38;
 const accepts=(prefix:readonly Pt[],tail:readonly Pt[]):Pt[]=>{
  if(!tail.length||distance(tail[tail.length-1],join)>3)return [];
  let prev=from,length=0;
  for(const p of [...prefix,...tail]){
   const part=distance(prev,p);
   length+=part;
   if(length>costLimit||!Number.isFinite(part)||
      !fullBodyMotorStrideClear(prev,p,sweep))return [];
   prev=p;
  }
  // Avoid copying/validating the old tail: this route does not grant
  // clearance through any future still-closed door.
  return [...prefix.map(clone),...tail.map(clone),
    ...original.slice(1).map(clone)];
 };
 const direct=accepts([],search(from,join));
 if(direct.length)return direct;
 // The portal stage is already swept by D2, but verify it *again* before
 // asking a new world search from its far end. A preliminary stage which
 // crosses an unsafe hinge must never authorize a speculative connector.
 if(!portalStage.length||portalStage.length>5)return [];
 let at=from,stageLength=0;
 for(const p of portalStage){
  stageLength+=distance(at,p);
  if(stageLength>costLimit||!fullBodyMotorStrideClear(at,p,sweep))
    return [];
  at=p;
 }
 if(distance(at,join)<6)return accepts(portalStage,[join]);
 return accepts(portalStage,search(at,join));
}
