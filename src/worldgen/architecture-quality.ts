/** Independent architectural sanity checks, not visual appearance tests.
 * Functional zones can consist of several adjoining room rectangles.
 */
import type {Site,Room} from '../breach-site.ts';
import {entryInteriorPoint} from './site-orientation.ts';
const area=(r:Room)=>r.w*r.h;
export type ArchitectureQuality={
 zones:number;nonrectangularZones:number;hallCells:number;
 guestRooms:number;livingKitchenRatio:number|null;
 entryPurpose:string;errors:string[];
};
export function assessArchitecture(site:Site):ArchitectureQuality{
 const functional=site.rooms.filter(r=>r.kind==='room');
 const grouped=new Map<string,Room[]>();
 for(const room of site.rooms){
  const id=room.zoneId??room.id;
  if(!grouped.has(id))grouped.set(id,[]);
  grouped.get(id)!.push(room);
 }
 let nonrectangularZones=0;
 for(const group of grouped.values()){
  if(group.length<2)continue;
  const minX=Math.min(...group.map(r=>r.x)),minY=Math.min(...group.map(r=>r.y));
  const maxX=Math.max(...group.map(r=>r.x+r.w)),maxY=Math.max(...group.map(r=>r.y+r.h));
  const combined=group.reduce((total,r)=>total+area(r),0);
  if((maxX-minX)*(maxY-minY)>combined*1.03)nonrectangularZones++;
 }
 const purposeArea=(purpose:string)=>site.rooms.filter(r=>r.purpose===purpose)
  .reduce((sum,r)=>sum+area(r),0);
 const living=purposeArea('living'),kitchen=purposeArea('kitchen');
 const livingKitchenRatio=living&&kitchen?living/kitchen:null;
 const guests=functional.filter(r=>r.purpose==='guest').length;
 const front=site.doors.find(d=>d.id==='FRONT');
 const entry=entryInteriorPoint(site);
 const frontRoom=entry&&site.rooms.find(r=>entry.x>r.x&&entry.x<r.x+r.w&&
   entry.y>r.y&&entry.y<r.y+r.h);
 const entryPurpose=frontRoom?.purpose??'unknown';
 const errors:string[]=[];
 if(site.programLocked){
  if(!front)errors.push('missing physical front door');
  if(['clinic','motel','office','retail'].includes(site.archetype??'')&&
    !['waiting','reception','lobby','sales','hallway'].includes(entryPurpose))
    errors.push('inappropriate public entrance: '+entryPurpose);
  if(site.archetype==='motel'&&guests<4)errors.push('motel has fewer than four guest rooms');
  if(site.archetype==='house'&&livingKitchenRatio!==null&&livingKitchenRatio<.85)
    errors.push('kitchen larger than primary living zone');
  if(site.archetype==='restaurant'&&purposeArea('dining')<purposeArea('kitchen'))
    errors.push('restaurant dining smaller than kitchen');
  for(const r of site.rooms.filter(r=>r.kind==='hall'))
    if(Math.min(r.w,r.h)>84)errors.push('square corridor cell '+r.id);
 }
 return {zones:grouped.size,nonrectangularZones,
   hallCells:site.rooms.filter(r=>r.kind==='hall').length,
   guestRooms:guests,livingKitchenRatio,entryPurpose,errors};
}
