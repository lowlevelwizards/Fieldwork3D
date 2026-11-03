/** Curated wardrobe presets built only from active, modeled silhouettes.
 * The obsolete universal palette, procedural prints, unmodeled shirts and
 * commercial/period mismatch variants are intentionally not supported.
 */
import {initialEquipmentLoadout,setEquipmentChoice,
 type EquipmentLoadout,type LoadoutSlot} from './equipment-loadouts.ts';
import {initialWardrobe,setWardrobeStyle,matchWardrobeUniformCamo,resolvedWardrobe,
 type WardrobeOptions,type WardrobeSlot} from './operator-wardrobe-data.ts';
import type {HeadwearCamoId} from './operator-headwear-camo.ts';
import type {WeaponId} from './breach-combat.ts';
type Style=Partial<Record<WardrobeSlot,string>>;
type Gear=Partial<Record<LoadoutSlot,string>>;
export type WardrobeRecipe={
 id:string;name:string;category:'role'|'organization'|'setting';
 description:string;weapon:WeaponId;gear:Gear;
 styles:Style;topCamo?:HeadwearCamoId;topColorway?:string;
};
const recipe=(id:string,name:string,category:WardrobeRecipe['category'],
 weapon:WeaponId,gear:Gear,styles:Style,topCamo?:HeadwearCamoId,
 description='',topColorway?:string):WardrobeRecipe=>({
  id,name,category,weapon,gear,styles,topCamo,description,topColorway
});
export const WARDROBE_RECIPES:readonly WardrobeRecipe[]=[
 recipe('bdu-field','Classic Field Patrol','role','rifle',
  {head:'head-helmet',top:'top-uniform',legs:'legs-field',
   feet:'feet-boots',armor:'armor-soft',rig:'rig-full',
   backpack:'backpack-field'},
  {headwear:'pasgt',top:'bdu-shirt',trousers:'bdu-trousers',
   footwear:'field-boots',rigStyle:'field-webbing',
   packStyle:'field-pack'},'m81-woodland'),
 recipe('acu-patrol','Modern Utility Patrol','role','carbine',
  {head:'head-helmet',top:'top-uniform',legs:'legs-field',
   feet:'feet-boots',armor:'armor-carrier',rig:'rig-light',
   backpack:'backpack-day'},
  {headwear:'ach',top:'acu-shirt',trousers:'acu-trousers',
   armorStyle:'plate-standard',rigStyle:'light-rig',
   packStyle:'day-pack'},'scorpion-w2'),
 recipe('modern-entry','Modern entry team','role','carbine',
  {head:'head-helmet',top:'top-uniform',legs:'legs-field',
   feet:'feet-boots',armor:'armor-carrier',rig:'rig-full',
   backpack:'backpack-none'},
  {headwear:'high-cut',top:'acu-shirt',trousers:'acu-trousers',
   armorStyle:'plate-jpc',rigStyle:'full-chest',
   headset:'boom-headset'},'multicam'),
 recipe('field-medic','Field medic','role','carbine',
  {head:'head-cap',top:'top-uniform',legs:'legs-field',
   feet:'feet-boots',armor:'armor-soft',rig:'rig-light',
   backpack:'backpack-field',medical:'medical-trauma'},
  {headwear:'boonie',top:'bdu-shirt',trousers:'bdu-trousers',
   packStyle:'medic-pack',wrist:'watch'},'m81-woodland'),
 recipe('desert-field','Desert field blouse','setting','rifle',
  {head:'head-helmet',top:'top-uniform',legs:'legs-field',
   feet:'feet-boots',armor:'armor-soft',rig:'rig-full'},
  {headwear:'pasgt',top:'bdu-shirt',trousers:'bdu-trousers',
   rigStyle:'field-webbing'},'three-color-desert'),
 recipe('ucp-era','UCP-era Utility Uniform','setting','carbine',
  {head:'head-helmet',top:'top-uniform',legs:'legs-field',
   feet:'feet-boots',armor:'armor-carrier',rig:'rig-full'},
  {headwear:'ach',top:'acu-shirt',trousers:'acu-trousers',
   armorStyle:'plate-standard'},'ucp'),
 recipe('combat-shirt','Modern Combat Shirt','role','carbine',
  {top:'top-uniform',legs:'legs-field',feet:'feet-boots',
   armor:'armor-carrier',rig:'rig-light'},
  {top:'combat-shirt',trousers:'acu-trousers',armorStyle:'plate-jpc'},
  'multicam','Automatic muted knit with real camouflage sleeves','standard'),
 recipe('windproof-smock','Windproof Field Smock','setting','rifle',
  {top:'top-uniform',legs:'legs-field',feet:'feet-boots',
   head:'head-cap',armor:'armor-none',rig:'rig-full'},
  {top:'smock-jacket',trousers:'bdu-trousers',headwear:'boonie'},
  'woodland-dpm','Hooded multi-pocket fieldcraft outer layer','standard'),
 recipe('mountain-gorka','Mountain Gorka Suit','setting','rifle',
  {top:'top-uniform',legs:'legs-field',feet:'feet-boots',
   head:'head-cap',armor:'armor-none',rig:'rig-full'},
  {top:'gorka-jacket',trousers:'gorka-trousers',headwear:'patrol-cap'},
  undefined,'Full khaki/brown reinforced mountain suit','standard'),
 recipe('gorka-ss-leto','Gorka Summer Inserts','setting','carbine',
  {top:'top-uniform',legs:'legs-field',feet:'feet-boots',
   head:'head-cap',armor:'armor-none',rig:'rig-light'},
  {top:'gorka-jacket',trousers:'gorka-trousers',headwear:'patrol-cap'},
  undefined,'Original SS-Leto-style summer panel study','ss-leto'),
 recipe('gorka-ss-autumn','Gorka Autumn Inserts','setting','carbine',
  {top:'top-uniform',legs:'legs-field',feet:'feet-boots',
   head:'head-cap',armor:'armor-none',rig:'rig-light'},
  {top:'gorka-jacket',trousers:'gorka-trousers',headwear:'patrol-cap'},
  undefined,'Original SS-Autumn-style panel study','ss-autumn'),
 recipe('police-entry','Police Entry / External Vest','role','smg',
  {head:'head-helmet',armor:'armor-soft',rig:'rig-light',
   backpack:'backpack-none',top:'top-uniform',legs:'legs-field'},
  {headwear:'ach',top:'acu-shirt',trousers:'acu-trousers',
   armorStyle:'soft-vest',rigStyle:'micro-rig',packStyle:'no-pack'},
  undefined,'Broad external soft armor with compact chest-mounted equipment'),
 recipe('legacy-infantry','Legacy Full-Coverage Infantry','setting','rifle',
  {head:'head-helmet',armor:'armor-carrier',rig:'rig-full',
   backpack:'backpack-day',top:'top-uniform',legs:'legs-field'},
  {headwear:'pasgt',top:'acu-shirt',trousers:'acu-trousers',
   armorStyle:'plate-legacy',rigStyle:'split-front',packStyle:'day-pack'},
  'ucp','Long armored body and distinct split-front field loadout'),
 recipe('recon-light','Light Recon / Micro Rig','role','carbine',
  {head:'head-helmet',armor:'armor-carrier',rig:'rig-light',
   backpack:'backpack-day',top:'top-uniform',legs:'legs-field'},
  {headwear:'high-cut',top:'combat-shirt',trousers:'acu-trousers',
   armorStyle:'plate-jpc',rigStyle:'micro-rig',packStyle:'day-pack'},
  'multicam','Minimal skeletonized carrier with close-profile organizer'),
 recipe('irregular-canvas','Canvas Rig Field Patrol','setting','rifle',
  {head:'head-cap',armor:'armor-none',rig:'rig-light',
   backpack:'backpack-none',top:'top-uniform',legs:'legs-field'},
  {headwear:'patrol-cap',top:'bdu-shirt',trousers:'bdu-trousers',
   armorStyle:'armor-bare',rigStyle:'chicom-rig',packStyle:'no-pack'},
  'm81-woodland','Compact traditional three-cell canvas chest rig'),
 recipe('bush-webbing','Bush Webbing / Fragmentation Vest','setting','rifle',
  {head:'head-cap',armor:'armor-soft',rig:'rig-full',
   backpack:'backpack-field',top:'top-uniform',legs:'legs-field'},
  {headwear:'boonie',top:'bdu-shirt',trousers:'bdu-trousers',
   armorStyle:'soft-flak',rigStyle:'sadf-webbing',packStyle:'field-pack'},
  'woodland-dpm','Historic full-webbing silhouette with soft fragmentation armor')
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
 if(selected.topColorway)wardrobe={...wardrobe,topColorway:selected.topColorway};
 if(selected.topCamo){
  const outfit=resolvedWardrobe(wardrobe,kit);
  wardrobe=matchWardrobeUniformCamo(wardrobe,outfit,selected.topCamo);
 }
 return {kit,wardrobe};
}
export const wardrobeRecipe=(id:string)=>WARDROBE_RECIPES.find(x=>x.id===id);
