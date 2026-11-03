/** Curated wardrobe presets built only from active, modeled silhouettes.
 * The obsolete universal palette, procedural prints, unmodeled shirts and
 * commercial/period mismatch variants are intentionally not supported.
 */
import {initialEquipmentLoadout,setEquipmentChoice,
 type EquipmentLoadout,type LoadoutSlot} from './equipment-loadouts.ts';
import {initialWardrobe,setWardrobeStyle,setWardrobeFabricCamo,resolvedWardrobe,
 type WardrobeOptions,type WardrobeSlot} from './operator-wardrobe-data.ts';
import type {HeadwearCamoId} from './operator-headwear-camo.ts';
import type {WeaponId} from './breach-combat.ts';
type Style=Partial<Record<WardrobeSlot,string>>;
type Gear=Partial<Record<LoadoutSlot,string>>;
export type WardrobeRecipe={
 id:string;name:string;category:'role'|'organization'|'setting';
 description:string;weapon:WeaponId;gear:Gear;
 styles:Style;topCamo?:HeadwearCamoId;
};
const recipe=(id:string,name:string,category:WardrobeRecipe['category'],
 weapon:WeaponId,gear:Gear,styles:Style,topCamo?:HeadwearCamoId,
 description=''):WardrobeRecipe=>({
  id,name,category,weapon,gear,styles,topCamo,description
});
export const WARDROBE_RECIPES:readonly WardrobeRecipe[]=[
 recipe('bdu-field','BDU / Field patrol','role','rifle',
  {head:'head-helmet',top:'top-uniform',legs:'legs-field',
   feet:'feet-boots',armor:'armor-soft',rig:'rig-full',
   backpack:'backpack-field'},
  {headwear:'pasgt',top:'bdu-shirt',trousers:'field-trousers',
   footwear:'field-boots',rigStyle:'field-webbing',
   packStyle:'field-pack'},'m81-woodland'),
 recipe('acu-patrol','ACU / Modern patrol','role','carbine',
  {head:'head-helmet',top:'top-uniform',legs:'legs-field',
   feet:'feet-boots',armor:'armor-carrier',rig:'rig-light',
   backpack:'backpack-day'},
  {headwear:'ach',top:'acu-shirt',trousers:'field-trousers',
   armorStyle:'plate-standard',rigStyle:'light-rig',
   packStyle:'day-pack'},'scorpion-w2'),
 recipe('modern-entry','Modern entry team','role','carbine',
  {head:'head-helmet',top:'top-uniform',legs:'legs-field',
   feet:'feet-boots',armor:'armor-carrier',rig:'rig-full',
   backpack:'backpack-none'},
  {headwear:'high-cut-rails',top:'acu-shirt',
   armorStyle:'plate-jpc',rigStyle:'full-chest',
   headset:'boom-headset'},'multicam'),
 recipe('field-medic','Field medic','role','carbine',
  {head:'head-cap',top:'top-uniform',legs:'legs-field',
   feet:'feet-boots',armor:'armor-soft',rig:'rig-light',
   backpack:'backpack-field',medical:'medical-trauma'},
  {headwear:'boonie',top:'bdu-shirt',trousers:'field-trousers',
   packStyle:'medic-pack',wrist:'watch'},'m81-woodland'),
 recipe('desert-field','Desert field blouse','setting','rifle',
  {head:'head-helmet',top:'top-uniform',legs:'legs-field',
   feet:'feet-boots',armor:'armor-soft',rig:'rig-full'},
  {headwear:'pasgt',top:'bdu-shirt',trousers:'field-trousers',
   rigStyle:'field-webbing'},'three-color-desert'),
 recipe('ucp-era','UCP-era ACU','setting','carbine',
  {head:'head-helmet',top:'top-uniform',legs:'legs-field',
   feet:'feet-boots',armor:'armor-carrier',rig:'rig-full'},
  {headwear:'ach',top:'acu-shirt',trousers:'field-trousers',
   armorStyle:'plate-standard'},'ucp')
];
export function applyWardrobeRecipe(selected:WardrobeRecipe):{
 kit:EquipmentLoadout;wardrobe:WardrobeOptions
}{
 let kit=initialEquipmentLoadout(selected.weapon);
 for(const [slot,id] of Object.entries(selected.gear))
  kit=setEquipmentChoice(kit,slot as LoadoutSlot,id);
 let wardrobe=initialWardrobe();
 for(const [slot,id] of Object.entries(selected.styles))
  wardrobe=setWardrobeStyle(wardrobe,slot as WardrobeSlot,id);
 if(selected.topCamo)
  wardrobe=setWardrobeFabricCamo(wardrobe,'top',
   selected.topCamo,resolvedWardrobe(wardrobe,kit));
 return {kit,wardrobe};
}
export const wardrobeRecipe=(id:string)=>WARDROBE_RECIPES.find(x=>x.id===id);
