/** Tactical Wardrobe 2.0: style recipes, not new weapons or magic inventory.
 * Physical protection, carrying capacity, costs and ownership remain in
 * equipment-catalog / equipment-loadouts / campaign-state.
 */
import type {EquipmentLoadout} from './equipment-loadouts.ts';
import {wardrobeMount} from './operator-wardrobe-mounts.ts';
import {isGarmentColorway} from './operator-upper-colorways.ts';
import {isGarmentSolidId,FABRIC_SOLID_CHOICES,type GarmentSolidId}
 from './operator-garment-color-policy.ts';
import {initialWardrobeAccessories,readWardrobeAccessories,
 type WardrobeAccessoryConfiguration} from './operator-wardrobe-accessories.ts';
import {isHeadwearSolidColorId,type HeadwearSolidColorId} from './operator-headwear-colors.ts';
import {isHeadwearCamoId,type HeadwearCamoId,nextHeadwearCamoRoll} from './operator-headwear-camo.ts';
import {FABRIC_CAMO_CHANNELS,fabricCamoCompatible,type FabricCamoChannel,type CamoOutfit}
 from './operator-fabric-camo-policy.ts';
export const WARDROBE_SLOTS=[
 'headwear','facewear','eyewear','headset','top','trousers','footwear',
 'armorStyle','rigStyle','beltStyle','packStyle','gloves','knees','wrist'
] as const;
export type WardrobeSlot=typeof WARDROBE_SLOTS[number];
export type WardrobeItem={
 id:string;slot:WardrobeSlot;name:string;
 family:string;style:string;onlyWith?:readonly string[];
};
const ITEMS:WardrobeItem[]=[];
function add(slot:WardrobeSlot,family:string,records:readonly (readonly [string,string])[],
 onlyWith?:readonly string[]){
 for(const [id,name] of records)ITEMS.push({id,slot,name,family,style:id,onlyWith});
}
add('headwear','bare',[['bare','Uncovered']]);
// Only the seven reviewed headwear silhouettes are selectable in Studio.
// Older placeholder variants remain loadout-safe internally but do not
// pollute the approved art catalog.
add('headwear','soft',[
 ['patrol-cap','Patrol cap'],['beanie','Beanie'],['boonie','Boonie hat']
]);
add('headwear','ballistic',[
 ['soviet-steel','Steel helmet'],['pasgt','PASGT-style helmet'],
 ['ach','ACH / MICH-style helmet'],['high-cut','High-cut helmet']
]);
add('facewear','face',[
 ['face-none','Uncovered'],['balaclava-one','One-opening balaclava'],
 ['balaclava-three','Three-hole balaclava'],['gaiter','Neck gaiter'],
 ['shemagh','Shemagh'],['scarf','Scarf'],['half-mask','Half mask'],
 ['gas-mask','Protective gas mask']
]);
add('eyewear','eyewear',[
 ['eyes-none','None'],['clear-glasses','Clear glasses'],
 ['sunglasses','Sunglasses'],['safety-glasses','Protective glasses'],
 ['goggles-down','Goggles over eyes'],['goggles-up','Goggles raised']
]);
add('headset','headset',[
 ['comms-none','None'],['earpiece','Single earpiece'],
 ['over-ear','Over-ear headset'],['boom-headset','Boom microphone headset'],
 ['helmet-ears','Helmet-integrated hearing protection']
]);
// The clothed base rig is an internal foundation, not a selectable legacy cut.
// Stage 3B: only the two approved prototype families remain in the active catalog.
add('top','uniform',[
 ['bdu-shirt','Classic Field Blouse'],['acu-shirt','Modern Utility Blouse'],
 ['combat-shirt','Combat Shirt'],['smock-jacket','Windproof Field Smock'],
 ['gorka-jacket','Mountain / Gorka Jacket']
]);
// Bare-short placeholders are no longer visible wardrobe options.
// Unremodeled lower-body pieces are represented by one honest foundation.
add('trousers','uniform',[
 ['bdu-trousers','Classic Field Trousers'],
 ['acu-trousers','Modern Utility Trousers'],
 ['gorka-trousers','Mountain / Gorka Trousers']
]);
add('footwear','unshod',[['bare-feet','Bare feet']]);
add('footwear','boots',[['field-boots','Field boots (foundation)']]);
add('armorStyle','none',[['armor-bare','No armor']]);
add('armorStyle','soft',[
 ['soft-slick','Concealable Soft Armor'],
 ['soft-vest','External Police / Tactical Vest'],
 ['soft-flak','Traditional Fragmentation Vest']
]);
add('armorStyle','plates',[
 ['plate-slick','Slick plate carrier'],
 ['plate-jpc','Light / Skeletonized Plate Carrier'],
 ['plate-standard','Standard Plate Carrier'],
 ['plate-heavy','Heavy Assault Plate Carrier'],
 ['plate-legacy','Legacy Full-Coverage Military Armor']
]);
add('rigStyle','none',[['no-rig','None']]);
add('rigStyle','light',[
 ['micro-rig','Micro Chest Rig'],
 ['light-rig','Classic X-Harness Chest Rig'],
 ['chest-placard','Triple Magazine Placard'],
 ['chicom-rig','Classic Three-Cell Canvas Rig'],
 ['bandolier','Minimal Bandolier']
]);
add('rigStyle','full',[
 ['field-webbing','Field Webbing'],['lbv','Load-Bearing Vest'],
 ['full-chest','Full Bib / Patrol Rig'],
 ['split-front','Split-Front Chest Rig'],
 ['sadf-webbing','Bush / SADF-Style Webbing']
]);
add('beltStyle','none',[['no-belt','No belt']]);
add('beltStyle','light',[
 ['plain-belt','Clothing belt'],['light-belt','Light utility belt']
]);
add('beltStyle','standard',[
 ['duty-belt','Duty belt'],['battle-belt','Battle belt'],
 ['padded-belt','Padded war belt']
]);
add('packStyle','none',[['no-pack','No backpack']]);
add('packStyle','day',[
 ['hydration','Hydration carrier'],['admin-pack','Admin pack'],
 ['day-pack','Day pack'],['assault-pack','Assault pack'],
 ['sling-bag','Sling bag']
]);
add('packStyle','field',[
 ['field-pack','Field pack'],['rucksack','Rucksack'],
 ['medic-pack','Medic pack'],['comms-pack','Communications pack'],
 ['duffel','Duffel bag']
]);
add('gloves','gloves',[['gloves-none','Bare hands'],
 ['gloves-field','Field gloves (foundation)']]);
