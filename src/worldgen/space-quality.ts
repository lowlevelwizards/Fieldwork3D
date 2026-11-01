/** Geometry-only room occupancy and doorway clearance diagnostics.
 * Conservative footprint sums are descriptive, not a replacement for route().
 * Never add an A* search to the furnishing hot path.
 */
import type {Site,Room} from '../breach-site.ts';
import type {Obstacle} from '../breach-core.ts';
export type SpaceRoomMetric={
 roomId:string;purpose:string;areaM2:number;solidCount:number;
 solidFraction:number;freeFraction:number;crowded:boolean;
};
export type SpaceQuality={
 rooms:SpaceRoomMetric[];crowdedRoomIds:string[];
 averageSolidFraction:number;doorApproachIssues:{doorId:string;fixture:string}[];
 fixtureCounts:Record<string,number>;
};
const approxOverlap=(r:Room,o:Obstacle):number=>{
 const left=Math.max(r.x,o.x-o.w/2),right=Math.min(r.x+r.w,o.x+o.w/2);
 const top=Math.max(r.y,o.y-o.h/2),bottom=Math.min(r.y+r.h,o.y+o.h/2);
 return Math.max(0,right-left)*Math.max(0,bottom-top);
};
const significant=(o:Obstacle)=>o.fixture!=='window-sill'&&
 o.fixture!=='glass-barrier';
export function assessSpaceQuality(site:Pick<Site,'rooms'|'cover'|'doors'>):SpaceQuality{
 const fixtureCounts:Record<string,number>={};
 for(const o of site.cover)if(o.fixture&&significant(o))
  fixtureCounts[o.fixture]=(fixtureCounts[o.fixture]??0)+1;
 const rooms=site.rooms.filter(r=>r.kind==='room').map((r):SpaceRoomMetric=>{
  const area=r.w*r.h;
  const intersecting=site.cover.filter(o=>significant(o)&&approxOverlap(r,o)>0);
  const occupied=intersecting.filter(o=>o.fixture!=='porch-post')
    .reduce((sum,o)=>sum+approxOverlap(r,o),0);
  // This is a footprint estimate; intersecting items can overcount shared area.
  const solidFraction=Math.min(1,occupied/Math.max(1,area));
  return {roomId:r.id,purpose:r.purpose??'untyped',
   areaM2:Math.round(area/400*10)/10,solidCount:intersecting.length,
   solidFraction:Math.round(solidFraction*1000)/1000,
   freeFraction:Math.round((1-solidFraction)*1000)/1000,
   crowded:solidFraction>.32};
 });
 const doorApproachIssues:{doorId:string;fixture:string}[]=[];
 for(const d of site.doors){
  const cx=(d.a.x+d.b.x)/2,cy=(d.a.y+d.b.y)/2;
  for(const o of site.cover){
   if(!significant(o))continue;
   // Entry-center obstruction, not a warning for a wall-side cabinet.
   const dx=Math.max(0,Math.abs(o.x-cx)-o.w/2);
   const dy=Math.max(0,Math.abs(o.y-cy)-o.h/2);
   if(Math.hypot(dx,dy)<13)
    doorApproachIssues.push({doorId:d.id,fixture:o.fixture??'unknown'});
  }
 }
 return {rooms,crowdedRoomIds:rooms.filter(r=>r.crowded).map(r=>r.roomId),
  averageSolidFraction:rooms.length?
   Math.round(rooms.reduce((n,r)=>n+r.solidFraction,0)/rooms.length*1000)/1000:0,
  doorApproachIssues,fixtureCounts};
}
