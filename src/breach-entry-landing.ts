/** D3.10A: repair ONLY known-unsafe generated clearing footprints at
 * planning time. Never query undiscovered furniture or rewrite authored MOVE.
 * The existing lane template remains the preferred tactical formation.
 * Candidates keep the intended interior side and full-body spacing.
 * Physical hinges, unseen cover and dynamic crowding stay execution-owned.
 */
import {doorCenter,type Door,type Pt} from './breach-core.ts';
import type {EntrySlot} from './breach-entry-lanes.ts';
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
function interiorSign(point:Pt,door:Door):number{
 const center=doorCenter(door),dx=door.b.x-door.a.x,dy=door.b.y-door.a.y;
 return (point.x-center.x)*-dy+(point.y-center.y)*dx;
}
const RADII=[3,5,8,11,14] as const;
const CIRCLE=16;
export function settleKnownEntryLandings(
 door:Door,slots:readonly EntrySlot[],
 isReachableStandingPoint:(p:Pt,index:number)=>boolean
):EntrySlot[]|null{
 const chosen:EntrySlot[]=[];
 for(let index=0;index<slots.length;index++){
  const original=slots[index],sign=Math.sign(interiorSign(original.point,door));
  if(!sign)return null;
  const viable=(p:Pt)=>{
   if(interiorSign(p,door)*sign<=0||
      chosen.some(other=>distance(p,other.point)<23))return false;
   // Preserve space near unassigned lanes where feasible; do not displace
   // a rear operator into a previous/next operator's intended footprint.
   if(slots.some((other,j)=>j>index&&distance(p,other.point)<23))
     return false;
   return isReachableStandingPoint(p,index);
  };
  let point=viable(original.point)?original.point:null;
  if(!point){
   for(const radius of RADII){
    let best:Pt|null=null,bestCost=Infinity;
    for(let j=0;j<CIRCLE;j++){
     const angle=j*Math.PI*2/CIRCLE;
     const p={x:original.point.x+Math.cos(angle)*radius,
      y:original.point.y+Math.sin(angle)*radius};
     if(!viable(p))continue;
     // Stay near the authored clearing sector. Stable deterministic ties.
     const cost=radius+distance(p,original.point)*.01;
     if(cost<bestCost){bestCost=cost;best=p;}
    }
    if(best){point=best;break;}
   }
  }
  if(!point)return null;
  const delta={x:point.x-original.point.x,y:point.y-original.point.y};
  chosen.push({...original,point,
   look:{x:original.look.x+delta.x,y:original.look.y+delta.y}});
 }
 return chosen;
}
