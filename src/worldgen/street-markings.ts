/** ST4: straight-section lane paint. Never mark a phantom centerline
 * in a cropped lane, or invent a stop/crossing without connected topology.
 */
import type {Site} from '../breach-site.ts';
import type {PropertySurface,SurfaceKind} from './property-surfaces.ts';
import type {StreetRect} from './public-street-layout.ts';
import {STREET_DIMENSIONS as D} from './street-standards.ts';
export function planStreetMarkings(site:Site):PropertySurface[]{
 const p=site.streetInfrastructure;if(!p)return [];
 const out:PropertySurface[]=[],road=p.frontage.road,axis=p.axis,across=axis==='x'?'y':'x';
 const length=axis==='x'?road.width:road.depth,wide=p.visibleRoadWidth;
 const from=road[axis]-length/2,to=from+length;
 const rect=(at:number,other:number,w:number,h:number):StreetRect=>axis==='x'?{x:at,y:other,width:w,depth:h}:{x:other,y:at,width:h,depth:w};
 const add=(kind:SurfaceKind,r:StreetRect)=>out.push({id:'street:'+kind+':'+out.length,zoneId:'public-street',kind,...r});
 const stripe=(kind:SurfaceKind,other:number,start:number,end:number)=>{
  if(end-start>=4)add(kind,rect((start+end)/2,other,end-start,D.paintWidth));
 };
 if(p.centerline){
  const solid=p.kind==='industrial';
  if(solid)stripe('road-centerline',p.centerline[across],from+4,to-4);
  else for(let x=from+8;x<to-4;x+=60)stripe('road-centerline',p.centerline[across],x,Math.min(x+27,to-4));
 }
 // The curb-side boundary is known even when the far lane is cropped.
 // Rural roads and industrial access have a restrained white edge line.
 if((p.kind==='rural'||p.kind==='industrial')&&wide>=p.nominalLaneWidth){
  const sign=p.entry==='south'||p.entry==='east'?1:-1;
  stripe('road-edge-line',road[across]-sign*(wide/2-4),from+4,to-4);
  if(!p.cropped)stripe('road-edge-line',road[across]+sign*(wide/2-4),from+4,to-4);
 }
 if(p.junction){
  const j=p.junction,r=j.road,sign=p.entry==='south'||p.entry==='east'?1:-1;
  const len=j.axis==='x'?r.width:r.depth;
  // Center divider ends before the junction throat; a short white waiting
  // bar belongs on the incoming half only (right-hand traffic convention).
  const begin=j.mainEdge-sign*24,end=j.mainEdge-sign*(len-8);
  const alongCenter=(begin+end)/2;
  add('road-centerline',rect(r[axis],alongCenter,D.paintWidth,Math.abs(end-begin)));
  const inbound=r[axis]+sign*j.laneWidth/2;
  add('road-edge-line',rect(inbound,j.mainEdge-sign*13,j.laneWidth-8,3));
 }
 return out;
}
