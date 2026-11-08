/** Outdoor fixtures have roles, not random map-lawn eligibility.
 * Every candidate still goes through the authoritative worldgen door,
 * arrival access, spawn, room and cover-clearance checks.
 */
import type {Site,ExteriorZone} from '../breach-site.ts';
import type {Pt} from '../breach-core.ts';

const housing=new Set(['house','townhouse']);
const publicPremises=new Set(['retail','restaurant','clinic','motel']);
const frontageFixtures=new Set([
 'mailbox','parking-sign','street-lamp','hydrant','bike-rack','bollard'
]);
export function outdoorFixtureAllowed(site:Pick<Site,'archetype'>,
 zone:ExteriorZone,item:string):boolean{
 const front=zone.id==='arrival-forecourt';
 const type=site.archetype??'house';
 if(item==='mailbox')return front&&housing.has(type);
 if(item==='parking-sign')return front&&zone.kind==='parking';
 if(item==='hydrant')return front; // municipal street, never inside a garden
 if(item==='street-lamp')return front&&
   (zone.kind==='parking'||zone.kind==='driveway');
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
 site:Pick<Site,'entrySide'>,zone:ExteriorZone,
 fixture:string,w:number,h:number):Pt[]|null{
 if(!frontageFixtures.has(fixture)||zone.id!=='arrival-forecourt')
   return null;
 const entry=site.entrySide??'south';
 const across=entry==='north'||entry==='south'?'y':'x';
 const along=across==='y'?'x':'y';
 const sign=entry==='north'||entry==='west'?-1:1;
 const long=along==='x'?zone.w:zone.h;
 const depth=across==='x'?zone.w:zone.h;
 const longSize=along==='x'?w:h;
 const depthSize=across==='x'?w:h;
 if(long<longSize+28||depth<depthSize+22)return [];
 const outer=(across==='x'?zone.x:zone.y)+
   sign*(depth/2-depthSize/2-9);
 const coordinate=(along==='x'?zone.x:zone.y);
 const end=long/2-longSize/2-12;
 const sides=[coordinate-end,coordinate+end];
 return sides.map(edge=>along==='x'?
   {x:edge,y:outer}:{x:outer,y:edge});
}
