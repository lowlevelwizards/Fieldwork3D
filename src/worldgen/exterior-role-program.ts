/** V18.1 pure exterior role recipes. Placement and tactical validation
 * remain owned by exterior-sites. No vehicle or retired foliage candidates.
 * Ordered alternatives are intentional: first viable representative wins.
 */
import type {BuildingArchetype,ExteriorZone} from '../breach-site.ts';
export type ExteriorRoleRequest={role:string;alternatives:readonly string[]};
const role=(name:string,...alternatives:string[]):ExteriorRoleRequest=>({role:name,alternatives});
const waste=role('refuse','screened-dumpster','dumpster','recycling-bin','trash-bin');
const utilities=role('utility','utility-cabinet','storage-tote');
const freight=role('freight','pallet','crate','storage-tote');
const seat=role('seating','public-bench','picnic-table','patio-chair');
const tree=role('shade','tree-broadleaf','tree-scrub');
const bin=role('small-refuse','trash-bin','recycling-bin');
const sign=role('wayfinding','wayfinding-sign','parking-sign');
const lights=role('street-infrastructure','street-lamp','hydrant');
const hydrant=role('municipal-water','hydrant');
const vending=role('customer-service','vending-machine');
export function exteriorRoleRequests(kind:BuildingArchetype,zone:ExteriorZone,seed=0):readonly ExteriorRoleRequest[]{
 const residential=['house','townhouse','apartment','motel'].includes(kind);
 const industrial=['garage','warehouse','utility'].includes(kind);
 const front=zone.id==='arrival-forecourt';
 const court=zone.id.startsWith('court-');
 if(court&&Math.min(zone.w,zone.h)<78)return [];
 if(zone.kind==='service'){
  if(court)return industrial?[utilities,freight]:[bin];
  if(kind==='garage')return [utilities,role('repair','tire-stack','tool-chest','compressor'),waste,freight,role('edge-protection','bollard')];
  if(kind==='warehouse')return [...(seed%4===0?[waste,freight]:[freight,waste]),utilities,role('storage','shipping-container','storage-tote','crate'),role('edge-protection','bollard')];
  if(kind==='utility')return [utilities,role('maintenance','cable-reel','storage-tote'),waste,role('edge-protection','bollard')];
  return [waste,freight,utilities,bin];
 }
 if(front&&zone.kind==='parking'){
  const parking=role('parking-identification','parking-sign');
  // Rotate optional frontage priorities across seeds so scarce legal
  // space doesn't eliminate a whole fixture family from the population.
  const street=seed%2===0?[lights,hydrant]:[hydrant,lights];
  const amenities=[vending,seat,...street];
  const shift=((seed%4)+4)%4;
  const rotated=[...amenities.slice(shift),...amenities.slice(0,shift)];
  return kind==='clinic'?[seat,sign,parking,...street,role('edge-protection','bollard'),bin]:
    [parking,...rotated,sign,role('bike-parking','bike-rack'),role('edge-protection','bollard'),bin];
 }
 if(front&&zone.kind==='driveway')return [role('edge-protection','bollard'),sign,lights,bin];
 if(front&&['house','townhouse'].includes(kind))return [role('postal','mailbox'),tree,bin,role('porch-seating','patio-chair','picnic-table'),lights];
 if(front&&kind==='apartment')return [seat,tree,bin,lights];
 if(front)return [sign,seat,vending,lights,hydrant,role('bike-parking','bike-rack'),bin];
 if(zone.kind==='patio')return kind==='restaurant'?[role('outdoor-dining','picnic-table','patio-chair'),role('additional-seat','patio-chair'),bin]:[seat,bin,role('amenity','bike-rack','patio-chair')];
 if(zone.kind==='garden')return residential?[tree,role('outdoor-living','picnic-table','patio-chair'),role('yard-use','grill','shed'),bin]:[tree,seat,bin];
 if(zone.kind==='yard')return residential?[bin,tree,role('yard-storage','shed','storage-tote')]:[bin,seat];
 return [];
}
/** Initial conservative request budget. Counts only requested roles, not
 * guaranteed physical fixtures. Constrained sites may remain sparse. */
export function exteriorRoleBudget(zone:ExteriorZone):number{
 const area=zone.w*zone.h,short=Math.min(zone.w,zone.h);
 if(short<36)return 0;
 if(zone.id.startsWith('court-')&&short<78)return 0;
 return Math.min(7,Math.max(1,Math.floor(area/3200)+1));
}