add('knees','knees',[['knee-none','None'],
 ['knee-hard','Hard knee pads (foundation)']]);
add('wrist','wrist',[
 ['wrist-none','None'],['watch','Field watch'],
 ['wrist-nav','Wrist navigation device']
]);
export const WARDROBE_ITEMS:readonly WardrobeItem[]=ITEMS;
export const wardrobeItemsForSlot=(slot:WardrobeSlot)=>
 WARDROBE_ITEMS.filter(x=>x.slot===slot);
export const wardrobeItem=(slot:WardrobeSlot,id:string)=>
 WARDROBE_ITEMS.find(x=>x.slot===slot&&x.id===id);
export const SLEEVE_STATES=['unrolled','cuffed','rolled'] as const;
export type SleeveState=typeof SLEEVE_STATES[number];
export const TROUSER_HEMS=['unbloused','bloused','cuffed'] as const;
export type TrouserHem=typeof TROUSER_HEMS[number];
export const sleeveStateOptions=(top:string)=>top==='bdu-shirt'||top==='acu-shirt'||top==='combat-shirt'?
 SLEEVE_STATES:['unrolled'] as const;
export const trouserHemOptions=(trousers:string)=>trousers==='bdu-trousers'||
 trousers==='acu-trousers'||trousers==='gorka-trousers'?TROUSER_HEMS:['unbloused'] as const;
