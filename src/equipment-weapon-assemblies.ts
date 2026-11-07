/** Equipment 19.01: pure curated weapon configurations.
 * Local dimensions match the existing rigid firearm coordinate system:
 * stock lies at negative X, muzzle at positive X. Visible gun scale is
 * applied once by the operator rig and shot-time muzzle solver.
 * This module does not depend on Three.js, rendering or DOM state.
 */
import type {WeaponId} from './breach-combat.ts';
import {arBarrelArt,AR_VISUAL_AXIS_Y} from './weapons/geometry/ar-barrel-profiles.ts';
import {akBarrelArt} from './weapons/geometry/ak-barrel-profiles.ts';
import {hkBarrelArt} from './weapons/geometry/hk-barrel-profiles.ts';
import {EQUIPMENT_CATALOG} from './equipment-catalog.ts';
import {FAMILY_PARTS,FAMILY_PART_SLOTS,familyPreset,initialWeaponFamilyBuild,
 readWeaponFamilyBuild,setWeaponFamilyPart as changeFamilyPart,
 type FamilyPartSlot,type WeaponFamilyBuild}
 from './equipment-weapon-families.ts';

export type WeaponAttachmentSlot='optic'|'muzzle'|'foregrip'|'stock'|'light'|'sling';
export const WEAPON_ATTACHMENT_SLOTS:readonly WeaponAttachmentSlot[]=
 ['optic','muzzle','foregrip','stock','light','sling'];
