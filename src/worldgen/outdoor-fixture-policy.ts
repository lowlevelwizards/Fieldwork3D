/** Outdoor fixtures have roles, not random map-lawn eligibility.
 * Every candidate still goes through the authoritative worldgen door,
 * arrival access, spawn, room and cover-clearance checks.
 */
import type {Site,ExteriorZone} from '../breach-site.ts';
import type {Pt} from '../breach-core.ts';
import {planPublicStreet} from './public-street-layout.ts';
import {reservedParkingBay} from './parking-stalls.ts';

const housing=new Set(['house','townhouse']);
const publicPremises=new Set(['retail','restaurant','clinic','motel']);
const frontageFixtures=new Set([
 'mailbox','parking-sign','street-lamp','hydrant','bike-rack','bollard',
 'public-bench','vending-machine','wayfinding-sign'
]);
export function outdoorFixtureAllowed(site:Pick<Site,'archetype'>,
 zone:ExteriorZone,item:string):boolean{
 const front=zone.id==='arrival-forecourt';
 const type=site.archetype??'house';
 if(item==='mailbox')return front&&housing.has(type);
 if(item==='vending-machine')return front&&
   ['retail','restaurant','motel'].includes(type);
 if(item==='wayfinding-sign')return front&&
   ['retail','restaurant','clinic','motel','office'].includes(type);
 if(item==='screened-dumpster')return zone.kind==='service'&&
   zone.id!=='arrival-forecourt';
 if(item==='parking-sign')return front&&zone.kind==='parking';
 if(item==='hydrant')return front; // municipal street, never inside a garden
 if(item==='street-lamp')return front&&
   (zone.kind==='parking'||zone.kind==='driveway'||
     zone.kind==='yard');
 if(item==='public-bench')return front&&publicPremises.has(type)||
   zone.kind==='patio'&&['restaurant','motel'].includes(type);
 if(item==='bike-rack')return front&&publicPremises.has(type)||
   zone.kind==='patio'&&publicPremises.has(type);
 if(item==='utility-cabinet')return zone.kind==='service'&&
   zone.id!=='arrival-forecourt';
 if(item==='dumpster'||item==='recycling-bin'||
    item==='shipping-container'||item==='storage-tote')
   return zone.kind==='service';
 if(item==='parking-block')return false; // authored with actual bay markings
 if(item==='bollard')return zone.kind==='service'||front&&
   (zone.kind==='parking'||zone.kind==='driveway');
 return true;
}
/** Street-oriented hardware belongs at the *edges* of the public frontage,
 * never at an arbitrary point in the pedestrian centerline or carriageway.
 * The approach/collision validator can still reject unsuitable positions.
 */
export function frontageEdgeCandidates(
 site:Pick<Site,'entrySide'> & Partial<Pick<Site,
   'bounds'|'rooms'|'entrance'|'doors'|'exteriorZones'>>,zone:ExteriorZone,
 fixture:string,w:number,h:number):Pt[]|null{
 if(!frontageFixtures.has(fixture)||zone.id!=='arrival-forecourt')
   return null;
 const entry=site.entrySide??'south';
 // A parking sign identifies a real authored bay, never a random post at
 // the front property corners. No canonical bay -> no sign.
 // Commercial vending belongs along an approachable, paved facade, not
 // an arbitrary curbside post or a machine stranded in a rear service pad.
 if(fixture==='vending-machine'&&site.rooms?.length&&site.entrance){
   const frontage=entry==='north'?Math.min(...site.rooms.map(r=>r.y)):
     entry==='south'?Math.max(...site.rooms.map(r=>r.y+r.h)):
     entry==='east'?Math.max(...site.rooms.map(r=>r.x+r.w)):
     Math.min(...site.rooms.map(r=>r.x));
   const sign=entry==='north'||entry==='west'?-1:1;
   const normal=(entry==='north'||entry==='south')?'y':'x';
   const along=normal==='y'?'x':'y';
   const main=along==='x'?site.entrance.x:site.entrance.y;
   const roomSide=along==='x'?w:h;
   // Short side-facing forecourts cannot accommodate a fixed 77-unit
   // displacement. Keep the whole kiosk in the forecourt while protecting
   // at least the regular entrance clearance.
   const sideRoom=along==='x'?zone.w:zone.h;
   const limit=sideRoom/2-roomSide/2-8;
   if(limit<58)return [];
   const displacement=Math.min(77,limit);
   const transverse=frontage+sign*(26+(normal==='x'?w:h)*.20);
   return [-1,1].map(dir=>along==='x'?
     {x:main+dir*displacement,y:transverse}:
     {x:transverse,y:main+dir*displacement});
 }
 if(fixture==='parking-sign'&&zone.kind==='parking'&&
    site.doors&&site.entrance){
   const bay=reservedParkingBay({
     entrySide:site.entrySide,doors:site.doors,entrance:site.entrance
   },zone);
   if(!bay)return [];
   const sign=entry==='south'||entry==='east'?1:-1;
   const across=entry==='north'||entry==='south'?'y':'x';
   const edge=across==='y'?
     zone.y-sign*(zone.h/2-h/2-10):
     zone.x-sign*(zone.w/2-w/2-10);
   return [across==='y'?{x:bay.x,y:edge}:{x:edge,y:bay.y}];
 }
 const across=entry==='north'||entry==='south'?'y':'x';
 const along=across==='y'?'x':'y';
 const sign=entry==='north'||entry==='west'?-1:1;
 const long=along==='x'?zone.w:zone.h;
 const depth=across==='x'?zone.w:zone.h;
 const longSize=along==='x'?w:h;
 const depthSize=across==='x'?w:h;
 if(long<longSize+28||depth<depthSize+22)return [];
 let outer=(across==='x'?zone.x:zone.y)+
   sign*(depth/2-depthSize/2-9);
 // Road furniture belongs just INSIDE the sidewalk's property-facing
 // boundary, not on the road itself. Respect forecourts that don't reach
 // all the way to the curb on deeper lots.
 if(site.rooms?.length&&site.entrance){
   const street=planPublicStreet({
     entrySide:site.entrySide,rooms:site.rooms,
     entrance:site.entrance,doors:site.doors,
     bounds:site.bounds,exteriorZones:site.exteriorZones
   });
   if(street){
     const strip=street.sidewalk??street.road;
     const near=across==='x'?strip.x:strip.y;
     const thickness=across==='x'?strip.width:strip.depth;
     const inward=near-sign*(thickness/2+depthSize/2+4);
     outer=sign>0?Math.min(outer,inward):Math.max(outer,inward);
   }
 }
 const coordinate=(along==='x'?zone.x:zone.y);
 const end=long/2-longSize/2-12;
 const sides=[coordinate-end,coordinate+end];
 return sides.map(edge=>along==='x'?
   {x:edge,y:outer}:{x:outer,y:edge});
}