export type WardrobeOptions={
 version:1;styles:Partial<Record<WardrobeSlot,string>>;
 headwearColor?:HeadwearSolidColorId;headwearCamo?:HeadwearCamoId;
 headwearCamoRoll?:number;
 /** Approved original prints on verified textile channels. */
 fabricCamo?:Partial<Record<FabricCamoChannel,HeadwearCamoId>>;
 /** Saved individual fabric-cut seeds; never regenerated during animation. */
 fabricCamoRoll?:Partial<Record<FabricCamoChannel,number>>;
 /** Last selected approved print, remembered even when a solid is active. */
 lastFabricCamo?:Partial<Record<FabricCamoChannel,HeadwearCamoId>>;
 /** Contextual solid fabric per physical channel; hidden when that channel
  * has an active approved camouflage, but retained for later restoring. */
 fabricSolids?:Partial<Record<FabricCamoChannel,GarmentSolidId>>;
 /** Optional manual knitted/rolled cuff and combat-shirt body colors. */
 cuffSolid?:GarmentSolidId;
 knitSolid?:GarmentSolidId;
 /** Advanced pouch-only solid override; absent means inherit rig textile. */
 pouchSolid?:GarmentSolidId;
 sleeveState:SleeveState;trouserHem:TrouserHem;
 /** Contextual new-garment materials, never the abolished global palette. */
 topColorway:string;
 accessories:WardrobeAccessoryConfiguration;
 mounts:{medical?:string;utility?:string;magazineOrder:'left-right'|'right-left'};
};
const DEFAULTS:Record<WardrobeSlot,string>={
 headwear:'ach',facewear:'face-none',eyewear:'eyes-none',headset:'comms-none',
 top:'bdu-shirt',trousers:'bdu-trousers',footwear:'field-boots',
 armorStyle:'soft-vest',rigStyle:'light-rig',beltStyle:'duty-belt',
 packStyle:'day-pack',gloves:'gloves-field',knees:'knee-none',
 wrist:'wrist-none'
};
export const initialWardrobe=():WardrobeOptions=>({
 version:1,styles:{},sleeveState:'unrolled',trouserHem:'bloused',
 topColorway:'standard',
 accessories:initialWardrobeAccessories(),
 mounts:{magazineOrder:'left-right'}
});
export function readWardrobe(raw:unknown):WardrobeOptions{
 const result=initialWardrobe();
 if(!raw||typeof raw!=='object')return result;
 const v=raw as Partial<WardrobeOptions>;
 if(v.version!==1)return result;
 if(v.styles&&typeof v.styles==='object'&&!Array.isArray(v.styles)){
  for(const slot of WARDROBE_SLOTS){
   const id=v.styles[slot];
   // Retired near-duplicates migrate to their closest approved silhouette.
   const upgraded=id==='soft-paca'?'soft-slick':
    id==='belt-harness'?'field-webbing':id;
   if(typeof upgraded==='string'&&wardrobeItem(slot,upgraded))
    result.styles[slot]=upgraded;
  }
 }
 if(v.fabricCamo&&typeof v.fabricCamo==='object'&&!Array.isArray(v.fabricCamo)){
  for(const channel of FABRIC_CAMO_CHANNELS){
   const id=v.fabricCamo[channel];
   if(isHeadwearCamoId(id)&&id!=='splittertarn-31'){
    (result.fabricCamo??={})[channel]=id;
   }
  }
 }
 if(v.lastFabricCamo&&typeof v.lastFabricCamo==='object'&&!Array.isArray(v.lastFabricCamo)){
  for(const channel of FABRIC_CAMO_CHANNELS){
   const id=v.lastFabricCamo[channel];
   if(isHeadwearCamoId(id)&&id!=='splittertarn-31')
    (result.lastFabricCamo??={})[channel]=id;
  }
 }
 if(v.fabricCamoRoll&&typeof v.fabricCamoRoll==='object'&&!Array.isArray(v.fabricCamoRoll)){
  for(const channel of FABRIC_CAMO_CHANNELS){
   const roll=v.fabricCamoRoll[channel];
   if(Number.isInteger(roll)&&roll!>=0&&roll!<4096)
    (result.fabricCamoRoll??={})[channel]=roll;
  }
 }
 if(v.fabricSolids&&typeof v.fabricSolids==='object'&&!Array.isArray(v.fabricSolids)){
  for(const channel of FABRIC_CAMO_CHANNELS){
   const color=v.fabricSolids[channel];
   if(isGarmentSolidId(color)&&FABRIC_SOLID_CHOICES[channel].includes(color))
    (result.fabricSolids??={})[channel]=color;
  }
 }
 if(isGarmentSolidId(v.cuffSolid))result.cuffSolid=v.cuffSolid;
 if(isGarmentSolidId(v.knitSolid))result.knitSolid=v.knitSolid;
 if(isGarmentSolidId(v.pouchSolid))result.pouchSolid=v.pouchSolid;
 if(isHeadwearSolidColorId(v.headwearColor))result.headwearColor=v.headwearColor;
 if(isHeadwearCamoId(v.headwearCamo)&&v.headwearCamo!=='splittertarn-31')result.headwearCamo=v.headwearCamo;
 if(Number.isInteger(v.headwearCamoRoll)&&v.headwearCamoRoll!>=0&&v.headwearCamoRoll!<4096)
  result.headwearCamoRoll=v.headwearCamoRoll;
 if(SLEEVE_STATES.includes(v.sleeveState as SleeveState))
  result.sleeveState=v.sleeveState as SleeveState;
 if(TROUSER_HEMS.includes(v.trouserHem as TrouserHem))
  result.trouserHem=v.trouserHem as TrouserHem;
 if(isGarmentColorway(v.topColorway))result.topColorway=v.topColorway;
 result.accessories=readWardrobeAccessories(v.accessories);
 if(v.mounts&&typeof v.mounts==='object'){
  const incoming=v.mounts;
  for(const kind of ['medical','utility'] as const){
   const id=incoming[kind];
   if(typeof id==='string'&&wardrobeMount(id)?.kind===kind)
    result.mounts[kind]=id;
  }
  result.mounts.magazineOrder=incoming.magazineOrder==='right-left'?
   'right-left':'left-right';
 }
 return result;
}
export const setWardrobeStyle=(wardrobe:WardrobeOptions,slot:WardrobeSlot,id:string)=>
 wardrobeItem(slot,id)?{...wardrobe,styles:{...wardrobe.styles,[slot]:id}}:wardrobe;
