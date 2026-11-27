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
 'field-pack':{id:'backpack-field',label:'ALICE field pack',capacity:16,massKg:2.2,bulk:4,harness:'load-bearing',role:'general',reference:'Medium ALICE',motion:.4,size:[8,15,15]},
 rucksack:{id:'backpack-expedition',label:'Expedition rucksack',capacity:24,massKg:3.2,bulk:5,harness:'load-bearing',role:'general',reference:'PLCE Bergen',motion:.7,size:[9.4,19,17]},
 'medic-pack':{id:'backpack-medical',label:'Medical pack',capacity:12,massKg:1.5,bulk:3,harness:'padded',role:'medical',reference:'Medic Assault',motion:.4,size:[6,13,13]},
 'comms-pack':{id:'backpack-comms',label:'Communications pack',capacity:12,massKg:1.8,bulk:3,harness:'load-bearing',role:'comms',reference:'COMM-3',motion:.35,size:[7,15,11]},
 'civilian-pack':{id:'backpack-civilian',label:'Civilian backpack',capacity:6,massKg:.5,bulk:2,harness:'light',role:'general',reference:'Classic school daypack',motion:.85,size:[5,11,10]}
} as const satisfies Record<string,PackProfile>;
export type PackStyle=keyof typeof PACK_PROFILES;
export const PACK_STYLES=Object.keys(PACK_PROFILES) as PackStyle[];
export const LEGACY_PACK_STYLES={
 'backpack-none':['no-pack'],
 'backpack-day':['hydration','admin-pack','day-pack','assault-pack','sling-bag'],
 'backpack-field':['field-pack','rucksack','medic-pack','comms-pack','duffel']
} as const satisfies Record<LegacyPackEquipment,readonly string[]>;
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
const aliases:Readonly<Record<string,PackStyle>>={'admin-pack':'assault-panel','sling-bag':'civilian-pack',duffel:'rucksack'};
export function proposedPackStyle(oldStyle:string):PackStyle|undefined{
 return isPackStyle(oldStyle)?oldStyle:Object.hasOwn(aliases,oldStyle)?aliases[oldStyle]:undefined;
}
/** Advisory only: caller must quote the real inventory transaction before changing a save. */
export function quotePackMigration(id:LegacyPackEquipment,style:string,usedSpaces:number,compatible:boolean){
 const target=legacyPackEquipment(style)===id?proposedPackStyle(style):undefined;
 if(!target)return {ok:false as const,reason:'INVALID LEGACY PAIR'};
 if(!Number.isFinite(usedSpaces)||usedSpaces<0)return {ok:false as const,reason:'INVALID OCCUPANCY'};
 const profile=PACK_PROFILES[target];
 if(!compatible&&profile.harness==='direct')return {ok:false as const,reason:'CARRIER MOUNT REQUIRED'};
 if(usedSpaces>profile.capacity)return {ok:false as const,reason:'REPACK REQUIRED'};
 return {ok:true as const,style:target,profile};
}
