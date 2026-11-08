/** Physical support-grip regions use the exact AR/AK/HK furniture extents from
 * the visible silhouette builders. This never changes shot-time ballistics.
 */
import type {WeaponId} from './breach-combat.ts';
import {resolveWeaponAssembly,type WeaponConfiguration} from './equipment-weapon-assemblies.ts';
import {AR_VISUAL_AXIS_Y} from './weapons/geometry/ar-barrel-profiles.ts';
import {akBarrelArt,AK_BARREL_ART} from './weapons/geometry/ak-barrel-profiles.ts';
import {hkBarrelArt} from './weapons/geometry/hk-barrel-profiles.ts';
export type RiflePoint={x:number;y:number;z:number};
export type RifleContactRange={near:RiflePoint;far:RiflePoint;preferredFraction:number};
export type RiflePoseContacts={family:'ar'|'ak'|'hk';stock:RiflePoint;
 primary:RiflePoint;support:RifleContactRange;scale:number};
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
 if(b.family!=='ar'&&b.family!=='ak'&&b.family!=='hk')return null;
 const a=resolveWeaponAssembly(config),ar=b.family==='ar',hk=b.family==='hk';
 // HK reach targets share the fore-end's authoritative barrel-art landmarks.
 // Never independently hardcode a number that can silently drift from mesh art.
 const hkArt=hk?hkBarrelArt(b.parts.barrel):undefined;
 const start=hkArt?.handguardStartX??
  (ar?AR_HANDGUARD_START:akHandguardStart(b.parts.receiver));
 const end=hkArt?.handguardEndX??
  (ar?arHandguardEnd(b.parts.handguard):
  (akBarrelArt(b.parts.barrel)??AK_BARREL_ART['ak-long']).handguardFrontX);
 // All ordinary two-handed holds must locate the palm on the actual
 // handguard, ahead of the receiver/magwell. The limit remains reachable:
 // if an outboard stock makes the front grip inaccessible, hand ownership
 // falls back safely instead of grabbing the magazine housing.
 const mp5k=hk&&b.parts.receiver==='hk-mp5k-stockless';
 const hkTriVertical=hk&&b.parts.handguard==='hk-mp5-trirail'&&
  config.slots.foregrip==='foregrip-vertical';
 const near=hkTriVertical?6.40:mp5k?Math.max(3.90,start+.32):
   Math.min(end-.60,start+(hk?.65:ar?.90:.75));
 const hkCompact=hk&&b.parts.barrel==='hk53-short';
 const far=hkTriVertical?7.50:mp5k?4.85:
  Math.max(start+1.4,end-(hk?1.80:ar?1.36:1.17));
 const y=hkTriVertical?-3.65:mp5k?-4.20:
  hk?-1.39:ar?AR_VISUAL_AXIS_Y-1.40:-1.40;
 return {family:b.family,scale:a.lengthScale,
  stock:{x:a.stockX,y:0,z:0},primary:{x:a.primaryX,y:a.primaryY,z:2.24},
  // Grip targets are HAND CENTERS, not bare receiver surface points:
  // the real 3.9-unit-deep hand must wrap the actual fore-end, with its
  // inner palm touching it rather than its center buried inside the steel.
  support:{near:{x:near,y,z:-2.68},far:{x:far,y,z:-2.68},
   preferredFraction:mp5k?.55:hk?(hkCompact?.48:.60):ar?.64:.58}};
}
export function supportContactAt(r:RifleContactRange,t:number):RiflePoint{
 const f=Math.min(1,Math.max(0,t));
 return {x:r.near.x+(r.far.x-r.near.x)*f,
  y:r.near.y+(r.far.y-r.near.y)*f,
  z:r.near.z+(r.far.z-r.near.z)*f};
}
