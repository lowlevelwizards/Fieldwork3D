/** Equipment 02: saved per-operator choices. Item ownership and placement
 * are separate later contracts, never inferred from the choices here. */
import {DEFAULT_EQUIPMENT,LOADOUT_SLOTS,EQUIPMENT_CATALOG,
 validEquipmentChoice,equipmentMass,type EquipmentSlot} from './equipment-catalog.ts';
import type {WeaponId} from './breach-combat.ts';

export type LoadoutSlot=Exclude<EquipmentSlot,'secondary'>;
export type EquipmentLoadout={version:1;slots:Record<LoadoutSlot,string>};
const weaponItem=(weapon:WeaponId)=>'primary-'+weapon;
const isWeapon=(weapon:unknown):weapon is WeaponId=>
 weapon==='carbine'||weapon==='smg'||weapon==='rifle'||weapon==='shotgun';
export function initialEquipmentLoadout(weapon:WeaponId='carbine'):EquipmentLoadout{
 return {version:1,slots:{...DEFAULT_EQUIPMENT,primary:weaponItem(weapon)}};
}
/** Reject malformed and wrong-slot entries without throwing or altering the
 * authoritative campaign primary weapon, magazine and reserve quantities. */
export function readEquipmentLoadout(raw:unknown,weapon:WeaponId):EquipmentLoadout{
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
 return result;
}
export function setEquipmentChoice(loadout:EquipmentLoadout,
 slot:LoadoutSlot,itemId:string):EquipmentLoadout{
 if(!validEquipmentChoice(slot,itemId))return loadout;
 if(loadout.slots[slot]===itemId)return loadout;
 return {version:1,slots:{...loadout.slots,[slot]:itemId}};
}
export function syncPrimaryWeapon(loadout:EquipmentLoadout,
 weapon:WeaponId):EquipmentLoadout{
 if(!EQUIPMENT_CATALOG[weaponItem(weapon)])return loadout;
 return setEquipmentChoice(loadout,'primary',weaponItem(weapon));
}
export const totalEquipmentMass=(loadout:EquipmentLoadout)=>
 equipmentMass(LOADOUT_SLOTS.map(slot=>loadout.slots[slot]));
export const loadoutItems=(loadout:EquipmentLoadout)=>
 LOADOUT_SLOTS.map(slot=>EQUIPMENT_CATALOG[loadout.slots[slot]])
  .filter((item):item is NonNullable<typeof item>=>!!item);

/** Equipment 07: movement load is computed at deployment and when a kit
 * changes, never per simulation frame. No penalty to light configurations. */
export function loadMovementScale(loadout:EquipmentLoadout):number{
 const kg=totalEquipmentMass(loadout);
 return Math.max(.72,Math.min(1,1-Math.max(0,kg-10)*.012));
}
export function loadMobilityDescription(loadout:EquipmentLoadout):string{
 const factor=loadMovementScale(loadout);
 return factor>=.96?'LIGHT':factor>=.87?'STANDARD':factor>=.78?'HEAVY':'OVERLOADED';
}

/** An equipped flash is a single carried, usable charge. This does not
 * increase the existing two-device team-wide mission allotment. */
export const equippedFlashCharges=(loadout:EquipmentLoadout):number=>
 loadout.slots.tactical==='tactical-flash'?1:0;
