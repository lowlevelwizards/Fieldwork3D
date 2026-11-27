import {PACK_PROFILES,type PackStyle} from './operator-backpack-catalog.ts';
import type {PackMountMode} from './operator-equipment-assembly.ts';
import type {EquipmentLoadout} from './equipment-loadouts.ts';
import type {CarryLocation,CarryPlacement} from './equipment-carry-placement.ts';
import type {MagazineItem} from './breach-magazines.ts';
import {FIELD_ITEMS} from './equipment-field-inventory.ts';
import {EQUIPMENT_CATALOG} from './equipment-catalog.ts';
/** Visual-only mass proxy. Existing deployed IDs and round counts refine
 * suspension without rebuilding static appearance or altering encumbrance. */
const roundCount=(n:number)=>Number.isFinite(n)?Math.max(0,Math.min(100,n)):0;
export function packPrimaryMagazineMass(magazines:readonly MagazineItem[],
 placements:readonly Pick<CarryPlacement,'id'|'location'>[]){
 let kg=0;
 for(const place of placements){
  if(place.location!=='backpack')continue;
  const mag=magazines.find(m=>m.id===place.id);
  if(mag)kg+=.12+roundCount(mag.rounds)*.008;
 }
 return kg;
}
export function packCargoMass(kit:EquipmentLoadout|undefined,magazines:readonly CarryLocation[]=[],
 medical?:CarryLocation,utility?:CarryLocation,primaryMass?:number){
 let kg=Number.isFinite(primaryMass)?Math.max(0,primaryMass!):0;
 if(!Number.isFinite(primaryMass))for(const loc of magazines)if(loc==='backpack')kg+=.32;
 for(const mag of kit?.secondary?.spareMagazines??[])if(mag.location==='backpack')kg+=.12+roundCount(mag.rounds)*.005;
 for(const stack of kit?.fieldInventory?.stacks??[])if(stack.location==='backpack')
  kg+=Math.max(0,stack.quantity)*(FIELD_ITEMS[stack.itemId]?.massKg??0);
 if(kit&&medical==='backpack')kg+=EQUIPMENT_CATALOG[kit.slots.medical]?.massKg??0;
 if(kit&&utility==='backpack'&&kit.slots.utility!=='utility-wedge')kg+=EQUIPMENT_CATALOG[kit.slots.utility]?.massKg??0;
 return kg;
}
/** No independent spring, time accumulation or geometry updates. A rigid
 * mount has zero relative motion. Framed loads remain tightly constrained;
 * light packs have slightly more freedom. */
export function packSuspensionScale(style:PackStyle,mode:PackMountMode|undefined,cargoKg:number){
 if(style==='no-pack'||mode==='direct'||mode==='adapter')return 0;
 const p=PACK_PROFILES[style];
 const mass=Number.isFinite(cargoKg)?Math.max(0,cargoKg):0;
 const tension=1/(1+mass/(p.massKg+1.2)*.25);
 const suspension=mode==='shared'?.60:p.harness==='load-bearing'?.65:1;
 return Math.min(.85,p.motion*tension*suspension);
}
