/** Physical support-grip regions use the exact AR/AK/HK furniture extents from
 * the visible silhouette builders. This never changes shot-time ballistics.
 */
import type {WeaponId} from './breach-combat.ts';
import {resolveWeaponAssembly,type WeaponConfiguration} from './equipment-weapon-assemblies.ts';
import {AR_VISUAL_AXIS_Y} from './weapons/geometry/ar-barrel-profiles.ts';
import {mountedAccessorySeat} from './weapons/geometry/mounted-accessory-layout.ts';
import {akBarrelArt,AK_BARREL_ART} from './weapons/geometry/ak-barrel-profiles.ts';
import {hkBarrelArt} from './weapons/geometry/hk-barrel-profiles.ts';
import {falBarrelArt} from './weapons/geometry/fal-barrel-profiles.ts';
import {FNC_FRONT_P13} from './weapons/geometry/fnc-front-layout.ts';
import {G36_E0_FACTORY as G36} from './weapons/geometry/g36-family-contract.ts';
import {g36SupportRange} from './weapons/geometry/g36-variant-parts.ts';
import {R870_P07} from './weapons/geometry/r870-art-contract.ts';
export type RiflePoint={x:number;y:number;z:number};
export type RifleContactRange={near:RiflePoint;far:RiflePoint;preferredFraction:number};
export type RiflePoseContacts={family:'ar'|'ak'|'hk'|'fal'|'fnc'|'g36'|'r870';stock:RiflePoint;
 primary:RiflePoint;support:RifleContactRange;scale:number};
/** Underhand hold calibration: the fore-end shell is NOT the wrist center.
 * Move the unmounted palm below polymer/metal rather than to its side.
 * Values are small, family-authored hand-centre offsets, not new geometry.
 * A real foregrip/handstop retains its explicit physical socket.
 */
