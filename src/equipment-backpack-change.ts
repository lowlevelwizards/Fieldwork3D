import {canonicalPackEquipment} from './operator-backpack-catalog.ts';
import {equipmentAssembly} from './operator-equipment-assembly.ts';
import {quoteCarryGearChange} from './equipment-carry-gear-change.ts';
import {secondaryCarryClaim} from './equipment-magazine-placement.ts';
import {initialFieldInventory,type FieldInventory} from './equipment-field-inventory.ts';
import type {EquipmentLoadout} from './equipment-loadouts.ts';
import type {MagazineItem} from './breach-magazines.ts';
/** Explicit change only: never silently replace a saved legacy carrier.
 * Caller owns issue/stock checks and committing the returned transaction. */
export function quoteBackpackChoice(kit:EquipmentLoadout,magazines:readonly MagazineItem[],
 style:string,armor:string,rig:string,inventory:FieldInventory=kit.fieldInventory??initialFieldInventory(kit)){
 const id=canonicalPackEquipment(style);
 if(!id)return {ok:false as const,reason:'UNKNOWN BACKPACK'};
 if(!equipmentAssembly(style,armor,rig).compatible)
  return {ok:false as const,reason:'COMPATIBLE REAR ARMOR REQUIRED'};
 const result=quoteCarryGearChange(kit,magazines,'backpack',id,inventory);
 if(!result.ok)return result;
 if(!secondaryCarryClaim(result.kit).valid)
  return {ok:false as const,reason:'SECONDARY CARRY CAPACITY EXCEEDED',preview:result.preview};
 const before=kit.secondary?.spareMagazines??[],after=result.kit.secondary?.spareMagazines??[];
 if(before.length!==after.length||after.some(m=>!before.some(old=>old.id===m.id&&old.rounds===m.rounds)))
  return {ok:false as const,reason:'SECONDARY MAGAZINE OWNERSHIP WOULD CHANGE',preview:result.preview};
 return result;
}
