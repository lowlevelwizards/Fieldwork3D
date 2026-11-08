/** Service-yard access is an actual reserved clear corridor, not merely
 * decorative ground paint. This module only governs NEW prop placement.
 * Existing mission snapshots and replay prop transforms are untouched.
 */
import type {ExteriorZone} from '../breach-site.ts';
import type {Obstacle,Pt} from '../breach-core.ts';
import {planRearServiceMarks} from './rear-service-program.ts';

export const SERVICED_FACING_FIXTURES=new Set([
 'utility-cabinet','dumpster','screened-dumpster','recycling-bin',
 'supply-cart','shipping-container'
]);
/** Each facade/open-front of service infrastructure faces the middle access
 * lane. In the fixture mesh +Z is the serviced/front side, with rotation:
 * 0 northward (+map Y), 1 eastward (+map X), 2 south, 3 west.
 */
export function serviceFacingOrientation(zone:ExteriorZone,point:Pt):
 0|1|2|3{
 if(zone.w>=zone.h)return point.y<=zone.y?0:2;
 return point.x<=zone.x?1:3;
}
export function serviceEnvelope(zone:ExteriorZone,fixture:string,
 width:number,depth:number):{w:number;h:number}{
 if(!SERVICED_FACING_FIXTURES.has(fixture)||zone.w>=zone.h)
   return {w:width,h:depth};
 return {w:depth,h:width};
}
export function intersectsServiceAccess(
 zone:ExteriorZone,candidate:Pick<Obstacle,'x'|'y'|'w'|'h'>,
 margin=4):boolean{
 if(zone.kind!=='service')return false;
 const lane=planRearServiceMarks([zone]).find(mark=>mark.kind==='clear-route');
 if(!lane)return false;
 return Math.abs(candidate.x-lane.x)<(candidate.w+lane.width)/2+margin&&
  Math.abs(candidate.y-lane.y)<(candidate.h+lane.depth)/2+margin;
}
