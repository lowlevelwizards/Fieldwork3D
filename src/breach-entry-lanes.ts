/** Build 149: four distinct, deterministic clearing lanes.
 * Doors form a physical threshold; the template does not know enemies
 * or change the player's chosen orders until the user invokes it. */
import {doorCenter,type Pt,type Door} from './breach-core.ts';
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export type EntrySlot={point:Pt;look:Pt;side:'left'|'right';depth:number};
export function entryLanes(door:Door,from:Pt,count:number,
 canStand:(p:Pt)=>boolean):EntrySlot[]{
 const center=doorCenter(door);
 const dx=door.b.x-door.a.x,dy=door.b.y-door.a.y;
 const size=Math.hypot(dx,dy)||1;
 const tangent={x:dx/size,y:dy/size};
 const normal={x:-tangent.y,y:tangent.x};
 const side=Math.sign((from.x-center.x)*normal.x+
   (from.y-center.y)*normal.y)||1;
 const inward={x:-normal.x*side,y:-normal.y*side};
 // Try paired room-clearing sectors first. A genuine narrow gallery or
 // corridor needs a depth-staggered stack, not four simultaneous lateral
 // positions in a room that's only ~60 units wide.
 const layouts=[
  {depths:[62,62,111,111],offsets:[22,15,30,8,37,0]},
  {depths:[52,88,124,160,198,236],offsets:[0,8,15,22,30]},
  {depths:[66,105,144,183,222,261],offsets:[0,10,18,25]}
 ];
 for(const layout of layouts){
  const slots:EntrySlot[]=[];
  for(let i=0;i<count;i++){
   const sign=i%2===0?-1:1;
   const depth=layout.depths[i]??layout.depths.at(-1)!+(i-layout.depths.length+1)*38;
   let chosen:Pt|null=null;
   for(const lateral of layout.offsets){
    for(const direction of [sign,-sign]){
     const p={x:center.x+inward.x*depth+tangent.x*lateral*direction,
      y:center.y+inward.y*depth+tangent.y*lateral*direction};
     if(!canStand(p)||slots.some(s=>dist(s.point,p)<23))continue;
     chosen=p;break;
    }
    if(chosen)break;
   }
   if(!chosen)break;
   const look={x:chosen.x+inward.x*84+tangent.x*sign*70,
    y:chosen.y+inward.y*84+tangent.y*sign*70};
   slots.push({point:chosen,look,side:sign<0?'left':'right',depth});
  }
  if(slots.length===count)return slots;
 }
 return [];
}
