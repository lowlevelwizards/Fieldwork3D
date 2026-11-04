/** Small context score for the physically validated encounter placement
 * candidates. A defender needs a plausible furnished position and a real
 * approach; this NEVER creates cover, introduces new walls, or overrides
 * room capacity, spawn clearance, A* or actor spacing.
 */
import type {Room,Site} from '../breach-site.ts';
import type {EncounterProfile} from './encounter-types.ts';
const near=(a:{x:number;y:number},b:{x:number;y:number})=>
 Math.hypot(a.x-b.x,a.y-b.y);
export function tacticalDefenderRoomScore(
 room:Room,cover:Readonly<Site['cover']>,
 doors:Readonly<Site['doors']>,profile:EncounterProfile
):number{
 const center={x:room.x+room.w/2,y:room.y+room.h/2};
 const inside=(p:{x:number;y:number})=>p.x>=room.x&&
  p.x<=room.x+room.w&&p.y>=room.y&&p.y<=room.y+room.h;
 const furnished=cover.filter(o=>o.fixture&&
  o.fixture!=='window-sill'&&o.fixture!=='glass-barrier'&&
  inside({x:o.x,y:o.y})).length;
 const thresholds=doors.filter(d=>{
  const p={x:(d.a.x+d.b.x)/2,y:(d.a.y+d.b.y)/2};
  return near(p,center)<=Math.hypot(room.w,room.h)/2+8&&
    (Math.abs(p.x-room.x)<12||Math.abs(p.x-room.x-room.w)<12||
     Math.abs(p.y-room.y)<12||Math.abs(p.y-room.y-room.h)<12);
 }).length;
 const sensitive=['bathroom','restroom','closet','utility-closet'];
 const cramped=sensitive.includes(room.purpose??'')?-24:0;
 const coverValue=Math.min(24,furnished*8);
 if(profile==='prepared')return cramped+coverValue+
   (thresholds>0?Math.min(18,thresholds*9):-8);
 if(profile==='active')return cramped+Math.min(22,furnished*7);
 if(profile==='clustered')return cramped+Math.min(12,furnished*4);
 return cramped+Math.min(12,furnished*3);
}
