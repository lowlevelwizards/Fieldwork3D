/** Wardrobe recipes, not owned equipment or campaign loot.
 * Intentionally setting-neutral so these presets can serve Verdigris factions,
 * a grounded CQB ruleset, or either game's Quick Play sandbox.
 */
import {initialEquipmentLoadout,setEquipmentChoice,
 type EquipmentLoadout,type LoadoutSlot} from './equipment-loadouts.ts';
import {initialWardrobe,setWardrobeStyle,setWardrobePattern,
 type WardrobeOptions,type WardrobeSlot,type WardrobePattern}
 from './operator-wardrobe-data.ts';
import type {WeaponId} from './breach-combat.ts';
type Style = Partial<Record<WardrobeSlot,string>>;
type Pattern = Partial<Record<keyof WardrobeOptions['patterns'],WardrobePattern>>;
type Gear=Partial<Record<LoadoutSlot,string>>;
export type WardrobeRecipe={
 id:string;name:string;category:'role'|'organization'|'civilian'|'setting';
 description:string;weapon:WeaponId;gear:Gear;
 styles:Style;patterns:Pattern;palette:number;
};
const recipe=(id:string,name:string,category:WardrobeRecipe['category'],
 weapon:WeaponId,gear:Gear,styles:Style,patterns:Pattern={},palette=0,
 description=''):WardrobeRecipe=>({
  id,name,category,weapon,gear,styles,patterns,palette,description
 });
export const WARDROBE_RECIPES:readonly WardrobeRecipe[]=[
 recipe('assault','Urban assaulter','role','carbine',
  {head:'head-helmet',armor:'armor-carrier',rig:'rig-full',
   belt:'belt-standard',backpack:'backpack-day'},
  {headwear:'high-cut-rails',armorStyle:'plate-jpc',rigStyle:'full-chest',
   packStyle:'assault-pack',top:'combat-shirt',knees:'knee-integrated',
   eyewear:'safety-glasses',headset:'boom-headset'}, {},2),
 recipe('light-scout','Light scout','role','smg',
  {head:'head-cap',armor:'armor-none',rig:'rig-light',
   belt:'belt-light',backpack:'backpack-none',top:'top-light'},
  {headwear:'boonie',top:'light-shirt',trousers:'softshell-trousers',
   footwear:'hiking-shoes',rigStyle:'micro-rig',gloves:'gloves-light'}, {},4),
 recipe('breacher','Heavy entry','role','shotgun',
  {head:'head-helmet',armor:'armor-carrier',rig:'rig-full',
   utility:'utility-breach',backpack:'backpack-field'},
  {headwear:'ach',armorStyle:'plate-heavy',rigStyle:'lbv',
   packStyle:'field-pack',top:'softshell',knees:'knee-hard'}, {},3),
 recipe('medic','Field medic','role','carbine',
  {armor:'armor-soft',rig:'rig-light',backpack:'backpack-field',
   medical:'medical-trauma'},
  {armorStyle:'soft-vest',rigStyle:'light-rig',
   packStyle:'medic-pack',wrist:'watch'}, {},0),
 recipe('recon','Reconnaissance','role','rifle',
  {head:'head-bump',armor:'armor-soft',rig:'rig-light',
   backpack:'backpack-day'},
  {headwear:'bump-helmet',armorStyle:'soft-slick',
   rigStyle:'micro-rig',packStyle:'hydration',top:'combat-shirt'},
  {top:'multi-terrain',trousers:'multi-terrain'},4),
 recipe('support','Patrol support','role','rifle',
  {head:'head-helmet',armor:'armor-carrier',rig:'rig-full',
   backpack:'backpack-field'},
  {headwear:'pasgt',rigStyle:'field-webbing',
   packStyle:'rucksack',top:'bdu-shirt',trousers:'bdu-trousers'},
  {top:'woodland',trousers:'woodland'},0),
 recipe('gendarme','Gendarmerie patrol','organization','smg',
  {head:'head-helmet',armor:'armor-soft',rig:'rig-light',
   backpack:'backpack-none'},
  {headwear:'ach',armorStyle:'soft-vest',rigStyle:'light-rig',
   top:'acu-shirt',trousers:'field-trousers'}, {},3),
 recipe('contractor','Contractor field kit','organization','carbine',
  {head:'head-cap',armor:'armor-carrier',rig:'rig-light',
   backpack:'backpack-day'},
  {headwear:'baseball-cap',armorStyle:'plate-slick',rigStyle:'micro-rig',
   top:'softshell',trousers:'work-pants',footwear:'hiking-boots'}, {},1),
 recipe('old-webbing','Traditional field kit','organization','rifle',
  {head:'head-helmet',armor:'armor-soft',rig:'rig-full',
   backpack:'backpack-field'},
  {headwear:'soviet-steel',rigStyle:'belt-harness',
   packStyle:'field-pack',top:'bdu-shirt'},
  {top:'flora',trousers:'flora'},0),
 recipe('irregular','Irregular rifleman','organization','rifle',
  {head:'head-cap',armor:'armor-none',rig:'rig-light',
   belt:'belt-light',backpack:'backpack-day'},
  {headwear:'beanie',rigStyle:'micro-rig',
   top:'flannel',trousers:'work-pants',footwear:'hiking-shoes'},
  {top:'flannel'},1),
 recipe('lowvis','Low visibility','civilian','smg',
  {head:'head-none',armor:'armor-none',rig:'rig-none',
   belt:'belt-light',backpack:'backpack-none',top:'top-light'},
  {top:'t-shirt',trousers:'jeans',footwear:'sneakers',
   wrist:'watch'}, {trousers:'denim'},2),
 recipe('winter','Cold weather patrol','setting','carbine',
  {head:'head-cap',armor:'armor-soft',rig:'rig-light',
   backpack:'backpack-field'},
  {headwear:'beanie',facewear:'gaiter',top:'pcu-shell',
   trousers:'softshell-trousers',packStyle:'field-pack'},
  {top:'winter',trousers:'winter'},3),
 recipe('verdigris-patrol','Verdigris patrol template','setting','carbine',
  {head:'head-helmet',armor:'armor-soft',rig:'rig-light'},
  {headwear:'ach',top:'field-jacket',armorStyle:'soft-vest',
   trousers:'field-trousers'},{top:'woodland'},4)
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
 for(const [slot,id] of Object.entries(selected.patterns))
  wardrobe=setWardrobePattern(wardrobe,
   slot as keyof WardrobeOptions['patterns'],id as WardrobePattern);
 return {kit,wardrobe:{...wardrobe,palette:selected.palette}};
}
export function wardrobeRecipe(id:string){
 return WARDROBE_RECIPES.find(x=>x.id===id);
}
