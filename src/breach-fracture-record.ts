/** Capture presentation evidence exactly once, from already committed world
 * transitions. Scalar values are copied by existing replay snapshots. */
import {doorLeafSegment,type Door} from './breach-core.ts';
export function recordDoorFracture(door:Door,at:number):void{
 if(!door.glassShattered||door.glassBreakX!==undefined||!Number.isFinite(at))return;
 const leaf=doorLeafSegment(door),dx=leaf.b.x-leaf.a.x,dy=leaf.b.y-leaf.a.y;
 const width=Math.hypot(dx,dy);
 if(width<1)return;
 door.glassShatteredAt=at;
 door.glassBreakX=(leaf.a.x+leaf.b.x)/2;door.glassBreakY=(leaf.a.y+leaf.b.y)/2;
 door.glassBreakWidth=width;door.glassBreakYaw=Math.atan2(dy,dx);
}
