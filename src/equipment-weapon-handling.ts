/** Equipment 20.07: bounded, deterministic handling derived from physical
 * assembly and optical/muzzle intent. Cached once per immutable configuration,
 * with no Three.js objects or per-tick allocations.
 */
import {initialWeaponConfiguration,resolveWeaponAssembly,
 type WeaponConfiguration} from './equipment-weapon-assemblies.ts';
import type {WeaponId} from './breach-combat.ts';
import type {FiringMode} from './breach-ballistics.ts';
export type WeaponHandlingModifiers={
 turn:number;acquisition:number;recovery:number;recoilKick:number;
 noise:number;optic:'irons'|'reflex'|'magnified';stable:number;
};
const neutral:Readonly<WeaponHandlingModifiers>=Object.freeze({
 turn:1,acquisition:1,recovery:1,recoilKick:1,noise:1,optic:'irons',stable:1
});
const base:Record<WeaponId,number>={
 carbine:resolveWeaponAssembly(initialWeaponConfiguration('carbine')).rotationalInertia,
 smg:resolveWeaponAssembly(initialWeaponConfiguration('smg')).rotationalInertia,
 rifle:resolveWeaponAssembly(initialWeaponConfiguration('rifle')).rotationalInertia,
 shotgun:resolveWeaponAssembly(initialWeaponConfiguration('shotgun')).rotationalInertia
};
const cache=new WeakMap<WeaponConfiguration,WeaponHandlingModifiers>();
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
export function weaponHandlingModifiers(configuration?:WeaponConfiguration):WeaponHandlingModifiers{
 if(!configuration)return neutral;
 const hit=cache.get(configuration);if(hit)return hit;
 const a=resolveWeaponAssembly(configuration);
 const i=clamp(a.rotationalInertia/base[a.weapon],.76,1.6);
 const stock=a.mounted.stock.id;
 const muzzle=a.mounted.muzzle.id;
 const grip=a.mounted.foregrip.id;
 const optic=a.mounted.optic.id==='optic-reflex'?'reflex':
  a.mounted.optic.id==='optic-magnified'?'magnified':'irons';
 const handling:WeaponHandlingModifiers={
  turn:clamp(1/(1+(i-1)*.24)*(stock==='stock-compact'?1.055:
   stock==='stock-extended'?.975:1),.82,1.15),
  acquisition:clamp((1+(i-1)*.22)*(stock==='stock-compact'?.97:
   stock==='stock-extended'?1.035:1),.84,1.22),
  recovery:clamp((muzzle==='muzzle-brake'?1.17:1)*
   (grip==='foregrip-vertical'?1.075:grip==='foregrip-handstop'?1.035:1)*
   (stock==='stock-extended'?1.035:1),.85,1.35),
  recoilKick:clamp((muzzle==='muzzle-brake'?.86:
   muzzle==='muzzle-suppressor'?.96:1)*
   (stock==='stock-compact'?1.035:stock==='stock-extended'?.96:1),.77,1.16),
  noise:muzzle==='muzzle-suppressor'?.65:muzzle==='muzzle-brake'?1.10:1,
  optic,stable:grip==='foregrip-vertical'?.97:grip==='foregrip-handstop'?.985:1
 };
 cache.set(configuration,handling);return handling;
}
export function sightAcquisitionScale(h:WeaponHandlingModifiers,range:number):number{
 const sight=h.optic==='reflex'?(range<=150?.91:1.035):
  h.optic==='magnified'?(range<100?1.16:range>175?.94:1.03):1;
 return clamp(h.acquisition*sight,.75,1.45);
}
export function sightSpreadScale(h:WeaponHandlingModifiers,
 mode:FiringMode,range:number):number{
 if(mode==='point')return h.optic==='magnified'?1.04:h.stable;
 return clamp(h.stable*(h.optic==='magnified'?(range>130?.90:1.03):
  h.optic==='reflex'?(range<=160?.96:1):1),.82,1.12);
}
