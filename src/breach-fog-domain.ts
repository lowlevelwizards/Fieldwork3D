/** VIS-11: fog DISPLAY domain, kept separate from tactical sight.
 * Exterior Known masks only enclosed floors and undiscovered inner courts.
 * Coordinates are the same site-space coordinates used for room floors.
 */
import type {Pt} from './breach-core.ts';
import type {Room,Site,WorldBounds} from './breach-site.ts';
import {exteriorBriefedAt,insideSiteFootprint} from './breach-site-footprint.ts';
export type FogRect={x:number;y:number;w:number;h:number};
const EPS=1e-6;
export function unionRoomRects(rooms:readonly Pick<Room,'x'|'y'|'w'|'h'>[]):FogRect[]{
 const valid=rooms.filter(r=>r.w>EPS&&r.h>EPS);
 if(!valid.length)return [];
 const cuts=[...new Set(valid.flatMap(r=>[r.x,r.x+r.w]))].sort((a,b)=>a-b);
 const result:FogRect[]=[];
 for(let i=0;i<cuts.length-1;i++){
  const x=cuts[i],right=cuts[i+1];
  if(right-x<=EPS)continue;
  const intervals=valid.filter(r=>r.x<right-EPS&&r.x+r.w>x+EPS)
   .map(r=>({start:r.y,end:r.y+r.h})).sort((a,b)=>a.start-b.start);
  if(!intervals.length)continue;
  let start=intervals[0].start,end=intervals[0].end;
  const emit=()=>result.push({x,y:start,w:right-x,h:end-start});
  for(let j=1;j<intervals.length;j++){
   if(intervals[j].start<=end+EPS)end=Math.max(end,intervals[j].end);
   else{emit();start=intervals[j].start;end=intervals[j].end;}
  }
  emit();
 }
 return result;
}
/** Inner courtyards enclosed by the building remain concealed until seen.
 * All perimeter-connected outside terrain is NEVER given a black fog slab
 * in Exterior Known, regardless of the site's rectangular world bounds.
 */
export function exteriorKnownFogRects(site:Site):FogRect[]{
 const regions=unionRoomRects(site.rooms);
 if(!site.rooms.length)return regions;
 const minX=Math.min(...site.rooms.map(r=>r.x));
 const minY=Math.min(...site.rooms.map(r=>r.y));
 const maxX=Math.max(...site.rooms.map(r=>r.x+r.w));
 const maxY=Math.max(...site.rooms.map(r=>r.y+r.h));
 const step=10,extra:FogRect[]=[];
 // Scan a small bounding rectangle, not the full outdoor world canvas.
 for(let y=Math.floor(minY/step)*step;y<maxY;y+=step){
  let start:number|null=null;
  const emit=(right:number)=>{if(start!==null){
   extra.push({x:start,y,w:right-start,h:step});start=null;
  }};
  for(let x=Math.floor(minX/step)*step;x<maxX;x+=step){
   const p={x:x+step/2,y:y+step/2};
   const corners=[{x,y},{x:x+step,y},{x,y:y+step},
     {x:x+step,y:y+step}];
   const outside=corners.every(c=>!insideSiteFootprint(site,c))&&
    !insideSiteFootprint(site,p);
   const unknown=outside&&!exteriorBriefedAt(site,p);
   if(unknown){if(start===null)start=x;}
   else emit(x);
  }
  emit(Math.ceil(maxX/step)*step);
 }
 return regions.concat(extra);
}
/** Canvas top rows correspond to site-space minimum Y.
 * CanvasTexture.flipY defaults to true, so uv.v=1 is the top row.
 */
export function fogUvAt(p:Pt,b:WorldBounds):{u:number;v:number}{
 return {u:(p.x-b.minX)/(b.maxX-b.minX),
   v:1-(p.y-b.minY)/(b.maxY-b.minY)};
}
