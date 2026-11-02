/** Lab-facing single chooser: appearance item is the selected actual slot.
 * Saved version-1 kits remain unchanged, and no visual item grants inventory.
 * Later category art passes can replace the geometry without adding a second
 * generic armor/helmet selector.
 */
import {setEquipmentChoice,type EquipmentLoadout,type LoadoutSlot}
 from './equipment-loadouts.ts';
import {setWardrobeStyle,wardrobeItem,readWardrobe,
 type WardrobeOptions,type WardrobeSlot} from './operator-wardrobe-data.ts';
type Selection={kit:EquipmentLoadout;wardrobe:WardrobeOptions};
export function equipmentSlotForAppearance(slot:WardrobeSlot,id:string):
 Partial<{slot:LoadoutSlot;id:string}>|null{
 const item=wardrobeItem(slot,id);
 if(!item)return null;
 const family=item.family;
 switch(slot){
  case 'headwear':return {slot:'head',id:family==='bare'?'head-none':
   family==='soft'?'head-cap':family==='bump'?'head-bump':'head-helmet'};
  case 'armorStyle':return {slot:'armor',id:family==='none'?'armor-none':
   family==='soft'?'armor-soft':'armor-carrier'};
  case 'rigStyle':return {slot:'rig',id:family==='none'?'rig-none':
   family==='light'?'rig-light':'rig-full'};
  case 'beltStyle':return {slot:'belt',id:family==='none'?'belt-none':
   family==='light'?'belt-light':'belt-standard'};
  case 'packStyle':return {slot:'backpack',id:family==='none'?'backpack-none':
   family==='day'?'backpack-day':'backpack-field'};
  case 'top':return {slot:'top',id:family==='underlayer'?'top-none':
   family==='civilian'?'top-light':'top-uniform'};
  case 'trousers':return {slot:'legs',id:family==='underlayer'?'legs-none':
   family==='civilian'?'legs-light':'legs-field'};
  case 'footwear':return {slot:'feet',id:family==='unshod'?'feet-none':
   family==='shoes'||id==='light-boots'?'feet-light':'feet-boots'};
  case 'gloves':return {slot:'hands',id:id==='gloves-none'?'hands-none':'hands-gloves'};
  default:return null;
 }
}
export function selectWardrobeItem(kit:EquipmentLoadout,
 wardrobe:WardrobeOptions,slot:WardrobeSlot,id:string):Selection{
 if(!wardrobeItem(slot,id))return {kit,wardrobe};
 const actual=equipmentSlotForAppearance(slot,id);
 const next=actual?.slot&&actual.id?
  setEquipmentChoice(kit,actual.slot,actual.id):kit;
 return {kit:next,wardrobe:setWardrobeStyle(readWardrobe(wardrobe),slot,id)};
}
