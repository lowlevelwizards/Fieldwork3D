/** Lab-only unequip-all. Normal campaign and Quick Play defaults unchanged. */
import {initialEquipmentLoadout,setEquipmentChoice,
 type EquipmentLoadout,type LoadoutSlot} from './equipment-loadouts.ts';
import {initialWardrobe,type WardrobeOptions} from './operator-wardrobe-data.ts';
import type {WeaponId} from './breach-combat.ts';
const BARE:Partial<Record<LoadoutSlot,string>>={
 head:'head-none',armor:'armor-none',rig:'rig-none',belt:'belt-none',
 backpack:'backpack-none',top:'top-none',legs:'legs-none',
 hands:'hands-none',feet:'feet-none',medical:'medical-none',
 tactical:'tactical-none',utility:'utility-none'
};
export function bareLabEquipment(weapon:WeaponId='carbine'):EquipmentLoadout{
 let result=initialEquipmentLoadout(weapon);
 for(const [slot,id] of Object.entries(BARE))
  result=setEquipmentChoice(result,slot as LoadoutSlot,id);
 return result;
}
export function unequipLabAppearance(weapon:WeaponId='carbine'):{
 kit:EquipmentLoadout;wardrobe:WardrobeOptions;weaponVisible:false;spareMagazines:0
}{
 return {kit:bareLabEquipment(weapon),wardrobe:initialWardrobe(),
  weaponVisible:false,spareMagazines:0};
}