export type WeaponConfiguration={
 version:1;weapon:WeaponId;slots:Record<WeaponAttachmentSlot,string>;
 /** Optional visual family. Old four-class saves keep their legacy models. */
 build?:WeaponFamilyBuild;
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
/** Grip sockets measured against the actual receiver/pistol-grip and guard
 * mesh extents in breach-weapon-geometry.ts. Never use a single grip position
 * for every platform: that placed hands inside empty receiver space.
 */
export const WEAPON_PLATFORMS:Readonly<Record<WeaponId,PlatformGeometry>>={
 carbine:{weapon:'carbine',lengthScale:.86,baseMassKg:EQUIPMENT_CATALOG['primary-carbine'].massKg,
  baseBalanceX:1,stockX:-13.5,primaryX:0,primaryY:-2.7,supportX:8,supportY:-1.55,muzzleX:19.5},
 smg:{weapon:'smg',lengthScale:.73,baseMassKg:EQUIPMENT_CATALOG['primary-smg'].massKg,
  baseBalanceX:0,stockX:-13.5,primaryX:1.7,primaryY:-2.7,supportX:6,supportY:-1.3,muzzleX:19.5},
 rifle:{weapon:'rifle',lengthScale:.94,baseMassKg:EQUIPMENT_CATALOG['primary-rifle'].massKg,
  baseBalanceX:1.8,stockX:-13.5,primaryX:-4,primaryY:-3.25,supportX:8.5,supportY:-1.55,muzzleX:19.5},
 shotgun:{weapon:'shotgun',lengthScale:.92,baseMassKg:EQUIPMENT_CATALOG['primary-shotgun'].massKg,
  baseBalanceX:2,stockX:-13.5,primaryX:-2.9,primaryY:-3.25,supportX:8,supportY:-2,muzzleX:19.5}
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
/** Family guns use the established accessories without treating a generic
 * stock or rail attachment as interchangeable physical factory furniture.
 */
export function familyAccessoryAllowed(build:WeaponFamilyBuild,
 slot:WeaponAttachmentSlot,id:string):boolean{
 if(slot==='stock')return id==='stock-standard';
 // The SD is integral: never layer a detachable suppressor over its front.
 if(slot==='muzzle'&&build.parts.receiver==='hk-mp5sd-integral')
  return id==='muzzle-bare';
 if(slot==='optic'&&id!=='optic-irons'){
  const r=build.parts.receiver;
  return r==='ar-flat'||(build.family==='ak'&&
   build.parts.handguard==='ak-rail-long');
 }
 if(slot==='foregrip'&&id!=='foregrip-none')
  return ['ar-quad','ar-compact-rail','ar-m5-rail','ar-risii','ak-rail-long']
   .includes(build.parts.handguard);
 return true;
}
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
 const build=readWeaponFamilyBuild((raw as {build?:unknown}).build,weapon);
 if(build){
  result.build=build;
  for(const slot of WEAPON_ATTACHMENT_SLOTS)
   if(!familyAccessoryAllowed(build,slot,result.slots[slot]))
    result.slots[slot]=DEFAULT_IDS[slot];
 }
 return result;
}
export function setWeaponAttachment(config:WeaponConfiguration,slot:WeaponAttachmentSlot,
 id:string):WeaponConfiguration{
 if(!WEAPON_ATTACHMENT_SLOTS.includes(slot)||
  !compatibleWeaponAttachment(config.weapon,slot,id)||
  (config.build&&!familyAccessoryAllowed(config.build,slot,id)))return config;
 if(config.slots[slot]===id)return config;
 return {...config,slots:{...config.slots,[slot]:id}};
}
/** Select an authored model using the currently owned gameplay class.
 * It never buys or converts a physical Campaign gun behind the player's back.
 */
export function selectWeaponFamilyPreset(config:WeaponConfiguration,
 presetId:string):WeaponConfiguration{
 const preset=familyPreset(presetId);
 const build=initialWeaponFamilyBuild(presetId);
 if(!preset||!build||preset.weapon!==config.weapon)return config;
 return readWeaponConfiguration({...config,build},config.weapon);
}
export function setConfiguredFamilyPart(config:WeaponConfiguration,
 slot:FamilyPartSlot,id:string):WeaponConfiguration{
 if(!config.build||!FAMILY_PART_SLOTS.includes(slot))return config;
 const build=changeFamilyPart(config.build,config.weapon,slot,id);
 if(build===config.build)return config;
 return readWeaponConfiguration({...config,build},config.weapon);
}
export function changeWeaponPlatform(config:WeaponConfiguration,weapon:WeaponId):WeaponConfiguration{
 return readWeaponConfiguration(config,weapon);
}
/** Replay snapshots deserialize new objects; identical choices must never
 * trigger mesh reconstruction on every playback frame. Allocation-free. */
export function sameWeaponConfiguration(a?:WeaponConfiguration,b?:WeaponConfiguration):boolean{
 if(a===b)return true;
 if(!a||!b||a.weapon!==b.weapon||a.version!==b.version)return false;
 for(const slot of WEAPON_ATTACHMENT_SLOTS)
  if(a.slots[slot]!==b.slots[slot])return false;
 if(a.build?.family!==b.build?.family)return false;
 for(const slot of FAMILY_PART_SLOTS)
  if(a.build?.parts[slot]!==b.build?.parts[slot])return false;
 return true;
}
export type ResolvedWeaponAssembly={
 weapon:WeaponId;configuration:WeaponConfiguration;
 lengthScale:number;massKg:number;balanceX:number;rotationalInertia:number;
 muzzleX:number;muzzleY:number;stockX:number;primaryX:number;primaryY:number;
 supportX:number;supportY:number;sightHeight:number;
 mounted:Record<WeaponAttachmentSlot,WeaponAttachment>;
};
const resolutionCache=new WeakMap<WeaponConfiguration,ResolvedWeaponAssembly>();
/** Configurations are immutable by contract: calculate once per saved change. */
export function resolveWeaponAssembly(raw:WeaponConfiguration):ResolvedWeaponAssembly{
 const cached=resolutionCache.get(raw);
 if(cached)return cached;
 const config=readWeaponConfiguration(raw,raw.weapon);
 const p=WEAPON_PLATFORMS[config.weapon];
 const build=config.build;
 const art=build?.family==='ar'?arBarrelArt(build.parts.barrel):
  build?.family==='ak'?akBarrelArt(build.parts.barrel):
  build?.family==='hk'?hkBarrelArt(build.parts.barrel):undefined;
 const mounted={} as Record<WeaponAttachmentSlot,WeaponAttachment>;
 let mass=p.baseMassKg,weighted=p.baseMassKg*p.baseBalanceX;
 let inertia=p.baseMassKg*(18*18/12+p.baseBalanceX*p.baseBalanceX);
 for(const slot of WEAPON_ATTACHMENT_SLOTS){
  const original=WEAPON_ATTACHMENTS[config.slots[slot]];
  // All authored AR/AK barrels re-anchor optional muzzle accessories and
  // share the authoritative shot-time tip with the visible barrel.
  const part=slot==='muzzle'&&art?
   {...original,mountX:art.muzzleX,massX:original.massX+art.muzzleX-19.5}:
   original;
  mounted[slot]=part;
  mass+=part.massKg;weighted+=part.massKg*part.massX;
  inertia+=part.massKg*part.massX*part.massX;
 }
 const balance=weighted/mass;
 const familyBarrel=build?FAMILY_PARTS[build.parts.barrel]:undefined;
 const familyHandguard=build?FAMILY_PARTS[build.parts.handguard]:undefined;
 const lengthScale=art?.lengthScale??(familyBarrel?.length==='long'?.94:
  familyBarrel?.length==='mid'?.86:
  familyBarrel?.length==='short'?.73:p.lengthScale);
 const stockX=build?(FAMILY_PARTS[build.parts.stock].stockX??p.stockX):p.stockX;
 const hkArt=build?.family==='hk'?hkBarrelArt(build.parts.barrel):undefined;
 // Actual family pistol-grip silhouettes sit behind the receiver midpoint.
 // Earlier AK settings targeted empty space, putting the wrist in the plate.
 const primaryX=build?(build.family==='hk'?-4.20:
  build.family==='ar'?-4.80:-4.65):p.primaryX;
 const primaryY=build?(build.family==='hk'?-4.00:
  build.family==='ar'?-4.00:-4.10):p.primaryY;
 const hkSupportX=hkArt?Math.min(7.75,hkArt.handguardStartX+
  .47*(hkArt.handguardEndX-hkArt.handguardStartX)):7.75;
 const mp5k=build?.parts.receiver==='hk-mp5k-stockless';
 const supportX=build?.family==='hk'?hkSupportX:
  build?(familyHandguard?.length==='long'?9.10:
  familyHandguard?.length==='mid'?7.70:6.50):p.supportX;
 const resolved:ResolvedWeaponAssembly={weapon:config.weapon,configuration:config,lengthScale,
  massKg:mass,balanceX:balance,rotationalInertia:Math.max(1,inertia),
  muzzleX:(art?.muzzleX??p.muzzleX)+(mounted.muzzle.muzzleExtension??0),
  muzzleY:build?.family==='ar'?AR_VISUAL_AXIS_Y:0,
  stockX:stockX+(build?0:(mounted.stock.stockShift??0)),
  primaryX,primaryY,
  supportX:supportX+(mounted.foregrip.supportShift??0),
  supportY:(mp5k?-3.65:
   mounted.foregrip.id==='foregrip-vertical'?-3.65:
   mounted.foregrip.id==='foregrip-handstop'?-2.3:
   build?.family==='hk'?-1.35:build?-1.65:p.supportY)+
   (build?.family==='ar'?AR_VISUAL_AXIS_Y:0),
  sightHeight:mounted.optic.sightHeight??2.6,
  mounted};
 resolutionCache.set(raw,resolved);
 return resolved;
}
