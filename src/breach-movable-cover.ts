/** Stable mutable cover objects; the procedural site remains immutable. */
import {pointToSegment,type Door,type Obstacle,type Pt,type Segment}
 from './breach-core.ts';
const movable=new Set(['crate','box','cart','chair','office-chair',
 'side-table','nightstand','coffee-table','small-table']);
export const canRelocateCover=(o:Obstacle)=>movable.has(o.fixture??'crate')&&
 o.w<=85&&o.h<=70;
const overlaps=(a:Obstacle,b:Obstacle,padding=5)=>
 Math.abs(a.x-b.x)<(a.w+b.w)/2+padding&&
 Math.abs(a.y-b.y)<(a.h+b.h)/2+padding;
export function relocateCover(cover:Obstacle[],index:number,to:Pt,
 walls:readonly Segment[],doors:readonly Door[],actors:readonly Pt[]):boolean{
 const old=cover[index];if(!old||!canRelocateCover(old))return false;
 const target={...old,x:to.x,y:to.y};
 if(walls.some(w=>pointToSegment(to,w)<Math.max(old.w,old.h)/2+2))
  return false;
 if(cover.some((c,i)=>i!==index&&overlaps(target,c)))return false;
 if(actors.some(p=>Math.abs(p.x-to.x)<old.w/2+9&&
  Math.abs(p.y-to.y)<old.h/2+9))return false;
 if(doors.some(d=>pointToSegment(to,d)<Math.max(old.w,old.h)/2+9))
  return false;
 cover[index]=target;return true;
}