/** Set solid fabric and remove only that channel's active print. Do not
 * erase the prior material selection in any other channel. */
export function setWardrobeFabricSolid(wardrobe:WardrobeOptions,
 channel:FabricCamoChannel,id:GarmentSolidId):WardrobeOptions{
 if(!FABRIC_SOLID_CHOICES[channel].includes(id))return wardrobe;
 return {...wardrobe,
  fabricSolids:{...wardrobe.fabricSolids,[channel]:id},
  lastFabricCamo:{...wardrobe.lastFabricCamo,
   [channel]:wardrobe.fabricCamo?.[channel]??wardrobe.lastFabricCamo?.[channel]},
  fabricCamo:{...wardrobe.fabricCamo,[channel]:undefined}};
}
export function setWardrobeFabricCamo(wardrobe:WardrobeOptions,
 channel:FabricCamoChannel,id:HeadwearCamoId|null,
 outfit:CamoOutfit):WardrobeOptions{
 if(id===null){
  if(!wardrobe.fabricCamo?.[channel])return wardrobe;
  return {...wardrobe,fabricCamo:{...wardrobe.fabricCamo,[channel]:undefined}};
 }
 if(!isHeadwearCamoId(id)||!fabricCamoCompatible(id,channel,outfit))
  return wardrobe;
 return {...wardrobe,
  lastFabricCamo:{...wardrobe.lastFabricCamo,[channel]:id},
  fabricCamo:{...wardrobe.fabricCamo,[channel]:id},
  fabricCamoRoll:{...wardrobe.fabricCamoRoll,
   [channel]:wardrobe.fabricCamo?.[channel]===id?
    nextHeadwearCamoRoll(wardrobe.fabricCamoRoll?.[channel]):0}};
}
export function rerollWardrobeFabricCamo(wardrobe:WardrobeOptions,
 channel:FabricCamoChannel,outfit:CamoOutfit):WardrobeOptions{
 const id=wardrobe.fabricCamo?.[channel];
 if(!id||!fabricCamoCompatible(id,channel,outfit))return wardrobe;
 return setWardrobeFabricCamo(wardrobe,channel,id,outfit);
}
export function matchWardrobeUniformCamo(wardrobe:WardrobeOptions,
 outfit:CamoOutfit,selected:HeadwearCamoId):WardrobeOptions{
 let next=wardrobe;
 for(const channel of ['top','trousers'] as const)
  if(fabricCamoCompatible(selected,channel,outfit)&&
   next.fabricCamo?.[channel]!==selected)
   next=setWardrobeFabricCamo(next,channel,selected,outfit);
 return next;
}

/** Keep combat truth authoritative: styles incompatible with a real equipped
 * item are replaced by a representative look, never by a magical item swap.
 */
