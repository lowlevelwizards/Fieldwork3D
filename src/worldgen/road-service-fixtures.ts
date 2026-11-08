/** Match the road drawn in Breach 3D: a nominal 85-unit street strip
 * running from the public entry to the closest encounter-map edge.
 * Service cabinets and bins are not authored as road traffic obstacles.
 * This is generator placement policy, not an extra motor collider.
 */
import type {Site} from '../breach-site.ts';
import type {Obstacle} from '../breach-core.ts';

const incompatibleRoadFixtures=new Set([
  'utility-cabinet','dumpster','recycling-bin','storage-tote',
  'supply-cart','shipping-container','trash-bin','trash-bag',
  'generator','pallet','barrel','crate'
]);

export function serviceFixtureInRoad(site:Pick<Site,
 'bounds'|'entrySide'|'entrance'>,
 fixture:string,box:Pick<Obstacle,'x'|'y'|'w'|'h'>):boolean{
 if(!incompatibleRoadFixtures.has(fixture))return false;
 const bounds=site.bounds??{minX:0,minY:0,maxX:640,maxY:740};
 const entry=site.entrySide??'south';
 const horizontal=entry==='east'||entry==='west';
 const edge=entry==='east'?bounds.maxX:entry==='west'?bounds.minX:
   entry==='north'?bounds.minY:bounds.maxY;
 const coordinate=horizontal?site.entrance.x:site.entrance.y;
 const low=Math.min(coordinate,edge)-5,high=Math.max(coordinate,edge)+5;
 if(horizontal)
   return box.x+box.w/2>low&&box.x-box.w/2<high&&
     Math.abs(box.y-site.entrance.y)<42.5+box.h/2;
 return box.y+box.h/2>low&&box.y-box.h/2<high&&
   Math.abs(box.x-site.entrance.x)<42.5+box.w/2;
}
