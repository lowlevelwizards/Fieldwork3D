/** VIS-03: Shared optical geometry; not ballistic or collision geometry. */
import {doorOpticalSegment,doorTransmitsSightAndLight,
 type Door,type Obstacle,type Pt,type Segment} from './breach-core.ts';
const TRANSPARENT_COVER=new Set(['chain-link-fence','iron-fence',
 'glass-barrier','mesh-gate']);
export function coverBlocksOpticalSight(o:Obstacle,lowObstructs=false):boolean{
 return !TRANSPARENT_COVER.has(o.fixture??'')&&(!o.low||lowObstructs);
}
export function opticalBlockerSegments(
 walls:readonly Segment[],doors:readonly Door[],cover:readonly Obstacle[],
 lowObstructs=false):Segment[]{
 const segments:Segment[]=[...walls];
 for(const door of doors){
  if(doorTransmitsSightAndLight(door))continue;
  const leaf=doorOpticalSegment(door);
  if(Math.hypot(leaf.b.x-leaf.a.x,leaf.b.y-leaf.a.y)>.1)segments.push(leaf);
 }
 for(const o of cover){
  if(!coverBlocksOpticalSight(o,lowObstructs))continue;
  const l=o.x-o.w/2,r=o.x+o.w/2,t=o.y-o.h/2,b=o.y+o.h/2;
  const p:Pt[]=[{x:l,y:t},{x:r,y:t},{x:r,y:b},{x:l,y:b}];
  for(let i=0;i<4;i++)segments.push({a:p[i],b:p[(i+1)%4]});
 }
 return segments;
}
