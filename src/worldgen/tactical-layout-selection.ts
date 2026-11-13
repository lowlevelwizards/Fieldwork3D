/** C2: choose between TWO already generated, contract-equivalent physical sites.
 * Not a new generation pass, not a live AI spatial query.
 * No unverified paths, unseen enemy targets or imaginary cover added.
 */
import type {Site,Room} from '../breach-site.ts';
import type {OperationKind} from '../breach-operations.ts';
import {describeSiteTopology,preferTopologyCandidate} from './topology-diversity.ts';
import {engagementRoomRelevant} from './room-sightline-audit.ts';
const inRoom=(r:Room,x:number,y:number)=>x>=r.x&&x<=r.x+r.w&&
 y>=r.y&&y<=r.y+r.h;
const onEdge=(r:Room,x:number,y:number)=>x>=r.x-8&&
 x<=r.x+r.w+8&&y>=r.y-8&&y<=r.y+r.h+8&&
 Math.min(Math.abs(x-r.x),Math.abs(x-r.x-r.w),
  Math.abs(y-r.y),Math.abs(y-r.y-r.h))<8;
export type TacticalLayoutOpportunity={
 alternateEntries:number;usableEngagementRooms:number;
 thresholdCoverRooms:number;longEngagementRooms:number;
 junctions:number;cycles:number;
};
/** Bounded read of actual compiled door, room, and furniture relationships.
 * A decorative surface is never counted as a physical tactical advantage.
 */
export function describeTacticalLayout(site:Site):TacticalLayoutOpportunity{
 const rooms=site.rooms.filter(engagementRoomRelevant);
 const doors=[...site.doors,...(site.openings??[])];
 let usableEngagementRooms=0,thresholdCoverRooms=0,longEngagementRooms=0;
 for(const room of rooms){
  let thresholds=0;
  for(const door of doors){
   const x=(door.a.x+door.b.x)/2,y=(door.a.y+door.b.y)/2;
   if(onEdge(room,x,y))thresholds++;
  }
  if(!thresholds)continue;
  usableEngagementRooms++;
  let physicalCover=false;
  for(const prop of site.cover){
   if(!prop.fixture||prop.destroyed||!inRoom(room,prop.x,prop.y))continue;
   // Clutter smaller than a boot cannot create a tactical firing position.
   if(prop.w<22||prop.h<12)continue;
   physicalCover=true;break;
  }
  if(physicalCover)thresholdCoverRooms++;
  if(Math.max(room.w,room.h)>=190)longEngagementRooms++;
 }
 const exterior=site.doors.filter(door=>
  door.id==='FRONT'||door.id.startsWith('SERVICE')||
  door.id.startsWith('COURT')||door.id.startsWith('GARAGE')).length;
 const topology=describeSiteTopology(site);
 return {alternateEntries:Math.max(0,exterior-1),
  usableEngagementRooms,thresholdCoverRooms,longEngagementRooms,
  junctions:topology.branchRooms,cycles:topology.circulationCycles};
}
/** Only call when functional, unit, mobility, and service penalties match.
 * Different incidents favor different *real* opportunities, while seed
 * variation avoids a universal 'more cover' solution.
 */
export function preferTacticalLayoutCandidate(
 candidate:Site,incumbent:Site,seed:number,mission:OperationKind):boolean{
 const a=describeTacticalLayout(candidate),b=describeTacticalLayout(incumbent);
 const mode=(Math.imul(seed>>>0,2654435761)>>>0)%3;
 const value=(x:TacticalLayoutOpportunity)=>{
  const routes=Math.min(3,x.alternateEntries);
  const cover=Math.min(6,x.thresholdCoverRooms);
  const lanes=Math.min(4,x.longEngagementRooms);
  const junctions=Math.min(4,x.junctions);
  if(mission==='capture'||mission==='rescue')
   return routes*2+cover*1.5+junctions*(mode===0?2:.4)+
     (mode===2?lanes:Math.min(2,lanes));
  if(mission==='intel')
   return routes*1.5+cover+lanes*(mode===1?2:1)+
     Math.min(2,x.cycles)*(mode===0?2:.5);
  return routes+cover*(mode===0?2:1)+lanes*(mode===1?2:1)+
    junctions*(mode===2?1.5:.2);
 };
 const x=value(a),y=value(b);
 if(Math.abs(x-y)>.01)return x>y;
 const c=describeSiteTopology(candidate),i=describeSiteTopology(incumbent);
 return preferTopologyCandidate(c,i,0,0,seed);
}
