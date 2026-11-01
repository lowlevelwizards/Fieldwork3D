/** Small bounded role-specific furnishing variation.
 * Required room contracts are handled by the existing recovery system;
 * only optional assets are offered here. This changes functional meaning
 * instead of distributing the same office chair in every building.
 */
import type {BuildingArchetype,Room} from '../breach-site.ts';
export type ExtraOperationalFixture={id:string;
 anchor:'nw'|'ne'|'sw'|'se'|'west'|'east'|'center'};
const pick=(seed:number,room:Room)=>
 (Math.imul((seed>>>0)^Math.imul(room.x|0,1664525)^Math.imul(room.y|0,1013904223),
  2246822519)>>>0)%3;
export function optionalOperationalFixtures(kind:BuildingArchetype|undefined,
 room:Room,subtype:string|undefined,seed:number):ExtraOperationalFixture[]{
 if(room.kind==='hall'||room.w*room.h<18000)return [];
 const variant=pick(seed,room),purpose=room.purpose??'';
 if(kind==='house'||kind==='townhouse'||kind==='apartment'){
  if(purpose==='mudroom')return variant===0?[{id:'shoe-cubby',anchor:'se'}]:
   [{id:'coat-rack',anchor:'west'}];
  if(purpose==='living'&&room.w*room.h>28000)
   return variant===0?[{id:'bookcase',anchor:'east'}]:
    variant===1?[{id:'armchair',anchor:'ne'}]:[];
 }
 if(kind==='restaurant'){
  if(purpose==='dining'){
   if(subtype==='cafe')return variant===0?[{id:'bar-stool',anchor:'east'}]:[];
   if(subtype==='diner')return variant===2?[{id:'diner-booth',anchor:'west'}]:[];
   return variant===1?[{id:'side-table',anchor:'east'}]:[];
  }
  if(purpose==='kitchen')return variant===0?[{id:'dish-rack',anchor:'east'}]:
   variant===1?[{id:'upright-freezer',anchor:'ne'}]:[];
 }
 if(kind==='retail'){
  if(purpose==='sales')return subtype==='convenience-store'?
   (variant===0?[{id:'refrigerated-display',anchor:'east'}]:[]):
    variant===1?[{id:'display-rack',anchor:'west'}]:[];
  if(purpose==='stockroom')return variant===2?[{id:'storage-tote',anchor:'ne'}]:[];
 }
 if(kind==='motel'){
  if(purpose==='guest')return variant===0?[{id:'desk',anchor:'east'}]:
    variant===1?[{id:'nightstand',anchor:'ne'}]:[];
  if(purpose==='laundry')return variant!==0?[{id:'linen-cart',anchor:'sw'}]:[];
 }
 if(kind==='office'){
  if(purpose==='meeting')return variant===2?[{id:'office-chair',anchor:'east'}]:[];
  if(purpose==='break')return variant===1?[{id:'fridge',anchor:'se'}]:[];
 }
 if(kind==='clinic'){
  if(purpose==='supply')return variant===2?[{id:'linen-cart',anchor:'ne'}]:[];
  if(purpose==='treatment')return variant===1?[{id:'instrument-cart',anchor:'sw'}]:[];
 }
 // Garage bays and parts aisles already have specialized base equipment.
 // Never add discretionary solid cover to these tight combat/service routes.
 if(kind==='garage')return [];
 if(kind==='warehouse'){
  if(purpose==='packing')return variant===0?[{id:'supply-cart',anchor:'se'}]:[];
  if(purpose==='loading')return variant===1?[{id:'storage-tote',anchor:'ne'}]:[];
 }
 if(kind==='utility'){
  if(purpose==='maintenance')return variant===2?[{id:'step-ladder',anchor:'east'}]:[];
  if(purpose==='service')return variant===0?[{id:'mop-bucket',anchor:'ne'}]:[];
 }
 return [];
}
