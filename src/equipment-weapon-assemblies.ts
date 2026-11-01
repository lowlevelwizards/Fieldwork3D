/** Equipment 19.01: pure curated weapon configurations.
 * Local dimensions match the existing rigid firearm coordinate system:
 * stock lies at negative X, muzzle at positive X. Visible gun scale is
 * applied once by the operator rig and shot-time muzzle solver.
 * This module does not depend on Three.js, rendering or DOM state.
 */
import type {WeaponId} from './breach-combat.ts';
import {EQUIPMENT_CATALOG} from './equipment-catalog.ts';

export type WeaponAttachmentSlot='optic'|'muzzle'|'foregrip'|'stock'|'light'|'sling';
export const WEAPON_ATTACHMENT_SLOTS:readonly WeaponAttachmentSlot[]=
 ['optic','muzzle','foregrip','stock','light','sling'];
export type WeaponConfiguration={
 version:1;weapon:WeaponId;slots:Record<WeaponAttachmentSlot,string>;
};
export type WeaponAttachment={
 id:string;name:string;slot:WeaponAttachmentSlot;
 compatible:readonly WeaponId[];massKg:number;
 /** How far ahead of the receiver the added mass is centered, in model units. */
 massX:number;
 /** Only a muzzle device changes the rigid muzzle tip. */
 muzzleExtension?:number;
 /** Only stocks move the rigid shoulder contact. */
 stockShift?:number;
 /** Only fore-end attachments change support hand X. */
 supportShift?:number;
 /** Visual mount position relative to weapon receiver. */
 mountX:number;mountY:number;mountZ:number;
 /** Optic alignment above the receiver. */
 sightHeight?:number;
};
const ALL:readonly WeaponId[]=['carbine','smg','rifle','shotgun'];
const LONG:readonly WeaponId[]=['carbine','rifle'];
const RAIL:readonly WeaponId[]=['carbine','smg','rifle'];
const ids=(a:readonly WeaponId[])=>a;
export const WEAPON_ATTACHMENTS:Readonly<Record<string,WeaponAttachment>>={
 'optic-irons':{id:'optic-irons',name:'Iron Sights',slot:'optic',compatible:ALL,
  massKg:0,massX:0,mountX:0,mountY:2.6,mountZ:0,sightHeight:2.6},
 'optic-reflex':{id:'optic-reflex',name:'Reflex Sight',slot:'optic',compatible:ALL,
  massKg:.16,massX:2,mountX:0,mountY:2.6,mountZ:0,sightHeight:4.4},
 'optic-magnified':{id:'optic-magnified',name:'Magnified Optic',slot:'optic',compatible:LONG,
  massKg:.46,massX:1,mountX:-1,mountY:2.6,mountZ:0,sightHeight:4.8},
 'muzzle-bare':{id:'muzzle-bare',name:'Bare Muzzle',slot:'muzzle',compatible:ALL,
  massKg:0,massX:19.5,mountX:19.5,mountY:0,mountZ:0,muzzleExtension:0},
 'muzzle-hider':{id:'muzzle-hider',name:'Flash Hider',slot:'muzzle',compatible:ALL,
  massKg:.09,massX:20,mountX:19.5,mountY:0,mountZ:0,muzzleExtension:.8},
 'muzzle-brake':{id:'muzzle-brake',name:'Muzzle Brake',slot:'muzzle',compatible:ALL,
  massKg:.16,massX:20,mountX:19.5,mountY:0,mountZ:0,muzzleExtension:1.1},
 'muzzle-suppressor':{id:'muzzle-suppressor',name:'Suppressor',slot:'muzzle',compatible:RAIL,
  massKg:.48,massX:22.25,mountX:19.5,mountY:0,mountZ:0,muzzleExtension:5.5},
 'foregrip-none':{id:'foregrip-none',name:'Standard Fore-end',slot:'foregrip',compatible:ALL,
  massKg:0,massX:5,mountX:6,mountY:-1.5,mountZ:0,supportShift:0},
 'foregrip-handstop':{id:'foregrip-handstop',name:'Handstop',slot:'foregrip',compatible:RAIL,
  massKg:.08,massX:5,mountX:6,mountY:-1.5,mountZ:0,supportShift:1.2},
 'foregrip-vertical':{id:'foregrip-vertical',name:'Vertical Grip',slot:'foregrip',compatible:RAIL,
  massKg:.16,massX:6,mountX:6,mountY:-1.5,mountZ:0,supportShift:1.4},
 'stock-standard':{id:'stock-standard',name:'Standard Stock',slot:'stock',compatible:ALL,
  massKg:0,massX:-11,mountX:-10,mountY:0,mountZ:0,stockShift:0},
 'stock-compact':{id:'stock-compact',name:'Compact Stock',slot:'stock',compatible:RAIL,
  massKg:-.10,massX:-11,mountX:-10,mountY:0,mountZ:0,stockShift:2.4},
 'stock-extended':{id:'stock-extended',name:'Extended Stock',slot:'stock',compatible:LONG,
  massKg:.20,massX:-14,mountX:-10,mountY:0,mountZ:0,stockShift:-2.2},
 'light-none':{id:'light-none',name:'No Weapon Light',slot:'light',compatible:ALL,
  massKg:0,massX:8,mountX:9,mountY:-.5,mountZ:2.4},
 'light-compact':{id:'light-compact',name:'Compact Weapon Light',slot:'light',compatible:RAIL,
  massKg:.14,massX:9,mountX:9,mountY:-.5,mountZ:2.4},
 'sling-none':{id:'sling-none',name:'No Sling',slot:'sling',compatible:ALL,
  massKg:0,massX:0,mountX:-12,mountY:0,mountZ:0},
 'sling-two-point':{id:'sling-two-point',name:'Two-Point Sling',slot:'sling',compatible:ALL,
  massKg:.13,massX:-2,mountX:-12,mountY:0,mountZ:0}
};
void ids;
export type PlatformGeometry={
 weapon:WeaponId;lengthScale:number;baseMassKg:number;baseBalanceX:number;
 stockX:number;primaryX:number;primaryY:number;supportX:number;supportY:number;
 muzzleX:number;
};
export const WEAPON_PLATFORMS:Readonly<Record<WeaponId,PlatformGeometry>>={
 carbine:{weapon:'carbine',lengthScale:.86,baseMassKg:EQUIPMENT_CATALOG['primary-carbine'].massKg,
  baseBalanceX:1,stockX:-13.5,primaryX:-1,primaryY:-2,supportX:1.7,supportY:-1.5,muzzleX:19.5},
 smg:{weapon:'smg',lengthScale:.73,baseMassKg:EQUIPMENT_CATALOG['primary-smg'].massKg,
  baseBalanceX:0,stockX:-13.5,primaryX:-1,primaryY:-2,supportX:2.4,supportY:-1,muzzleX:19.5},
 rifle:{weapon:'rifle',lengthScale:.94,baseMassKg:EQUIPMENT_CATALOG['primary-rifle'].massKg,
  baseBalanceX:1.8,stockX:-13.5,primaryX:-1,primaryY:-2,supportX:.35,supportY:-1.5,muzzleX:19.5},
 shotgun:{weapon:'shotgun',lengthScale:.92,baseMassKg:EQUIPMENT_CATALOG['primary-shotgun'].massKg,
  baseBalanceX:2,stockX:-13.5,primaryX:-1,primaryY:-2,supportX:1,supportY:-2,muzzleX:19.5}
};
const DEFAULT_IDS:Readonly<Record<WeaponAttachmentSlot,string>>={
 optic:'optic-irons',muzzle:'muzzle-bare',foregrip:'foregrip-none',
 stock:'stock-standard',light:'light-none',sling:'sling-none'
};
export function initialWeaponConfiguration(weapon:WeaponId='carbine'):WeaponConfiguration{
 return {version:1,weapon,slots:{...DEFAULT_IDS}};
}
export const compatibleWeaponAttachment=(weapon:WeaponId,slot:WeaponAttachmentSlot,id:string)=>
 WEAPON_ATTACHMENTS[id]?.slot===slot&&WEAPON_ATTACHMENTS[id].compatible.includes(weapon);
