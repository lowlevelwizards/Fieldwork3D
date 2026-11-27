/** Equipment 02: saved per-operator choices. Item ownership and placement
 * are separate later contracts, never inferred from the choices here. */
import {DEFAULT_EQUIPMENT,LOADOUT_SLOTS,EQUIPMENT_CATALOG,
 validEquipmentChoice,equipmentMass,type EquipmentSlot} from './equipment-catalog.ts';
import type {FieldInventory} from './equipment-field-inventory.ts';
import {initialFieldInventory,readFieldInventory,fieldQuantity,fieldInventoryMass} from './equipment-field-inventory.ts';
import type {WeaponId} from './breach-combat.ts';
import {emptySecondaryEquipment,readSecondaryEquipment,secondaryLoadMass,
 placeSecondaryMagazines,type SecondaryCarrierSpace,
 type SecondaryEquipment} from './secondary-equipment.ts';
import {resolveWeaponAssembly,WEAPON_PLATFORMS,
 type WeaponConfiguration} from './equipment-weapon-assemblies.ts';

export type LoadoutSlot=Exclude<EquipmentSlot,'secondary'>;
export type EquipmentLoadout={version:1;slots:Record<LoadoutSlot,string>;fieldInventory?:FieldInventory;
 /** S2 independent sidearm preparation; not yet a simulated active firearm. */
 secondary?:SecondaryEquipment};
/** Physical magazine-equivalent carrier spaces before primary magazine issue. */
export function secondaryCarrierSpace(loadout:EquipmentLoadout):SecondaryCarrierSpace{
 const capacity=(id:string)=>Math.max(0,EQUIPMENT_CATALOG[id]?.capacity??0);
 return {rig:capacity(loadout.slots.rig),belt:capacity(loadout.slots.belt),
  backpack:capacity(loadout.slots.backpack),pocket:1};
}
const weaponItem=(weapon:WeaponId)=>'primary-'+weapon;
const isWeapon=(weapon:unknown):weapon is WeaponId=>
 weapon==='carbine'||weapon==='smg'||weapon==='rifle'||weapon==='shotgun';
export function initialEquipmentLoadout(weapon:WeaponId='carbine'):EquipmentLoadout{
 const base:EquipmentLoadout={version:1,slots:{...DEFAULT_EQUIPMENT,primary:weaponItem(weapon)},
  secondary:emptySecondaryEquipment()};
 return {...base,fieldInventory:initialFieldInventory(base)};
}
/** Reject malformed and wrong-slot entries without throwing or altering the
 * authoritative campaign primary weapon, magazine and reserve quantities. */