export function resolvedWardrobe(wardrobe:WardrobeOptions|undefined,
 kit?:EquipmentLoadout):Record<WardrobeSlot,string>{
 const desired={...DEFAULTS,...(wardrobe?.styles??{})};
 if(!kit)return desired;
 // Cosmetic defaults follow the *actual* selected kit when a user hasn't
 // explicitly chosen a style. Choosing light boots must never show field
 // boots merely because an empty WardrobeOptions object exists.
 if(!wardrobe?.styles.top)
  desired.top='bdu-shirt';
 if(!wardrobe?.styles.trousers)
  desired.trousers='bdu-trousers';
 if(!wardrobe?.styles.footwear)
  desired.footwear=kit.slots.feet==='feet-none'?'bare-feet':'field-boots';
 if(!wardrobe?.styles.gloves)
  desired.gloves=kit.slots.hands==='hands-none'?'gloves-none':'gloves-field';
 const slots=kit.slots;
 const choose=(slot:WardrobeSlot,allowed:readonly string[],fallback:string)=>{
  if(!allowed.includes(desired[slot]))desired[slot]=fallback;
 };
 // Headwear is an explicitly cosmetic Studio choice, independent of the
 // equipment loadout's helmet/cap protection. The real kit stays authoritative
 // for weight, inventory and injury; never silently swap it from a look edit.
 // When no style was chosen, the initial look still follows the real kit.
 if(!wardrobe?.styles.headwear){
  desired.headwear=slots.head==='head-helmet'?'ach':
   slots.head==='head-bump'?'bump-helmet':
   slots.head==='head-cap'?'patrol-cap':'bare';
 }
 // Face/helmet assembly constraints: one eyewear layer, one face cover and
 // only mounted hearing protection on a shell that can actually mount it.
 if(desired.facewear==='gas-mask'){
  desired.eyewear='eyes-none';
  if(desired.headset==='helmet-ears')desired.headset='comms-none';
 }
 if(desired.headset==='helmet-ears'&&
   !['ach','high-cut','high-cut-rails','bump-helmet',
     'pasgt'].includes(desired.headwear))
  desired.headset='comms-none';
 choose('armorStyle',slots.armor==='armor-carrier'?
  ['plate-slick','plate-jpc','plate-standard','plate-heavy','plate-legacy']:
  slots.armor==='armor-soft'?
  ['soft-slick','soft-vest','soft-flak']:['armor-bare'],
  slots.armor==='armor-carrier'?'plate-standard':
  slots.armor==='armor-soft'?'soft-vest':'armor-bare');
 choose('rigStyle',slots.rig==='rig-full'?
  ['field-webbing','lbv','full-chest','split-front','sadf-webbing']:
  slots.rig==='rig-light'?['micro-rig','light-rig','chest-placard',
   'chicom-rig','bandolier']:
  ['no-rig'],slots.rig==='rig-full'?'field-webbing':
    slots.rig==='rig-light'?'light-rig':'no-rig');
 choose('beltStyle',slots.belt==='belt-none'?['no-belt']:
  slots.belt==='belt-light'?['plain-belt','light-belt']:['duty-belt','battle-belt','padded-belt'],
  slots.belt==='belt-none'?'no-belt':slots.belt==='belt-light'?'light-belt':'duty-belt');
 choose('packStyle',slots.backpack==='backpack-day'?
  ['hydration','admin-pack','day-pack','assault-pack','sling-bag']:
  slots.backpack==='backpack-field'?
  ['field-pack','rucksack','medic-pack','comms-pack','duffel']:
  ['no-pack'],slots.backpack==='backpack-day'?'day-pack':
  slots.backpack==='backpack-field'?'field-pack':'no-pack');
 choose('trousers',['bdu-trousers','acu-trousers','gorka-trousers'],
  'bdu-trousers');
 choose('footwear',slots.feet==='feet-none'?['bare-feet']:['field-boots'],
  slots.feet==='feet-none'?'bare-feet':'field-boots');
 choose('gloves',slots.hands==='hands-none'?
  ['gloves-none']:['gloves-field'],
  slots.hands==='hands-none'?'gloves-none':'gloves-field');
 return desired;
}
export function wardrobeConflicts(w:WardrobeOptions,kit:EquipmentLoadout){
 const r=resolvedWardrobe(w,kit);
 return WARDROBE_SLOTS.filter(slot=>w.styles[slot]&&w.styles[slot]!==r[slot]);
}
