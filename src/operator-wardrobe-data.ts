/** Tactical Wardrobe 2.0: style recipes, not new weapons or magic inventory.
 * Physical protection, carrying capacity, costs and ownership remain in
 * equipment-catalog / equipment-loadouts / campaign-state.
 */
import type {EquipmentLoadout} from './equipment-loadouts.ts';
import {wardrobeMount} from './operator-wardrobe-mounts.ts';
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
add('top','uniform',[
 ['field-jacket','Field jacket'],['bdu-shirt','BDU field blouse'],
 ['acu-shirt','ACU field blouse'],['combat-shirt','Combat shirt'],
 ['light-shirt','Light field shirt']
]);
add('top','civilian',[
 ['t-shirt','T-shirt'],['tank-top','Tank top'],['longsleeve','Long sleeve'],
 ['turtleneck','Turtleneck'],['flannel','Flannel shirt'],
 ['button-short','Short-sleeve button-up'],
 ['button-long','Long-sleeve button-up']
]);
add('top','outerwear',[
 ['tactical-sweater','Tactical sweater'],['softshell','Softshell jacket'],
 ['softshell-hood','Hooded softshell'],['pcu-shell','Insulated field shell']
]);
add('trousers','uniform',[
 ['field-trousers','Field trousers'],['bdu-trousers','BDU trousers'],
 ['acu-trousers','ACU trousers'],['combat-trousers','Combat trousers'],
 ['softshell-trousers','Softshell trousers']
]);
add('trousers','civilian',[
 ['work-pants','Work trousers'],['jeans','Jeans'],['track-pants','Track pants'],
 ['shorts','Shorts']
]);
add('footwear','boots',[
 ['field-boots','Field boots'],['combat-boots','Combat boots'],
 ['tall-boots','Tall field boots'],['hiking-boots','Hiking boots'],
 ['light-boots','Light boots']
]);
add('footwear','shoes',[
 ['hiking-shoes','Hiking shoes'],['trail-shoes','Trail shoes'],
 ['sneakers','Sneakers']
]);
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
add('gloves','gloves',[
 ['gloves-none','Bare hands'],['gloves-light','Light gloves'],
 ['gloves-field','Field gloves'],['gloves-heavy','Heavy gloves']
]);
add('knees','knees',[
 ['knee-none','None'],['knee-integrated','Integrated knee panels'],
 ['knee-soft','Soft knee pads'],['knee-hard','Hard knee pads']
]);
add('wrist','wrist',[
 ['wrist-none','None'],['watch','Field watch'],
 ['wrist-nav','Wrist navigation device']
]);
export const WARDROBE_ITEMS:readonly WardrobeItem[]=ITEMS;
export const wardrobeItemsForSlot=(slot:WardrobeSlot)=>
 WARDROBE_ITEMS.filter(x=>x.slot===slot);
export const wardrobeItem=(slot:WardrobeSlot,id:string)=>
 WARDROBE_ITEMS.find(x=>x.slot===slot&&x.id===id);
export const WARDROBE_PATTERNS=[
 'solid','woodland','desert','multi-terrain','digital-woodland',
 'digital-arid','digital-maritime','flecktarn','flora','emr',
 'brushstroke','tiger','swedish-geometric','atacs-inspired',
 'winter','flannel','denim'
] as const;
export type WardrobePattern=typeof WARDROBE_PATTERNS[number];
export type WardrobeOptions={
 version:1;styles:Partial<Record<WardrobeSlot,string>>;
 patterns:Partial<Record<'top'|'trousers'|'armor'|'gear'|'pack'|'head',WardrobePattern>>;
 palette:number;rolledSleeves:boolean;
 mounts:{medical?:string;utility?:string;magazineOrder:'left-right'|'right-left'};
};
const DEFAULTS:Record<WardrobeSlot,string>={
 headwear:'ach',facewear:'face-none',eyewear:'eyes-none',headset:'comms-none',
 top:'field-jacket',trousers:'field-trousers',footwear:'field-boots',
 armorStyle:'soft-vest',rigStyle:'light-rig',beltStyle:'duty-belt',
 packStyle:'day-pack',gloves:'gloves-field',knees:'knee-none',
 wrist:'wrist-none'
};
export const initialWardrobe=():WardrobeOptions=>({
 version:1,styles:{},patterns:{},palette:0,rolledSleeves:false,
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
 if(v.patterns&&typeof v.patterns==='object'&&!Array.isArray(v.patterns)){
  for(const slot of ['top','trousers','armor','gear','pack','head'] as const){
   const p=v.patterns[slot];
   if(typeof p==='string'&&(WARDROBE_PATTERNS as readonly string[]).includes(p))
    result.patterns[slot]=p as WardrobePattern;
  }
 }
 if(Number.isInteger(v.palette)&&v.palette!>=0&&v.palette!<=15)
  result.palette=v.palette!;
 result.rolledSleeves=v.rolledSleeves===true;
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
export const setWardrobePattern=(wardrobe:WardrobeOptions,
 slot:keyof WardrobeOptions['patterns'],pattern:WardrobePattern):WardrobeOptions=>
 (WARDROBE_PATTERNS as readonly string[]).includes(pattern)?
 {...wardrobe,patterns:{...wardrobe.patterns,[slot]:pattern}}:wardrobe;

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
  desired.top=kit.slots.top==='top-light'?'light-shirt':'field-jacket';
 if(!wardrobe?.styles.trousers)
  desired.trousers=kit.slots.legs==='legs-light'?'work-pants':'field-trousers';
 if(!wardrobe?.styles.footwear)
  desired.footwear=kit.slots.feet==='feet-light'?'light-boots':'field-boots';
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
 choose('beltStyle',slots.belt==='belt-light'?
  ['plain-belt','light-belt']:['duty-belt','battle-belt','padded-belt'],
  slots.belt==='belt-light'?'light-belt':'duty-belt');
 choose('packStyle',slots.backpack==='backpack-day'?
  ['hydration','admin-pack','day-pack','assault-pack','sling-bag']:
  slots.backpack==='backpack-field'?
  ['field-pack','rucksack','medic-pack','comms-pack','duffel']:
  ['no-pack'],slots.backpack==='backpack-day'?'day-pack':
  slots.backpack==='backpack-field'?'field-pack':'no-pack');
 choose('gloves',slots.hands==='hands-none'?
  ['gloves-none']:['gloves-light','gloves-field','gloves-heavy'],
  slots.hands==='hands-none'?'gloves-none':'gloves-field');
 return desired;
}
export function wardrobeConflicts(w:WardrobeOptions,kit:EquipmentLoadout){
 const r=resolvedWardrobe(w,kit);
 return WARDROBE_SLOTS.filter(slot=>w.styles[slot]&&w.styles[slot]!==r[slot]);
}
