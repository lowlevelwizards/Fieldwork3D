/** Tactical Wardrobe 2.0: style recipes, not new weapons or magic inventory.
 * Physical protection, carrying capacity, costs and ownership remain in
 * equipment-catalog / equipment-loadouts / campaign-state.
 */
import type {EquipmentLoadout} from './equipment-loadouts.ts';
import {wardrobeMount} from './operator-wardrobe-mounts.ts';
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
add('headwear','soft',[
 ['patrol-cap','Patrol cap'],['baseball-cap','Baseball cap'],
 ['backwards-cap','Backwards baseball cap'],['beanie','Beanie'],
 ['boonie','Boonie hat'],['field-cap','Field cap']
]);
add('headwear','bump',[
 ['skate-helmet','Skate helmet'],['bump-helmet','Bump helmet']
]);
add('headwear','ballistic',[
 ['soviet-steel','Steel helmet'],['pasgt','PASGT-style helmet'],
 ['ach','ACH / MICH-style helmet'],['high-cut','High-cut helmet'],
 ['high-cut-rails','High-cut helmet with rails']
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
add('top','underlayer',[['base-layer','Base underlayer']]);
// Stage 3B: only the two approved prototype families remain in the active catalog.
add('top','uniform',[
 ['bdu-shirt','BDU / Field blouse'],['acu-shirt','ACU / Modern blouse']
]);
add('trousers','underlayer',[['base-shorts','Base shorts']]);
// Unremodeled lower-body pieces are represented by one honest foundation.
add('trousers','uniform',[['field-trousers','Field trousers (foundation)']]);
add('footwear','unshod',[['bare-feet','Bare feet']]);
add('footwear','boots',[['field-boots','Field boots (foundation)']]);
add('armorStyle','none',[['armor-bare','No armor']]);
add('armorStyle','soft',[
 ['soft-slick','Slick soft armor'],['soft-paca','PACA-style soft armor'],
 ['soft-vest','Conventional soft armor vest']
]);
add('armorStyle','plates',[
 ['plate-slick','Slick plate carrier'],['plate-jpc','Light plate carrier'],
 ['plate-standard','Standard plate carrier'],
 ['plate-heavy','Heavy plate carrier']
]);
add('rigStyle','none',[['no-rig','None']]);
add('rigStyle','light',[
 ['micro-rig','Micro rig'],['light-rig','Light chest rig'],
 ['chest-placard','Chest placard']
]);
add('rigStyle','full',[
 ['field-webbing','Field webbing'],['lbv','Load-bearing vest'],
 ['full-chest','Full chest rig'],['belt-harness','Belt-and-suspender webbing']
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
export type WardrobeOptions={
 version:1;styles:Partial<Record<WardrobeSlot,string>>;
 headwearColor?:HeadwearSolidColorId;headwearCamo?:HeadwearCamoId;
 headwearCamoRoll?:number;
 /** Authored garment prints supersede legacy procedurals only on this channel. */
 fabricCamo?:Partial<Record<FabricCamoChannel,HeadwearCamoId>>;
 /** Saved individual fabric-cut seeds; never regenerated during animation. */
 fabricCamoRoll?:Partial<Record<FabricCamoChannel,number>>;
 rolledSleeves:boolean;
 accessories:WardrobeAccessoryConfiguration;
 mounts:{medical?:string;utility?:string;magazineOrder:'left-right'|'right-left'};
};
const DEFAULTS:Record<WardrobeSlot,string>={
 headwear:'ach',facewear:'face-none',eyewear:'eyes-none',headset:'comms-none',
 top:'bdu-shirt',trousers:'field-trousers',footwear:'field-boots',
 armorStyle:'soft-vest',rigStyle:'light-rig',beltStyle:'duty-belt',
 packStyle:'day-pack',gloves:'gloves-field',knees:'knee-none',
 wrist:'wrist-none'
};
export const initialWardrobe=():WardrobeOptions=>({
 version:1,styles:{},rolledSleeves:false,
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
   if(typeof id==='string'&&wardrobeItem(slot,id))result.styles[slot]=id;
  }
 }
 if(v.fabricCamo&&typeof v.fabricCamo==='object'&&!Array.isArray(v.fabricCamo)){
  for(const channel of FABRIC_CAMO_CHANNELS){
   const id=v.fabricCamo[channel];
   if(isHeadwearCamoId(id)){
    (result.fabricCamo??={})[channel]=id;
   }
  }
 }
 if(v.fabricCamoRoll&&typeof v.fabricCamoRoll==='object'&&!Array.isArray(v.fabricCamoRoll)){
  for(const channel of FABRIC_CAMO_CHANNELS){
   const roll=v.fabricCamoRoll[channel];
   if(Number.isInteger(roll)&&roll!>=0&&roll!<4096)
    (result.fabricCamoRoll??={})[channel]=roll;
  }
 }
 if(isHeadwearSolidColorId(v.headwearColor))result.headwearColor=v.headwearColor;
 if(isHeadwearCamoId(v.headwearCamo))result.headwearCamo=v.headwearCamo;
 if(Number.isInteger(v.headwearCamoRoll)&&v.headwearCamoRoll!>=0&&v.headwearCamoRoll!<4096)
  result.headwearCamoRoll=v.headwearCamoRoll;
 result.rolledSleeves=v.rolledSleeves===true;
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
  desired.top=kit.slots.top==='top-none'?'base-layer':'bdu-shirt';
 if(!wardrobe?.styles.trousers)
  desired.trousers=kit.slots.legs==='legs-none'?'base-shorts':'field-trousers';
 if(!wardrobe?.styles.footwear)
  desired.footwear=kit.slots.feet==='feet-none'?'bare-feet':'field-boots';
 if(!wardrobe?.styles.gloves)
  desired.gloves=kit.slots.hands==='hands-none'?'gloves-none':'gloves-field';
 const slots=kit.slots;
 const choose=(slot:WardrobeSlot,allowed:readonly string[],fallback:string)=>{
  if(!allowed.includes(desired[slot]))desired[slot]=fallback;
 };
 choose('headwear',slots.head==='head-helmet'?
  ['soviet-steel','pasgt','ach','high-cut','high-cut-rails']:
  slots.head==='head-bump'?['skate-helmet','bump-helmet']:
  slots.head==='head-cap'?
  ['patrol-cap','baseball-cap','backwards-cap','beanie','boonie','field-cap']:
  ['bare'],slots.head==='head-bump'?'bump-helmet':'ach');
 if(slots.head==='head-none')desired.headwear='bare';
 if(slots.head==='head-cap'&&desired.headwear==='ach')desired.headwear='patrol-cap';
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
  ['plate-slick','plate-jpc','plate-standard','plate-heavy']:
  slots.armor==='armor-soft'?
  ['soft-slick','soft-paca','soft-vest']:['armor-bare'],
  slots.armor==='armor-carrier'?'plate-standard':
  slots.armor==='armor-soft'?'soft-vest':'armor-bare');
 choose('rigStyle',slots.rig==='rig-full'?
  ['field-webbing','lbv','full-chest','belt-harness']:
  slots.rig==='rig-light'?['micro-rig','light-rig','chest-placard']:
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
