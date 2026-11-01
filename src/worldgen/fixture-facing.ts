/** Consistent fixture facing shared by tactical AABB placement and 3D rendering.
 * 0 faces south (+world Y); 1 east (+X); 2 north (-Y); 3 west (-X).
 * Non-square fixtures swap their occupied footprint for east/west facings.
 */
import type {Room} from '../breach-site.ts';
import type {Pt,Obstacle} from '../breach-core.ts';
export type FixtureFacing=0|1|2|3;
export const facingRadians=(f:FixtureFacing)=>f*Math.PI/2;
export function footprintAtFacing(width:number,depth:number,f:FixtureFacing){
 return f%2===0?{w:width,h:depth}:{w:depth,h:width};
}
const find=(placed:readonly Obstacle[],fixture:string)=>
 placed.find(o=>o.fixture===fixture);
export function fixtureFacing(room:Room,fixture:string,p:Pt,
 placed:readonly Obstacle[]=[]):FixtureFacing{
 if(fixture==='chair'||fixture==='office-chair'||fixture==='patio-chair'){
  const target=find(placed,fixture==='office-chair'?'desk':'dining-table')??
   find(placed,'meeting-table')??find(placed,'counter');
  if(target){
   const dx=target.x-p.x,dy=target.y-p.y;
   return Math.abs(dx)>Math.abs(dy)?(dx>0?1:3):(dy>0?0:2);
  }
 }
 if(fixture==='tv-stand'){
  const sofa=find(placed,'sofa');
  if(sofa){const dx=sofa.x-p.x,dy=sofa.y-p.y;
   return Math.abs(dx)>Math.abs(dy)?(dx>0?1:3):(dy>0?0:2);
  }
 }
 // Along a boundary, turn the working face toward the usable room interior.
 const edges=[
  {d:p.y-room.y,f:0 as FixtureFacing},
  {d:room.x+room.w-p.x,f:3 as FixtureFacing},
  {d:room.y+room.h-p.y,f:2 as FixtureFacing},
  {d:p.x-room.x,f:1 as FixtureFacing}
 ];
 edges.sort((a,b)=>a.d-b.d);
 return edges[0].f;
}
const requiringApproach=new Set([
 'desk','counter','sink','stove','fridge','toilet','shower','bathtub',
 'exam-bed','workbench','vehicle-lift','checkout','control-panel',
 'office-chair','chair','dining-table','meeting-table'
]);
export function workingClearance(room:Room,c:Obstacle,
 obstacles:readonly Obstacle[],depth=15):boolean{
 if(!requiringApproach.has(c.fixture??''))return true;
 const f=c.facing??0;
 const dx=f===1?1:f===3?-1:0,dy=f===0?1:f===2?-1:0;
 const p={x:c.x+dx*(f%2===0?c.h/2+depth:c.w/2+depth),
  y:c.y+dy*(f%2===0?c.h/2+depth:c.w/2+depth)};
 if(p.x<room.x+5||p.x>room.x+room.w-5||
    p.y<room.y+5||p.y>room.y+room.h-5)return false;
 // A narrow working space is checked, rather than reserving another solid prop.
 return !obstacles.some(o=>o!==c&&Math.abs(o.x-p.x)<o.w/2+5&&
  Math.abs(o.y-p.y)<o.h/2+5);
}
