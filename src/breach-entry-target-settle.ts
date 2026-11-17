/** Physical correction for a GENERATED ENTRY endpoint only.
 * A player-intel landing can be occupied by an undiscovered wall or by
 * the real moving leaf on execution. Pick within the existing arrival
 * radius, always on the original room side with a REAL swept body path.
 * Call only after genuine blockedTime at the end of the active MOVE.
 */
import {doorCenter,type Door,type Pt} from './breach-core.ts';
import {fullBodyMotorRouteClear} from './breach-recovery-route-validation.ts';
const d=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
function side(p:Pt,door:Door):number{
 const center=doorCenter(door),dx=door.b.x-door.a.x,dy=door.b.y-door.a.y;
 return ((p.x-center.x)*-dy+(p.y-center.y)*dx)/(Math.hypot(dx,dy)||1);
}
export function selectPhysicalEntrySettle(
 from:Pt,goal:Pt,door:Door,peers:readonly Pt[],
 canStand:(p:Pt)=>boolean,sweep:(from:Pt,to:Pt)=>boolean,
 worldRoute?:(from:Pt,to:Pt)=>Pt[],
 onWorldRoute?:(path:Pt[])=>void
):Pt|null{
 const sign=Math.sign(side(goal,door));
 if(!sign)return null;
 // Prefer the smallest real full-body footstep; the 20/26-unit outer
 // ring is only for genuinely obstructed GENERATED endpoints (Retail D1).
 // No hidden geometry is read while the plan is being authored.
 let best:Pt|null=null,bestScore=Infinity;
 // Three cold connector probes must cover distinct distances from the
 // blocked template, not spend all three in the same near-goal pocket.
 const cold: {point:Pt;score:number;band:number}[]=[];
 for(const radius of [4,8,12,15,20,26]){
  for(let i=0;i<16;i++){
   const theta=i*Math.PI/8;
   const p={x:goal.x+Math.cos(theta)*radius,
    y:goal.y+Math.sin(theta)*radius};
   if(side(p,door)*sign<2||!canStand(p)||
      peers.some(other=>d(other,p)<20))continue;
   const score=d(p,goal)+d(from,p)*.24;
   if(sweep(from,p)){
    if(score<bestScore){bestScore=score;best=p;}
   }else if(worldRoute) cold.push({point:p,score,band:radius<=8?0:radius<=15?1:2});
  }
  if(best)break;
 }
 if(best)return best;
 // A doorframe can block the direct chord while a real detour reaches
 // another legal interior landing. At most THREE cold world searches, and
 // every proposed leg is checked by the same capsule verifier as recovery.
 // The ordinary motor executes the resulting route; this grants no motion.
 if(worldRoute){
  cold.sort((a,b)=>a.score-b.score);
  // A local detour often cannot reach the closest standable footprint
  // around a swung leaf. Reserve one query per near/middle/outer band
  // before filling any unused budget with the next-best candidate.
  // This changes proposal order only; the real capsule sweep below and
  // the authoritative motor still decide every physical stride.
  const probes:typeof cold=[];
  for(const band of [0,1,2]){
   const candidate=cold.find(item=>item.band===band);
   if(candidate)probes.push(candidate);
  }
  for(const candidate of cold){
   if(probes.length>=3)break;
   if(!probes.includes(candidate))probes.push(candidate);
  }
  for(const candidate of probes){
   const path=worldRoute(from,candidate.point);
   if(path.length&&d(path[path.length-1],candidate.point)<=3&&
      fullBodyMotorRouteClear(from,path,sweep,d(from,candidate.point)*2.1+36)){
    onWorldRoute?.(path.map(q=>({...q})));
    return candidate.point;
   }
  }
 }
 return null;
}