export function readEquipmentLoadout(raw:unknown,weapon:WeaponId,owner='operator'):EquipmentLoadout{
 const result=initialEquipmentLoadout(isWeapon(weapon)?weapon:'carbine');
 if(!raw||typeof raw!=='object'||(raw as {version?:unknown}).version!==1)
  return result;
 const slots=(raw as {slots?:unknown}).slots;
 if(!slots||typeof slots!=='object'||Array.isArray(slots))return result;
 const source=slots as Record<string,unknown>;
 for(const slot of LOADOUT_SLOTS){
  if(slot==='primary')continue;
  const value=source[slot];
  if(typeof value==='string'&&validEquipmentChoice(slot,value))
   result.slots[slot]=value;
 }
 result.fieldInventory=readFieldInventory((raw as {fieldInventory?:unknown}).fieldInventory,result);
 const secondary=readSecondaryEquipment((raw as {secondary?:unknown}).secondary,owner);
 result.secondary=placeSecondaryMagazines(secondary,secondaryCarrierSpace(result));
 return result;
}
export function setEquipmentChoice(loadout:EquipmentLoadout,
 slot:LoadoutSlot,itemId:string):EquipmentLoadout{
 if(!validEquipmentChoice(slot,itemId))return loadout;
 // A panel cannot be issued without a carrier or left on removed armor.
 if(slot==='backpack'&&itemId==='backpack-panel'&&loadout.slots.armor!=='armor-carrier')return loadout;
 if(slot==='armor'&&itemId!=='armor-carrier'&&loadout.slots.backpack==='backpack-panel')return loadout;
 if(loadout.slots[slot]===itemId)return loadout;
 // Never strand a physically issued pistol with no belt for its holster.
 if(slot==='belt'&&itemId==='belt-none'&&loadout.secondary?.weapon)
  return loadout;
 const next:EquipmentLoadout={...loadout,slots:{...loadout.slots,[slot]:itemId}};
 // Belt/rig/pack changes move owned magazines; never clone or refill rounds.
 if((slot==='belt'||slot==='rig'||slot==='backpack')&&next.secondary)
  next.secondary=placeSecondaryMagazines(next.secondary,secondaryCarrierSpace(next));
 // Legacy single-item slots still define ability/tool compatibility, while
 // physical quantities belong to the field manifest.
 if(slot==='tactical'||slot==='utility'){
  const previous=loadout.fieldInventory??initialFieldInventory(loadout);
  const eligible=readFieldInventory(previous,next);
  if(slot==='tactical'&&itemId==='tactical-flash'&&
    !eligible.stacks.some(row=>row.itemId==='flashbang'))
   eligible.stacks.push({itemId:'flashbang',quantity:1,location:'rig'});
  if(slot==='utility'&&itemId==='utility-wedge'&&
    !eligible.stacks.some(row=>row.itemId==='wedge'))
   eligible.stacks.push({itemId:'wedge',quantity:2,location:'belt'});
  // Removing the legacy tactical flash selector does not erase explicitly
  // equipped physical flashes; only the wedge tool gate controls wedges.
  next.fieldInventory=eligible;
 }
 return next;
}
export function syncPrimaryWeapon(loadout:EquipmentLoadout,
 weapon:WeaponId):EquipmentLoadout{
 if(!EQUIPMENT_CATALOG[weaponItem(weapon)])return loadout;
 return setEquipmentChoice(loadout,'primary',weaponItem(weapon));
}
/** Total includes the mass delta of real attachments, while the base primary
 * is already counted in the authoritative equipment catalog. */
export const totalEquipmentMass=(loadout:EquipmentLoadout,
 config?:WeaponConfiguration)=>{
 const field=loadout.fieldInventory??initialFieldInventory(loadout);
 // The old flash/wedge slot mass was the same physical issue, not extras.
 const legacyIncluded=(loadout.slots.tactical==='tactical-flash'?.38:0)+
  (loadout.slots.utility==='utility-wedge'?.28:0);
 const baseline=equipmentMass(LOADOUT_SLOTS.map(slot=>loadout.slots[slot]))-
  legacyIncluded+fieldInventoryMass(field)+
  secondaryLoadMass(loadout.secondary??emptySecondaryEquipment());
 if(!config||loadout.slots.primary!=='primary-'+config.weapon)return baseline;
 const assembled=resolveWeaponAssembly(config);
 return baseline+assembled.massKg-WEAPON_PLATFORMS[config.weapon].baseMassKg;
};
export const loadoutItems=(loadout:EquipmentLoadout)=>
 LOADOUT_SLOTS.map(slot=>EQUIPMENT_CATALOG[loadout.slots[slot]])
  .filter((item):item is NonNullable<typeof item>=>!!item);

/** Equipment 07: movement load is computed at deployment and when a kit
 * changes, never per simulation frame. No penalty to light configurations. */
export function loadMovementScale(loadout:EquipmentLoadout,
 config?:WeaponConfiguration):number{
 const kg=totalEquipmentMass(loadout,config);
 return Math.max(.72,Math.min(1,1-Math.max(0,kg-10)*.012));
}
export function loadMobilityDescription(loadout:EquipmentLoadout,
 config?:WeaponConfiguration):string{
 const factor=loadMovementScale(loadout,config);
 return factor>=.96?'LIGHT':factor>=.87?'STANDARD':factor>=.78?'HEAVY':'OVERLOADED';
}

/** An equipped flash is a single carried, usable charge. This does not
 * increase the existing two-device team-wide mission allotment. */
export const equippedFlashCharges=(loadout:EquipmentLoadout):number=>
 fieldQuantity(loadout.fieldInventory??initialFieldInventory(loadout),'flashbang');
/** Compatibility-only legacy counter. Custody has no issued consumable.
 * Old saved flex-cuff stacks are stripped by readFieldInventory. */
export const equippedRestraintCharges=(_loadout:EquipmentLoadout):number=>0;
