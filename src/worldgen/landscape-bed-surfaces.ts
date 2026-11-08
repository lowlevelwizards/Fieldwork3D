/** Visual-only planting beds derived from successful physical foliage
 * placements. Ground finish must never imply a tree or bush that wasn't
 * actually generated, or add an invisible obstacle to navigation.
 */
import type {Site,ExteriorZone} from '../breach-site.ts';
import type {Obstacle} from '../breach-core.ts';
import {overlapsArrivalLane} from './property-access-lane.ts';
import {overlapsPublicStreetRoad} from './public-street-layout.ts';

export type LandscapeBedMark={
 kind:'planting-bed'|'planting-edge';
 x:number;y:number;width:number;depth:number;zoneId:string
};
const greenery=new Set([
 'tree','tree-broadleaf','tree-conifer','tree-scrub',
 'shrub-round','shrub-tall','hedge','bush'
]);
const intersects=(a:{x:number;y:number;w:number;h:number},
 b:{x:number;y:number;w:number;h:number},pad=0)=>
 Math.abs(a.x-b.x)<(a.w+b.w)/2+pad&&
 Math.abs(a.y-b.y)<(a.h+b.h)/2+pad;
const clamp=(value:number,min:number,max:number)=>
 Math.min(max,Math.max(min,value));
function bedForGroup(site:Site,zone:ExteriorZone,group:Obstacle[],
 outer:1|-1):LandscapeBedMark[] {
 if(!group.length)return [];
 const broad=zone.w>=zone.h;
 const centerAlong=(broad?zone.x:zone.y);
 const zoneLength=broad?zone.w:zone.h;
 const zoneDepth=broad?zone.h:zone.w;
 const along=(p:Obstacle)=>broad?p.x:p.y;
 const across=(p:Obstacle)=>broad?p.y:p.x;
 const sizeAlong=(p:Obstacle)=>broad?p.w:p.h;
 const sizeAcross=(p:Obstacle)=>broad?p.h:p.w;
 const minAlong=Math.min(...group.map(p=>along(p)-sizeAlong(p)/2));
 const maxAlong=Math.max(...group.map(p=>along(p)+sizeAlong(p)/2));
 const length=Math.min(zoneLength-14,Math.max(30,maxAlong-minAlong+18));
 const short=Math.min(zoneDepth-14,
   Math.max(19,Math.min(31,Math.max(...group.map(sizeAcross))+8)));
 if(length<=0||short<=0)return [];
 const a=clamp((minAlong+maxAlong)/2,
   centerAlong-zoneLength/2+7+length/2,
   centerAlong+zoneLength/2-7-length/2);
 const otherCenter=broad?zone.y:zone.x;
 const b=clamp(group.reduce((sum,p)=>sum+across(p),0)/group.length,
   otherCenter-zoneDepth/2+7+short/2,
   otherCenter+zoneDepth/2-7-short/2);
 const box={x:broad?a:b,y:broad?b:a,
   w:broad?length:short,h:broad?short:length};
 if(overlapsArrivalLane(site,zone,box)||
    overlapsPublicStreetRoad(site,box)||
    site.rooms.some(room=>intersects(box,{
      x:room.x+room.w/2,y:room.y+room.h/2,
      w:room.w,h:room.h},2))||
    site.doors.some(door=>intersects(box,{
      x:(door.a.x+door.b.x)/2,y:(door.a.y+door.b.y)/2,
      w:21,h:21},8)))
   return [];
 const fill:LandscapeBedMark={kind:'planting-bed',zoneId:zone.id,
   x:box.x,y:box.y,width:box.w,depth:box.h};
 const border:LandscapeBedMark={kind:'planting-edge',zoneId:zone.id,
   x:broad?box.x:box.x+outer*(short/2-1.3),
   y:broad?box.y+outer*(short/2-1.3):box.y,
   width:broad?Math.max(20,length-2):2,
   depth:broad?2:Math.max(20,length-2)};
 return [fill,border];
}
/** At most two coherent bed groups per zone; pairs are generated near
 * lot edges, but these spans are calculated from actually accepted plants.
 */
export function planLandscapeBedMarks(site:Site):LandscapeBedMark[]{
 const marks:LandscapeBedMark[]=[];
 for(const zone of site.exteriorZones??[]){
   if((zone.kind!=='garden'&&zone.kind!=='yard')||
      zone.w<70||zone.h<45)continue;
   const broad=zone.w>=zone.h;
   const plants=site.cover.filter(c=>
     greenery.has(c.fixture??'')&&
     Math.abs(c.x-zone.x)<zone.w/2-5&&
     Math.abs(c.y-zone.y)<zone.h/2-5&&
     !site.rooms.some(r=>c.x>=r.x&&c.x<=r.x+r.w&&
       c.y>=r.y&&c.y<=r.y+r.h));
   if(!plants.length)continue;
   for(const sign of [-1,1] as const){
     const selected=plants.filter(p=>
       (broad?p.y-zone.y:p.x-zone.x)*sign>=0)
       .sort((a,b)=>(broad?a.x-b.x:a.y-b.y));
     if(!selected.length)continue;
     // A cluster is connected only if accepted vegetation is near enough
     // to share one real planting bed. Distant trees remain separate.
     const group:Obstacle[]=[];
     for(const p of selected){
       if(group.length>=3)break;
       const last=group[group.length-1];
       if(last&&Math.abs((broad?p.x-last.x:p.y-last.y))>75)break;
       group.push(p);
     }
     marks.push(...bedForGroup(site,zone,group,sign));
   }
 }
 return marks;
}
