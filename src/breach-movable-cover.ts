/** Runtime movable objects use the exact physical cover, not visual-only
 * decorations. A furniture push is a short continuous sweep; every intermediate
 * position obeys the same wall, door, actor and cover clearance as its endpoint.
 * Heavier fixtures have a visibly slower displacement, rather than teleporting.
 */
import {pointToSegment,type Door,type Obstacle,type Pt,type Segment}
 from './breach-core.ts';
import {canAutoShove,canToppleLightCover} from './breach-traversal-surfaces.ts';
export type CoverMass='light'|'medium'|'heavy'|'fixed';
const light=new Set(['box','chair','stool','lamp','patio-chair','small-table','side-table',
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

/** Yield harmless loose clutter to the operator's body. This deliberately
 * does not shove a whole table, a fixed prop, a window or an obstacle with no
 * room to move. The object's entire swept footprint is checked first.
 * Called only at physical contact, never just because a path runs nearby.
 * @returns The moved obstacle's index, or null when it must remain solid.
 */
export function autoShoveLightCover(cover:Obstacle[],from:Pt,to:Pt,
 walls:readonly Segment[],doors:readonly Door[],others:readonly Pt[]):number|null{
 const delta={x:to.x-from.x,y:to.y-from.y};
 const step=Math.hypot(delta.x,delta.y);
 if(step<.001)return null;
 const dir={x:delta.x/step,y:delta.y/step};
 const candidates=cover.map((o,i)=>({o,i,
   distance:Math.hypot(from.x-o.x,from.y-o.y)}))
  .filter(({o})=>canAutoShove(o)&&canRelocateCover(o)&&
     Math.abs(to.x-o.x)<o.w/2+9&&Math.abs(to.y-o.y)<o.h/2+9&&
     (o.x-from.x)*dir.x+(o.y-from.y)*dir.y>0)
  .sort((a,b)=>a.distance-b.distance);
 for(const {o,i} of candidates){
   const amount=coverPushDistance(o);
   // Prefer a small forward nudge; try glancing shoulder deflections only
   // when the forward path is physically blocked by something else.
   for(const distance of [Math.min(14,amount),Math.min(9,amount),
                          Math.min(5,amount)]){
     for(const turn of [0,.55,-.55,1.1,-1.1]){
       const a=Math.atan2(dir.y,dir.x)+turn;
       const destination={x:o.x+Math.cos(a)*distance,
         y:o.y+Math.sin(a)*distance};
       if(relocateCover(cover,i,destination,walls,doors,others))return i;
     }
   }
   // When a chair/stool/lamp has no free displacement, a body strike
   // can still tip it onto the floor. Keep its real location and material;
   // the toppling state (not a removed collider) makes it step-over debris.
   if(canToppleLightCover(o)){
     cover[i]={...o,toppled:true,low:true};
     return i;
   }
 }
 return null;
}