export function readWeaponConfiguration(raw:unknown,weapon:WeaponId):WeaponConfiguration{
 const result=initialWeaponConfiguration(weapon);
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||
  (raw as {version?:unknown}).version!==1)return result;
 const slots=(raw as {slots?:unknown}).slots;
 if(!slots||typeof slots!=='object'||Array.isArray(slots))return result;
 const source=slots as Record<string,unknown>;
 for(const slot of WEAPON_ATTACHMENT_SLOTS){
  const id=source[slot];
  if(typeof id==='string'&&compatibleWeaponAttachment(weapon,slot,id))
   result.slots[slot]=id;
 }
 return result;
}
export function setWeaponAttachment(config:WeaponConfiguration,slot:WeaponAttachmentSlot,
 id:string):WeaponConfiguration{
 if(!WEAPON_ATTACHMENT_SLOTS.includes(slot)||
  !compatibleWeaponAttachment(config.weapon,slot,id))return config;
 if(config.slots[slot]===id)return config;
 return {...config,slots:{...config.slots,[slot]:id}};
}
export function changeWeaponPlatform(config:WeaponConfiguration,weapon:WeaponId):WeaponConfiguration{
 return readWeaponConfiguration(config,weapon);
}
export type ResolvedWeaponAssembly={
 weapon:WeaponId;configuration:WeaponConfiguration;
 lengthScale:number;massKg:number;balanceX:number;rotationalInertia:number;
 muzzleX:number;stockX:number;primaryX:number;primaryY:number;
 supportX:number;supportY:number;sightHeight:number;
 mounted:Record<WeaponAttachmentSlot,WeaponAttachment>;
};
export function resolveWeaponAssembly(raw:WeaponConfiguration):ResolvedWeaponAssembly{
 const config=readWeaponConfiguration(raw,raw.weapon);
 const p=WEAPON_PLATFORMS[config.weapon];
 const mounted={} as Record<WeaponAttachmentSlot,WeaponAttachment>;
 let mass=p.baseMassKg,weighted=p.baseMassKg*p.baseBalanceX;
 let inertia=p.baseMassKg*(18*18/12+p.baseBalanceX*p.baseBalanceX);
 for(const slot of WEAPON_ATTACHMENT_SLOTS){
  const part=WEAPON_ATTACHMENTS[config.slots[slot]];
  mounted[slot]=part;
  mass+=part.massKg;weighted+=part.massKg*part.massX;
  inertia+=part.massKg*part.massX*part.massX;
 }
 const balance=weighted/mass;
 return {weapon:config.weapon,configuration:config,lengthScale:p.lengthScale,
  massKg:mass,balanceX:balance,rotationalInertia:Math.max(1,inertia),
  muzzleX:p.muzzleX+(mounted.muzzle.muzzleExtension??0),
  stockX:p.stockX+(mounted.stock.stockShift??0),
  primaryX:p.primaryX,primaryY:p.primaryY,
  supportX:p.supportX+(mounted.foregrip.supportShift??0),
  supportY:p.supportY,sightHeight:mounted.optic.sightHeight??2.6,
  mounted};
}
