/** R3: deterministic, bounded tactical sightlines from actual room
 * thresholds into valid standing cells. All walls, doors and furniture are
 * sourced from the physical Site; this is not a synthetic cover generator.
 */
import type {Site,Room} from '../breach-site.ts';
import {type Pt,segmentsCross,type Obstacle} from '../breach-core.ts';
import {segmentHitsBox} from '../breach-ray.ts';
export type RoomSightlineQuality={
 roomId:string;thresholds:number;samples:number;exposedSamples:number;
 concealedSamples:number;crossfireSamples:number;longLanes:number;
 exposedFraction:number;warnings:string[];
};
const middle=(a:Pt,b:Pt):Pt=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const onThreshold=(r:Room,p:Pt)=>p.x>=r.x-9&&p.x<=r.x+r.w+9&&
 p.y>=r.y-9&&p.y<=r.y+r.h+9&&Math.min(Math.abs(p.x-r.x),
 Math.abs(p.x-r.x-r.w),Math.abs(p.y-r.y),
 Math.abs(p.y-r.y-r.h))<9;
const contains=(r:Room,p:Pt)=>p.x>=r.x&&p.x<=r.x+r.w&&
 p.y>=r.y&&p.y<=r.y+r.h;
const furniture=(o:Obstacle)=>o.fixture!=='window-sill'&&
 o.fixture!=='glass-barrier'&&o.fixture!=='glass-pane';
export function assessRoomSightlines(site:Site,room:Room,
 additions:readonly Obstacle[]=[]):RoomSightlineQuality{
 const center={x:room.x+room.w/2,y:room.y+room.h/2};
 const portals=[...site.doors,...(site.openings??[])]
  .map(d=>middle(d.a,d.b)).filter(p=>onThreshold(room,p));
 const cover=[...site.cover,...additions].filter(o=>furniture(o)&&
   contains(room,{x:o.x,y:o.y}));
 const standing=[.25,.5,.75].flatMap(x=>[.25,.5,.75].map(y=>({
  x:room.x+room.w*x,y:room.y+room.h*y
 }))).filter(p=>!cover.some(o=>Math.abs(p.x-o.x)<o.w/2+6&&
  Math.abs(p.y-o.y)<o.h/2+6));
 const visible=(start:Pt,target:Pt)=>{
  const a={x:start.x+(center.x-start.x)*.035,
   y:start.y+(center.y-start.y)*.035};
  const ray={a,b:target};
  if(site.walls.some(w=>segmentsCross(ray,w)))return false;
  return !cover.some(o=>!o.low&&segmentHitsBox(a,target,o));
 };
 let exposed=0,concealed=0,crossfire=0,long=0;
 for(const p of standing){
  const views=portals.filter(t=>visible(t,p));
  if(views.length){
   exposed++;if(views.length>=2)crossfire++;
   if(views.some(t=>distance(t,p)>Math.max(room.w,room.h)*.5))long++;
  }else concealed++;
 }
 const fraction=standing.length?exposed/standing.length:0;
 const warnings:string[]=[];
 if(portals.length&&standing.length){
  if(fraction>.85)warnings.push('overexposed room');
  if(fraction<.14)warnings.push('no useful threshold sightline');
  if(portals.length>=2&&crossfire===0)warnings.push('isolated entry angles');
 }
 return {roomId:room.id,thresholds:portals.length,samples:standing.length,
  exposedSamples:exposed,concealedSamples:concealed,
  crossfireSamples:crossfire,longLanes:long,
  exposedFraction:Math.round(fraction*100)/100,warnings};
}
/** Do not let optional full-height props erase every remaining approach lane.
 * Core fixtures are never moved or dropped for this aesthetic preference.
 */
export function retainsTacticalSightline(site:Site,room:Room,
 candidate:Obstacle,current:readonly Obstacle[]):boolean{
 if(candidate.low||room.w<110||room.h<110)return true;
 const world={...site,cover:[...site.cover,...current]};
 const before=assessRoomSightlines(world,room);
 if(!before.thresholds||before.exposedSamples<2)return true;
 const after=assessRoomSightlines(world,room,[candidate]);
 return after.exposedSamples>=Math.min(2,before.exposedSamples);
}
