/** D3.2 R2: offline-only small physical relief candidates.
 * This is NOT a movement controller, emergency teleport, live AI helper,
 * route authority or gameplay update. The existing swept motor stays final.
 */
import {OPERATOR_RADIUS,pointToSegment,doorLeafSegment,
 type Door,type Pt} from './breach-core.ts';
import {doorWouldStrikeActors} from './breach-door.ts';
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const round=(x:number)=>+x.toFixed(2);
export type D32SelfClearCandidate={
 point:Pt;distance:number;progress:number;occupiedClear:boolean;
 gapBefore:number;gapAfter:number;
};
export function probeD32HingeSelfClearance(
 from:Pt,goal:Pt,door:Door,occupied:readonly Pt[],
 swept:(a:Pt,b:Pt)=>boolean
):D32SelfClearCandidate[]{
 const fraction=door.openFraction??(door.open?1:0);
 if(!door.open||door.kind==='sliding'||door.kind==='shutter'||
    door.locked||door.wedged||door.heldBy||
    fraction<.15||fraction>=.72||
    Math.abs(door.angularVelocity??0)>.16)return [];
 const nextAngle=Math.min(1,fraction+.025);
 if(!doorWouldStrikeActors(door,nextAngle,[from],OPERATOR_RADIUS))return [];
 const leaf=doorLeafSegment(door);
 const initial=pointToSegment(from,leaf);
 const proposals:D32SelfClearCandidate[]=[];
 // Deliberate offline witness library: candidate *destinations* must be
 // reachable via full shoulder sweeps at the current exact hinge angle.
 // Direction and travel size are deterministic; never move an actor here.
 for(const len of [8,14,22,32]){
  for(let k=0;k<16;k++){
   const heading=k*Math.PI/8;
   const point={x:from.x+Math.cos(heading)*len,
    y:from.y+Math.sin(heading)*len};
   if(!swept(from,point)||
      doorWouldStrikeActors(door,nextAngle,[point],OPERATOR_RADIUS))continue;
   proposals.push({point:{x:round(point.x),y:round(point.y)},
    distance:len,progress:round(distance(from,goal)-distance(point,goal)),
    occupiedClear:occupied.every(other=>
      distance(point,other)>=2*OPERATOR_RADIUS+1),
    gapBefore:round(initial),
    gapAfter:round(pointToSegment(point,leaf))});
  }
 }
 // Prefer a safe destination with no other-body overlap, then closer
 // approaches and more authored-goal progress. This ranking is forensic;
 // it does NOT write nav, move an actor or choose a live recovery.
 proposals.sort((a,b)=>
  Number(b.occupiedClear)-Number(a.occupiedClear)||
  a.distance-b.distance||b.progress-a.progress||
  a.point.x-b.point.x||a.point.y-b.point.y);
 return proposals.slice(0,5);
}
