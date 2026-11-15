/** Physical correction for a GENERATED ENTRY endpoint only.
 * A player-intel landing can be occupied by an undiscovered wall or by
 * the real moving leaf on execution. Pick within the existing arrival
 * radius, always on the original room side with a REAL swept body path.
 * Call only after genuine blockedTime at the end of the active MOVE.
 */
import {doorCenter,type Door,type Pt} from './breach-core.ts';
const d=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
function side(p:Pt,door:Door):number{
 const center=doorCenter(door),dx=door.b.x-door.a.x,dy=door.b.y-door.a.y;
 return ((p.x-center.x)*-dy+(p.y-center.y)*dx)/(Math.hypot(dx,dy)||1);
}
export function selectPhysicalEntrySettle(
 from:Pt,goal:Pt,door:Door,peers:readonly Pt[],
 canStand:(p:Pt)=>boolean,sweep:(from:Pt,to:Pt)=>boolean
):Pt|null{
 const sign=Math.sign(side(goal,door));
 if(!sign)return null;
 let best:Pt|null=null,bestScore=Infinity;
 for(const radius of [4,8,12,15]){
  for(let i=0;i<16;i++){
   const theta=i*Math.PI/8;
   const p={x:goal.x+Math.cos(theta)*radius,
    y:goal.y+Math.sin(theta)*radius};
   if(side(p,door)*sign<2||!canStand(p)||!sweep(from,p)||
      peers.some(other=>d(other,p)<20))continue;
   const score=d(p,goal)+d(from,p)*.24;
   if(score<bestScore){bestScore=score;best=p;}
  }
  if(best)break;
 }
 return best;
}
