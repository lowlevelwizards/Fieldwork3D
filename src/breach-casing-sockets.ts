/** V20: representational receiver landmarks, in the same local artwork axes
 * as the held mesh (+X muzzle, +Y up, +Z right). No ballistics authority. */
import type {WeaponId} from './breach-combat.ts';
import type {WeaponConfiguration} from './equipment-weapon-assemblies.ts';
import {AR_VISUAL_ANATOMY,AK_VISUAL_ANATOMY,HK_VISUAL_ANATOMY,
 HK556_VISUAL_ANATOMY,MP5_VISUAL_ANATOMY,FAL_VISUAL_ANATOMY,FNC_VISUAL_ANATOMY}
 from './weapons/geometry/weapon-receiver-anatomy.ts';
export type CasingPort=Readonly<{x:number;y:number;z:number}>;
export const GLOCK_CASING_PORT:CasingPort={x:1.835,y:2.65,z:1.62};
const port=(a:{portX:number;portY:number},z:number):CasingPort=>
 ({x:a.portX,y:a.portY,z});
export function casingPort(weapon:WeaponId,configuration?:WeaponConfiguration):CasingPort{
 const b=configuration?.weapon===weapon?configuration.build:undefined;
 switch(b?.family){
  case 'ar':return port(AR_VISUAL_ANATOMY,1.82);
  case 'ak':return port(AK_VISUAL_ANATOMY,1.98);
  case 'fal':return port(FAL_VISUAL_ANATOMY,1.18);
  case 'fnc':return port(FNC_VISUAL_ANATOMY,1.75);
  case 'hk':return b.parts.receiver.startsWith('hk-mp5')?port(MP5_VISUAL_ANATOMY,1.532):
    /^(hk33|hk53)/.test(b.parts.receiver)?port(HK556_VISUAL_ANATOMY,1.65):port(HK_VISUAL_ANATOMY,1.775);
  case 'r870':return {x:.28,y:.64,z:1.785};
  case 'g36':return {x:1.5,y:.4,z:1.65};
 }
 // Legacy symbolic guns have no named receiver artwork contract.
 return {x:weapon==='rifle'?-1:1,y:.55,z:1.8};
}