export const UNDERHAND_PALM_DROP=Object.freeze({
 ar:.88,ak:.65,hk:.48,fal:.65,fnc:.60,g36:.78
} as const);
export const UNDERHAND_PALM_Z=-1.60;
export const AR_HANDGUARD_START=3.55;
export function arHandguardEnd(id:string):number{
 const long=['ar-triangle','ar-round','ar-m5-rail','ar-pri-tube'].includes(id);
 const short=['ar-compact-rail','ar-risii'].includes(id);
 const retro=id==='ar-car15-ribbed'||id==='ar-733-ribbed';
 return id==='ar-pri-tube'?15.70:id==='ar-risii'?13.38:
 id==='ar-733-ribbed'?11.05:long?14.1:retro?11.8:short?15.05:12.2;
}
export const akHandguardStart=(receiver:string)=>receiver==='akcompact'?3.05:3.50;
export function riflePoseContacts(
 id:WeaponId,config?:WeaponConfiguration):RiflePoseContacts|null{
 if(!config||config.weapon!==id||!config.build)return null;
 const b=config.build;
 // R870's stock wrist is integral wood, not a generic rear rifle grip.
 // Aim hands below the actual sliding pump rather than its magazine tube.
 if(b.family==='r870'){
  const a=resolveWeaponAssembly(config);
  return {family:'r870',scale:a.lengthScale,
   stock:{x:a.stockX,y:-1.34,z:0},
   primary:{x:R870_P07.primaryX,y:R870_P07.primaryY,z:2.24},
   support:{near:{x:R870_P07.supportNearX,y:R870_P07.supportPalmY,z:-1.60},
    far:{x:R870_P07.supportFarX,y:R870_P07.supportPalmY,z:-1.60},
    preferredFraction:.50}};
 }
 if(b.family!=='ar'&&b.family!=='ak'&&b.family!=='hk'&&b.family!=='fal'&&b.family!=='fnc'&&b.family!=='g36')return null;
 const a=resolveWeaponAssembly(config),ar=b.family==='ar',hk=b.family==='hk';
 // HK reach targets share the fore-end's authoritative barrel-art landmarks.
 // Never independently hardcode a number that can silently drift from mesh art.
 const hkArt=hk?hkBarrelArt(b.parts.barrel):undefined;
 const falArt=b.family==='fal'?falBarrelArt(b.parts.barrel):undefined;
 // The FNC's actual grip furniture stops at the polymer, not the longer
 // exposed gas housing: keeping that distinction avoids grabbing bare steel.
 const fncNear=FNC_FRONT_P13.polymer.fullStartX+.30;
 const fncFar=FNC_FRONT_P13.polymer.fullEndX+.05;
 const g36Reach=b.family==='g36'?g36SupportRange(b.parts.handguard):null;
 const start=(g36Reach?.[0]??(b.family==='fnc'?fncNear:undefined))??falArt?.handguardStartX??hkArt?.handguardStartX??
  (ar?AR_HANDGUARD_START:akHandguardStart(b.parts.receiver));
 const end=(g36Reach?.[1]??(b.family==='fnc'?fncFar:undefined))??falArt?.handguardEndX??hkArt?.handguardEndX??
  (ar?arHandguardEnd(b.parts.handguard):
  (akBarrelArt(b.parts.barrel)??AK_BARREL_ART['ak-long']).handguardFrontX);
 // All ordinary two-handed holds must locate the palm on the actual
 // handguard, ahead of the receiver/magwell. The limit remains reachable:
 // if an outboard stock makes the front grip inaccessible, hand ownership
 // falls back safely instead of grabbing the magazine housing.
 const mp5k=hk&&b.parts.receiver==='hk-mp5k-stockless';
 const hkTriVertical=hk&&b.parts.handguard==='hk-mp5-trirail'&&
  config.slots.foregrip==='foregrip-vertical';
 const near=b.family==='g36'?g36Reach![0]:
  hkTriVertical?6.40:mp5k?Math.max(3.90,start+.32):
   Math.min(end-.60,start+(hk?.65:ar?.90:.75));
 const hkCompact=hk&&b.parts.barrel==='hk53-short';
 const far=b.family==='g36'?g36Reach![1]:
  hkTriVertical?7.50:mp5k?4.85:
  Math.max(start+1.4,end-(hk?1.80:ar?1.36:1.17));
 const y=b.family==='g36'?G36.supportY:
  hkTriVertical?-3.65:mp5k?-4.20:
  hk?-1.39:ar?AR_VISUAL_AXIS_Y-1.40:-1.40;
 const accessory=mountedAccessorySeat(config,'foregrip');
 const mountedHand=accessory?.hand;
 // Actual accessory hand anchor is a *preferred* contact only. The V3
 // support solver still enforces arm reach, clears obstacles, and may
 // release the hand for reload/door interaction. Invalid legacy mounts
 // retain the authored handguard range instead of snapping into air.
 const gripSupport=mountedHand?{
  near:{x:mountedHand.x-.18,y:mountedHand.y,z:mountedHand.z},
  far:{x:mountedHand.x+.18,y:mountedHand.y,z:mountedHand.z},
  preferredFraction:.5
 }:null;
 return {family:b.family,scale:a.lengthScale,
  stock:{x:a.stockX,y:0,z:0},primary:{x:a.primaryX,y:a.primaryY,z:2.24},
  // Grip targets are HAND CENTERS, not bare receiver surface points:
  // the real 3.9-unit-deep hand must wrap the actual fore-end, with its
  // inner palm touching it rather than its center buried inside the steel.
  support:gripSupport??{near:{x:near,y:y-UNDERHAND_PALM_DROP[b.family],
     z:UNDERHAND_PALM_Z},
   far:{x:far,y:y-UNDERHAND_PALM_DROP[b.family],
     z:UNDERHAND_PALM_Z},
   preferredFraction:mp5k?.55:hk?(hkCompact?.48:.60):ar?.64:.58}};
}
export function supportContactAt(r:RifleContactRange,t:number):RiflePoint{
 const f=Math.min(1,Math.max(0,t));
 return {x:r.near.x+(r.far.x-r.near.x)*f,
  y:r.near.y+(r.far.y-r.near.y)*f,
  z:r.near.z+(r.far.z-r.near.z)*f};
}
