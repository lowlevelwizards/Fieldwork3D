/** BP1: canonical backpack definitions, staged until authored art and inventory migration.
 * No new equipment is issued by this module. Existing saves retain their carrier IDs.
 */
export type PackHarness='none'|'light'|'padded'|'load-bearing'|'direct';
export type LegacyPackEquipment='backpack-none'|'backpack-day'|'backpack-field';
export type PackProfile=Readonly<{
 id:string;label:string;capacity:number;massKg:number;bulk:number;
 harness:PackHarness;role:'none'|'hydration'|'general'|'medical'|'comms';
 reference:string;motion:number;
 /** Pack-local preliminary envelope: depth (+X towards body), height, width. */
 size:readonly [number,number,number];
}>;
export const PACK_PROFILES={
 'no-pack':{id:'backpack-none',label:'No backpack',capacity:0,massKg:0,bulk:0,harness:'none',role:'none',reference:'',motion:0,size:[0,0,0]},
 hydration:{id:'backpack-hydration',label:'Hydration carrier',capacity:0,massKg:.4,bulk:1,harness:'light',role:'hydration',reference:'ThermoBak',motion:.25,size:[2.6,11.8,6]},
 'assault-panel':{id:'backpack-panel',label:'Assault panel',capacity:4,massKg:.6,bulk:1,harness:'direct',role:'general',reference:'Zip-on pack panel',motion:0,size:[3.4,10.4,11.5]},
 'day-pack':{id:'backpack-day',label:'Tactical daypack',capacity:8,massKg:1,bulk:2,harness:'padded',role:'general',reference:'RUSH12',motion:.65,size:[5.2,12.5,9.3]},
 'assault-pack':{id:'backpack-assault',label:'Assault pack',capacity:12,massKg:1.6,bulk:3,harness:'padded',role:'general',reference:'3 Day Assault',motion:.6,size:[8.4,15,12.2]},
 'field-pack':{id:'backpack-field',label:'ALICE field pack',capacity:16,massKg:2.2,bulk:4,harness:'load-bearing',role:'general',reference:'Medium ALICE',motion:.4,size:[8,14,15.5]},
 rucksack:{id:'backpack-expedition',label:'Expedition rucksack',capacity:24,massKg:3.2,bulk:5,harness:'load-bearing',role:'general',reference:'PLCE Bergen',motion:.7,size:[10,21,16]},
 'medic-pack':{id:'backpack-medical',label:'Medical pack',capacity:12,massKg:1.5,bulk:3,harness:'padded',role:'medical',reference:'Medic Assault',motion:.4,size:[4.5,13,12.5]},
 'comms-pack':{id:'backpack-comms',label:'Communications pack',capacity:12,massKg:1.8,bulk:3,harness:'load-bearing',role:'comms',reference:'COMM-3',motion:.35,size:[5.6,15,10]},
 'civilian-pack':{id:'backpack-civilian',label:'Civilian backpack',capacity:6,massKg:.5,bulk:2,harness:'light',role:'general',reference:'Classic school daypack',motion:.85,size:[4.8,11.5,9]}
} as const satisfies Record<string,PackProfile>;
export type PackStyle=keyof typeof PACK_PROFILES;
export const PACK_STYLES=Object.keys(PACK_PROFILES) as PackStyle[];
export const LEGACY_PACK_STYLES={
 'backpack-none':['no-pack'],
 'backpack-day':['hydration','admin-pack','day-pack','assault-pack','civilian-pack'],
 'backpack-field':['field-pack','rucksack','medic-pack','comms-pack']
} as const satisfies Record<LegacyPackEquipment,readonly string[]>;
/** Old saved appearance aliases, never offered as items. */
export function migratePackAppearance(style:unknown):unknown{
 return style==='sling-bag'?'civilian-pack':style==='duffel'?'rucksack':style;
}
export function legacyPackEquipment(style:string):LegacyPackEquipment|undefined{
 for(const id of Object.keys(LEGACY_PACK_STYLES) as LegacyPackEquipment[])
  if((LEGACY_PACK_STYLES[id] as readonly string[]).includes(style))return id;
 return undefined;
}
export function legacyPackStyles(id:string):readonly string[]{
 return Object.hasOwn(LEGACY_PACK_STYLES,id)?LEGACY_PACK_STYLES[id as LegacyPackEquipment]:LEGACY_PACK_STYLES['backpack-none'];
}
export function legacyPackDefault(id:string):string{
 return id==='backpack-day'?'day-pack':id==='backpack-field'?'field-pack':'no-pack';
}
export function isPackStyle(value:string):value is PackStyle{
 return Object.hasOwn(PACK_PROFILES,value);
}
const aliases:Readonly<Record<string,PackStyle>>={'admin-pack':'assault-panel'};
export function proposedPackStyle(oldStyle:string):PackStyle|undefined{
 return isPackStyle(oldStyle)?oldStyle:Object.hasOwn(aliases,oldStyle)?aliases[oldStyle]:undefined;
}
/** Advisory only: caller must quote the real inventory transaction before changing a save. */
export function quotePackMigration(id:LegacyPackEquipment,style:string,usedSpaces:number,compatible:boolean){
 const migrated=migratePackAppearance(style);
 const target=typeof migrated==='string'&&legacyPackEquipment(migrated)===id?proposedPackStyle(migrated):undefined;
 if(!target)return {ok:false as const,reason:'INVALID LEGACY PAIR'};
 if(!Number.isFinite(usedSpaces)||usedSpaces<0)return {ok:false as const,reason:'INVALID OCCUPANCY'};
 const profile=PACK_PROFILES[target];
 if(!compatible&&profile.harness==='direct')return {ok:false as const,reason:'CARRIER MOUNT REQUIRED'};
 if(usedSpaces>profile.capacity)return {ok:false as const,reason:'REPACK REQUIRED'};
 return {ok:true as const,style:target,profile};
}

/** Canonical issue identity for new transactions, separate from legacy
 * appearance classes. Old saves remain on their existing capacity until
 * an explicit, validated equipment transaction succeeds. */
export function canonicalPackEquipment(style:string):string|undefined{
 const migrated=migratePackAppearance(style);
 const id=typeof migrated==='string'?proposedPackStyle(migrated):undefined;
 return id?PACK_PROFILES[id].id:undefined;
}
export function packStylesForEquipment(id:string):readonly string[]{
 if(Object.hasOwn(LEGACY_PACK_STYLES,id))return legacyPackStyles(id);
 const style=PACK_STYLES.find(s=>PACK_PROFILES[s].id===id);
 return style==='assault-panel'?['admin-pack']:style?[style]:['no-pack'];
}
export function packDefaultForEquipment(id:string):string{
 if(Object.hasOwn(LEGACY_PACK_STYLES,id))return legacyPackDefault(id);
 return packStylesForEquipment(id)[0];
}
