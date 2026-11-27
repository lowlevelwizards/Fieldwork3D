import {PACK_PROFILES,type PackStyle} from './operator-backpack-catalog.ts';
import type {PackMountMode} from './operator-equipment-assembly.ts';
import type {EquipmentLoadout} from './equipment-loadouts.ts';
import type {CarryLocation} from './equipment-carry-placement.ts';
import {FIELD_ITEMS} from './equipment-field-inventory.ts';
import {EQUIPMENT_CATALOG} from './equipment-catalog.ts';
/** Visual-only mass proxy. Field items and tools use catalog masses; magazines
 * use a representative loaded mass because this appearance input has locations
 * but not actual round counts. Never used for gameplay encumbrance. */
export function packCargoMass(kit:EquipmentLoadout|undefined,magazines:readonly CarryLocation[]=[],
 medical?:CarryLocation,utility?:CarryLocation){
 let kg=0;
 for(const loc of magazines)if(loc==='backpack')kg+=.32;
 for(const mag of kit?.secondary?.spareMagazines??[])if(mag.location==='backpack')kg+=.20;
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
