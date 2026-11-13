/** Q3: threshold-specific *presentation* of planned GO-time rank.
 * A crossing number belongs to a door, not to an operator. No plan mutation,
 * no renderer-owned traversal permission and no replay knowledge disclosure.
 */
import {doorCenter,type Door,type Pt} from './breach-core.ts';
import type {PassageSchedule,PassageSlot} from './breach-passage-plan.ts';
export type PassageBadge={actorId:string;doorId:string;side:-1|1;
 rank:number;point:Pt};
const signed=(p:Pt,d:Door)=>{
 const dx=d.b.x-d.a.x,dy=d.b.y-d.a.y,l=Math.hypot(dx,dy)||1;
 return ((p.x-d.a.x)*-dy+(p.y-d.a.y)*dx)/l;
};
export function badgesForActor(actorId:string,at:Pt,
 doors:readonly Door[],schedule:PassageSchedule,planning:boolean,
 replaying:boolean):PassageBadge[]{
 if(replaying)return [];
 const out:PassageBadge[]=[];
 for(const slot of schedule.get(actorId)??[]){
  const door=doors.find(d=>d.id===slot.doorId);
  if(!door)continue;
  // A complete crossing disappears during execution; future thresholds
  // retain their OWN ordinal. During planning show all predicted crossings.
  if(!planning&&signed(at,door)*slot.fromSide< -18)continue;
  const dx=door.b.x-door.a.x,dy=door.b.y-door.a.y,
   width=Math.hypot(dx,dy)||1;
  const nx=-dy/width,ny=dx/width,tx=dx/width,ty=dy/width;
  const mid=doorCenter(door);
  // Slight staggering is intentional: four badges stay distinct on mobile.
  const offset=((slot.rank%4)-1.5)*10;
  out.push({actorId,doorId:door.id,side:slot.fromSide,
   rank:slot.rank+1,
   point:{x:mid.x+nx*slot.fromSide*24+tx*offset,
    y:mid.y+ny*slot.fromSide*24+ty*offset}});
 }
 return out;
}
/** Shared between floor-plan canvas and projected isometric overlays. */
export function paintPassageBadge(draw:CanvasRenderingContext2D,at:Pt,
 number:number,selected:boolean):void{
 draw.save();
 draw.globalAlpha=selected?.78:.38;
 draw.fillStyle='#263b3d';draw.strokeStyle='#c0d1c9';
 draw.lineWidth=1.1;
 draw.beginPath();draw.arc(at.x,at.y,8.5,0,2*Math.PI);
 draw.fill();draw.stroke();
 draw.globalAlpha=selected?.92:.58;
 draw.fillStyle='#ecede3';
 draw.font='700 11px "Saira Condensed",sans-serif';
 draw.textAlign='center';draw.textBaseline='middle';
 draw.fillText(String(number),at.x,at.y+.5);
 draw.restore();
}