/** Runtime movable objects use the exact physical cover, not visual-only
 * decorations. A furniture push is a short continuous sweep; every intermediate
 * position obeys the same wall, door, actor and cover clearance as its endpoint.
 * Heavier fixtures have a visibly slower displacement, rather than teleporting.
 */
import {pointToSegment,type Door,type Obstacle,type Pt,type Segment}
 from './breach-core.ts';
export type CoverMass='light'|'medium'|'heavy'|'fixed';
const light=new Set(['box','chair','small-table','side-table',
 'nightstand','storage-tote','tipped-trash-bin','trash-bag','mop-bucket']);
const medium=new Set(['crate','cart','office-chair','coffee-table',
 'supply-cart','linen-cart','step-ladder','recycling-bin']);
const heavy=new Set(['armchair']);
export function coverMass(o:Obstacle):CoverMass{
 const id=o.fixture??'crate';
 if(o.w>85||o.h>70)return 'fixed';
 return light.has(id)?'light':medium.has(id)?'medium':
  heavy.has(id)?'heavy':'fixed';
}
export const coverPushDistance=(o:Obstacle)=>
 coverMass(o)==='light'?18:coverMass(o)==='medium'?11:
 coverMass(o)==='heavy'?6:0;
export const canRelocateCover=(o:Obstacle)=>coverMass(o)!=='fixed'&&!o.destroyed;
const overlaps=(a:Obstacle,b:Obstacle,padding=5)=>
 Math.abs(a.x-b.x)<(a.w+b.w)/2+padding&&
 Math.abs(a.y-b.y)<(a.h+b.h)/2+padding;
function collisionAt(target:Obstacle,index:number,cover:readonly Obstacle[],
 walls:readonly Segment[],doors:readonly Door[],actors:readonly Pt[]):boolean{
 const p={x:target.x,y:target.y};
 const radius=Math.max(target.w,target.h)/2;
 if(walls.some(w=>pointToSegment(p,w)<radius+2))return true;
 if(cover.some((o,i)=>i!==index&&overlaps(target,o)))return true;
 if(actors.some(a=>Math.abs(a.x-p.x)<target.w/2+9&&
   Math.abs(a.y-p.y)<target.h/2+9))return true;
 if(doors.some(d=>pointToSegment(p,d)<radius+9))return true;
 return false;
}
export function relocateCover(cover:Obstacle[],index:number,to:Pt,
 walls:readonly Segment[],doors:readonly Door[],actors:readonly Pt[]):boolean{
 const old=cover[index];if(!old||!canRelocateCover(old))return false;
 const displacement=Math.hypot(to.x-old.x,to.y-old.y);
 if(displacement<=0||displacement>coverPushDistance(old)+.01)return false;
 // A swept footprint prevents passing through walls, closed doorways,
 // operators, or other real furniture by moving only the end position.
 const steps=Math.max(1,Math.ceil(displacement/3));
 for(let i=1;i<=steps;i++){
  const t=i/steps,target={...old,
   x:old.x+(to.x-old.x)*t,y:old.y+(to.y-old.y)*t};
  if(collisionAt(target,index,cover,walls,doors,actors))return false;
 }
 cover[index]={...old,x:to.x,y:to.y};
 return true;
}
