/** Actual AR/AK exterior landmark sockets for contact, reload, and inspection.
 * The gameplay firearm assembly remains authoritative for ballistic offsets.
 */
import type {WeaponId} from './breach-combat.ts';
import {resolveWeaponAssembly,WEAPON_PLATFORMS,
 type WeaponConfiguration} from './equipment-weapon-assemblies.ts';
import {AR_VISUAL_ANATOMY,AK_VISUAL_ANATOMY,HK_VISUAL_ANATOMY}
 from './weapons/geometry/weapon-receiver-anatomy.ts';
import {hkBarrelArt} from './weapons/geometry/hk-barrel-profiles.ts';
export type WeaponSocket={x:number;y:number;z:number};
export type WeaponPresentationSockets={
 stock:WeaponSocket;primary:WeaponSocket;support:WeaponSocket;
 magazine:WeaponSocket;muzzle:WeaponSocket;sight:WeaponSocket;
 /** Visible bolt catch / charging handle gesture, in genuine family art space. */
 reloadControl:WeaponSocket;
 lengthScale:number;magazinePart:string|null;
};
export function weaponPresentationSockets(id:WeaponId,
 configuration?:WeaponConfiguration):WeaponPresentationSockets{
 const config=configuration?.weapon===id?configuration:undefined;
 const a=config?resolveWeaponAssembly(config):WEAPON_PLATFORMS[id];
 const build=config?.build;
 const hkArt=build?.family==='hk'?hkBarrelArt(build.parts.barrel):null;
 const anatomy=build?.family==='ar'?AR_VISUAL_ANATOMY:
  build?.family==='ak'?AK_VISUAL_ANATOMY:
  build?.family==='hk'?HK_VISUAL_ANATOMY:null;
 return {
  stock:{x:a.stockX,y:0,z:0},
  primary:{x:a.primaryX,y:a.primaryY,z:1.8},
  support:{x:a.supportX,y:a.supportY,z:-1.6},
  magazine:{x:anatomy?.magwellCenterX??3,y:anatomy?.magazineTopY??-4,z:0},
  // AR latch on support-side receiver, AK handle on firing-side, HK
  // distinctive left/front cocking tube (MP5K uses shorter furniture).
  reloadControl:build?.family==='ar'?{
   x:(anatomy?.magwellCenterX??1)-1.10,
   y:(anatomy?.magazineTopY??-2.15)+2.75,z:-2.85
  }:build?.family==='ak'?{
   x:(anatomy?.magwellCenterX??1)+.65,y:1.75,z:2.7
  }:build?.family==='hk'?{
   x:(hkArt?.handguardStartX??4)+.20,y:1.45,z:-2.70
  }:{x:1,y:2.2,z:-2.7},
  muzzle:{x:a.muzzleX,y:'muzzleY' in a?a.muzzleY:0,z:0},
  sight:{x:-1,y:'sightHeight' in a?a.sightHeight:2.6,z:0},
  lengthScale:a.lengthScale,magazinePart:build?.parts.magazine??null
 };
}
