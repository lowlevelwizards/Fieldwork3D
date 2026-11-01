/** Pre-furnishing local circulation reservations.
 * Constrain optional furniture only: a required sink/table/lift can still be
 * placed and the authoritative post-furnishing route check decides viability.
 * No path search or mutable global state is involved.
 */
import type {Site,Room} from '../breach-site.ts';
import type {Obstacle,Pt} from '../breach-core.ts';
import {functionalSpacePlan} from './functional-space.ts';
export type CirculationReservation={
 roomId:string;kind:'door-approach'|'through-route';
 from:Pt;to:Pt;radius:number;
};
type SiteGeometry=Pick<Site,'rooms'|'doors'|'openings'>;
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const inBounds=(p:Pt,r:Room,margin=1)=>p.x>=r.x+margin&&
 p.x<=r.x+r.w-margin&&p.y>=r.y+margin&&p.y<=r.y+r.h-margin;
function roomPortal(room:Room,mid:Pt):Pt|null{
 const tolerance=2;
 if(mid.y>room.y+7&&mid.y<room.y+room.h-7){
  if(Math.abs(mid.x-room.x)<=tolerance)return {x:room.x+Math.min(54,room.w*.48),y:mid.y};
  if(Math.abs(mid.x-room.x-room.w)<=tolerance)return {x:room.x+room.w-Math.min(54,room.w*.48),y:mid.y};
 }
 if(mid.x>room.x+7&&mid.x<room.x+room.w-7){
  if(Math.abs(mid.y-room.y)<=tolerance)return {x:mid.x,y:room.y+Math.min(54,room.h*.48)};
  if(Math.abs(mid.y-room.y-room.h)<=tolerance)return {x:mid.x,y:room.y+room.h-Math.min(54,room.h*.48)};
 }
 return null;
}
export function circulationReservations(site:SiteGeometry):CirculationReservation[]{
 const result:CirculationReservation[]=[];
 const portals=[...site.doors,...(site.openings??[])];
 for(const room of site.rooms){
  if(room.kind==='hall')continue;
  const access:Pt[]=[];
  for(const portal of portals){
   const mid={x:(portal.a.x+portal.b.x)/2,
    y:(portal.a.y+portal.b.y)/2};
   const inside=roomPortal(room,mid);
   if(!inside||!inBounds(inside,room))continue;
   access.push(inside);
   result.push({roomId:room.id,kind:'door-approach',
    from:{x:clamp(mid.x,room.x+4,room.x+room.w-4),
      y:clamp(mid.y,room.y+4,room.y+room.h-4)},
    to:inside,radius:17});
  }
  // A primary public-through room should not become an accidental solid
  // storage maze. A narrow center spine is an advisory optional-prop budget.
  if(access.length>=2&&functionalSpacePlan(room).routePriority===3){
   const center={x:room.x+room.w/2,y:room.y+room.h/2};
   for(const from of access)result.push({
    roomId:room.id,kind:'through-route',from,to:center,radius:12});
  }
 }
 return result;
}
export function overlapsCirculationReservation(
 obstacle:Pick<Obstacle,'x'|'y'|'w'|'h'>,
 reservations:readonly CirculationReservation[],roomId:string):boolean{
 for(const lane of reservations)if(lane.roomId===roomId){
  const length=Math.hypot(lane.to.x-lane.from.x,lane.to.y-lane.from.y);
  const samples=Math.max(1,Math.ceil(length/8));
  for(let i=0;i<=samples;i++){
   const t=i/samples;
   const x=lane.from.x+(lane.to.x-lane.from.x)*t;
   const y=lane.from.y+(lane.to.y-lane.from.y)*t;
   if(Math.abs(x-obstacle.x)<obstacle.w/2+lane.radius&&
      Math.abs(y-obstacle.y)<obstacle.h/2+lane.radius)return true;
  }
 }
 return false;
}
