/** Equipment 01: declarative equipment identities. Combat numbers remain
 * authoritative in breach-combat; these are carrying/visual metadata only. */
import type {WeaponId} from './breach-combat.ts';

export type EquipmentSlot='primary'|'secondary'|'head'|'armor'|'rig'|
 'belt'|'backpack'|'top'|'legs'|'hands'|'feet'|'medical'|'tactical'|'utility';
export type EquipmentCategory='weapon'|'protection'|'load-bearing'|
 'clothing'|'ammunition'|'medical'|'tactical'|'utility'|'accessory'|'personal';
export type EquipmentDefinition={
 id:string;name:string;category:EquipmentCategory;slot:EquipmentSlot;
 massKg:number;bulk:number;description:string;
 weapon?:WeaponId;capacity?:number;compatibility?:readonly WeaponId[];
 coverage?:readonly ('head'|'torso'|'side'|'limbs')[];
 visual?:'helmet'|'cap'|'vest'|'carrier'|'chest-rig'|'backpack'|'belt'|'pouch';
 capability?:'medical'|'flash'|'smoke'|'light'|'radio'|'breach'|'observation';
};
/** Design-time catalog. Slots are intentionally broad: later builds attach
 * physical pouches, ownership instances, armor regions and real tool actions. */
export const EQUIPMENT_CATALOG:Readonly<Record<string,EquipmentDefinition>>={
 'primary-carbine':{id:'primary-carbine',name:'Service Carbine',category:'weapon',slot:'primary',
  massKg:3.15,bulk:3,weapon:'carbine',description:'Versatile general-purpose primary.'},
 'primary-smg':{id:'primary-smg',name:'Compact SMG',category:'weapon',slot:'primary',
  massKg:2.7,bulk:2,weapon:'smg',description:'Short and easy to maneuver.'},
 'primary-rifle':{id:'primary-rifle',name:'Full-Length Rifle',category:'weapon',slot:'primary',
  massKg:4.1,bulk:4,weapon:'rifle',description:'Long-range specialist primary.'},
 'primary-shotgun':{id:'primary-shotgun',name:'Pump Shotgun',category:'weapon',slot:'primary',
  massKg:3.6,bulk:4,weapon:'shotgun',description:'Close-range primary with individually loaded shells.'},
 'head-none':{id:'head-none',name:'Unprotected',category:'protection',slot:'head',
  massKg:0,bulk:0,description:'No head protection.'},
 'head-cap':{id:'head-cap',name:'Patrol Cap',category:'clothing',slot:'head',
  massKg:.12,bulk:0,visual:'cap',description:'Soft headwear without ballistic protection.'},
 'head-helmet':{id:'head-helmet',name:'Protective Helmet',category:'protection',slot:'head',
  massKg:1.35,bulk:1,coverage:['head'],visual:'helmet',description:'Protects covered areas of the head; armor mechanics pending.'},
 'armor-none':{id:'armor-none',name:'Unarmored',category:'protection',slot:'armor',
  massKg:0,bulk:0,description:'No protective vest.'},
 'armor-soft':{id:'armor-soft',name:'Soft Armor Vest',category:'protection',slot:'armor',
  massKg:2.5,bulk:2,coverage:['torso'],visual:'vest',description:'Light torso protection; ballistic simulation pending.'},
 'armor-carrier':{id:'armor-carrier',name:'Plate Carrier',category:'protection',slot:'armor',
  massKg:6.8,bulk:3,coverage:['torso'],visual:'carrier',description:'Front/back plate carrier; armor simulation pending.'},
 'rig-none':{id:'rig-none',name:'No Chest Rig',category:'load-bearing',slot:'rig',
  massKg:0,bulk:0,description:'Minimal carrying equipment.'},
 'rig-light':{id:'rig-light',name:'Light Chest Rig',category:'load-bearing',slot:'rig',
  massKg:1.1,bulk:1,capacity:4,visual:'chest-rig',description:'Four accessible carrying spaces.'},
 'rig-full':{id:'rig-full',name:'Field Webbing',category:'load-bearing',slot:'rig',
  massKg:1.9,bulk:2,capacity:7,visual:'chest-rig',description:'Expanded load-bearing webbing.'},
 'belt-standard':{id:'belt-standard',name:'Duty Belt',category:'load-bearing',slot:'belt',
  massKg:.75,bulk:1,capacity:3,visual:'belt',description:'General-purpose belt for accessible tools.'},
 'belt-light':{id:'belt-light',name:'Light Belt',category:'load-bearing',slot:'belt',
  massKg:.32,bulk:0,capacity:1,visual:'belt',description:'Basic compact belt.'},
 'backpack-none':{id:'backpack-none',name:'No Backpack',category:'load-bearing',slot:'backpack',
  massKg:0,bulk:0,capacity:0,description:'Travel light.'},
 'backpack-day':{id:'backpack-day',name:'Day Pack',category:'load-bearing',slot:'backpack',
  massKg:1.2,bulk:2,capacity:8,visual:'backpack',description:'Small additional equipment storage.'},
 'backpack-field':{id:'backpack-field',name:'Field Pack',category:'load-bearing',slot:'backpack',
  massKg:2.4,bulk:4,capacity:16,visual:'backpack',description:'Extended capacity at increased bulk.'},
 'top-uniform':{id:'top-uniform',name:'Field Jacket',category:'clothing',slot:'top',
  massKg:.85,bulk:1,description:'Standard field uniform.'},
 'top-light':{id:'top-light',name:'Light Shirt',category:'clothing',slot:'top',
  massKg:.36,bulk:0,description:'Lightweight shirt with rolled-sleeve style.'},
 'legs-field':{id:'legs-field',name:'Field Trousers',category:'clothing',slot:'legs',
  massKg:.65,bulk:0,description:'Hardwearing field trousers.'},
 'legs-light':{id:'legs-light',name:'Light Trousers',category:'clothing',slot:'legs',
  massKg:.42,bulk:0,description:'Less bulky field trousers.'},
 'hands-none':{id:'hands-none',name:'Bare Hands',category:'clothing',slot:'hands',
  massKg:0,bulk:0,description:'No gloves.'},
 'hands-gloves':{id:'hands-gloves',name:'Field Gloves',category:'clothing',slot:'hands',
  massKg:.14,bulk:0,description:'Practical protective gloves.'},
 'feet-boots':{id:'feet-boots',name:'Field Boots',category:'clothing',slot:'feet',
  massKg:1.25,bulk:1,description:'Durable combat boots.'},
 'feet-light':{id:'feet-light',name:'Light Boots',category:'clothing',slot:'feet',
  massKg:.8,bulk:0,description:'Lighter footwear.'},
 'medical-none':{id:'medical-none',name:'No Medical Kit',category:'medical',slot:'medical',
  massKg:0,bulk:0,description:'No dedicated medical kit.'},
 'medical-basic':{id:'medical-basic',name:'First Aid Kit',category:'medical',slot:'medical',
  massKg:.7,bulk:1,capability:'medical',description:'Personal first-aid supplies; combat use integration pending.'},
 'medical-trauma':{id:'medical-trauma',name:'Trauma Pack',category:'medical',slot:'medical',
  massKg:2.1,bulk:2,capability:'medical',description:'Expanded treatment supplies; combat use integration pending.'},
 'tactical-none':{id:'tactical-none',name:'No Tactical Tool',category:'tactical',slot:'tactical',
  massKg:0,bulk:0,description:'No tactical consumable assigned.'},
 'tactical-flash':{id:'tactical-flash',name:'Flashbang',category:'tactical',slot:'tactical',
  massKg:.38,bulk:1,capability:'flash',description:'Disorientation device; loadout-to-action integration pending.'},
 'tactical-smoke':{id:'tactical-smoke',name:'Smoke Device',category:'tactical',slot:'tactical',
  massKg:.45,bulk:1,capability:'smoke',description:'Obscurant device; combat implementation pending.'},
 'utility-none':{id:'utility-none',name:'No Utility Tool',category:'utility',slot:'utility',
  massKg:0,bulk:0,description:'No dedicated utility tool.'},
 'utility-light':{id:'utility-light',name:'Flashlight',category:'utility',slot:'utility',
  massKg:.22,bulk:0,capability:'light',description:'Portable light; combat implementation pending.'},
 'utility-radio':{id:'utility-radio',name:'Team Radio',category:'utility',slot:'utility',
  massKg:.48,bulk:1,capability:'radio',description:'Radio equipment; gameplay integration pending.'},
 'utility-breach':{id:'utility-breach',name:'Breaching Ram',category:'utility',slot:'utility',
  massKg:2.2,bulk:3,capability:'breach',description:'Force suitable hinged entry doors.'},
 'utility-pry':{id:'utility-pry',name:'Pry Bar',category:'utility',slot:'utility',
  massKg:1.6,bulk:2,capability:'breach',description:'Lever compatible door frames; slower but quieter.'},
 'utility-cutter':{id:'utility-cutter',name:'Bolt Cutters',category:'utility',slot:'utility',
  massKg:1.9,bulk:2,capability:'breach',description:'Cut cuttable gate and mesh fasteners.'},
 'utility-wedge':{id:'utility-wedge',name:'Door Wedges',category:'utility',slot:'utility',
  massKg:.28,bulk:1,capability:'breach',description:'Reusable wedges for suitable hinged doors.'},
};
export const LOADOUT_SLOTS:readonly Exclude<EquipmentSlot,'secondary'>[]=[
 'primary','head','armor','rig','belt','backpack','top','legs','hands','feet','medical','tactical','utility'
];
export const DEFAULT_EQUIPMENT:Readonly<Record<Exclude<EquipmentSlot,'secondary'>,string>>={
 primary:'primary-carbine',head:'head-helmet',armor:'armor-soft',rig:'rig-light',
 belt:'belt-standard',backpack:'backpack-day',top:'top-uniform',
 legs:'legs-field',hands:'hands-gloves',feet:'feet-boots',
 medical:'medical-basic',tactical:'tactical-flash',utility:'utility-radio'
};
export const itemDefinition=(id:string):EquipmentDefinition|undefined=>EQUIPMENT_CATALOG[id];
export const itemsForSlot=(slot:EquipmentSlot):EquipmentDefinition[]=>
 Object.values(EQUIPMENT_CATALOG).filter(item=>item.slot===slot);
export const validEquipmentChoice=(slot:EquipmentSlot,id:string)=>
 EQUIPMENT_CATALOG[id]?.slot===slot;
export const equipmentMass=(ids:readonly string[]):number=>ids.reduce((sum,id)=>
 sum+(EQUIPMENT_CATALOG[id]?.massKg??0),0);
