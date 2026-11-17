/** Deterministic platform + attachment handling for the live CQB simulation.
 * WeaponId still owns ammo, damage and ballistics. The installed, validated
 * visual family build supplies modest differences in ready time, control,
 * reload manipulation and physical muzzle-approach anticipation.
 * No folded-stock state is inferred from a *deployed* folding-stock mesh.
 */
import {initialWeaponConfiguration,resolveWeaponAssembly,
 type WeaponConfiguration} from './equipment-weapon-assemblies.ts';
import {FAMILY_PARTS,type WeaponFamilyBuild} from './equipment-weapon-families.ts';
import type {WeaponId} from './breach-combat.ts';
import type {FiringMode} from './breach-ballistics.ts';

export type WeaponSightSystem='irons'|'open'|'aperture'|'diopter'|
 'reflex'|'magnified'|'integrated';
export type WeaponHandlingModifiers={
 turn:number;acquisition:number;recovery:number;recoilKick:number;
 noise:number;optic:'irons'|'reflex'|'magnified';stable:number;
 /** Scalar for the existing reload clock, including emergency/retention. */
 manipulation:number;
 /** Units of forward clearance anticipation; never a shot permission. */
 clearanceLead:number;
 /** The actually installed optic, or native iron-sight architecture. */
 sightSystem:WeaponSightSystem;
};
const neutral:Readonly<WeaponHandlingModifiers>=Object.freeze({
 turn:1,acquisition:1,recovery:1,recoilKick:1,noise:1,optic:'irons',
 stable:1,manipulation:1,clearanceLead:14,sightSystem:'irons'
});
const base:Record<WeaponId,number>={
 carbine:resolveWeaponAssembly(initialWeaponConfiguration('carbine')).rotationalInertia,
 smg:resolveWeaponAssembly(initialWeaponConfiguration('smg')).rotationalInertia,
 rifle:resolveWeaponAssembly(initialWeaponConfiguration('rifle')).rotationalInertia,
 shotgun:resolveWeaponAssembly(initialWeaponConfiguration('shotgun')).rotationalInertia
};
const cache=new WeakMap<WeaponConfiguration,WeaponHandlingModifiers>();
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));

type PlatformResponse={
 turn:number;acquisition:number;recovery:number;recoilKick:number;
 manipulation:number;stable:number;clearanceLead:number;
 sight:WeaponSightSystem;
};
function platformResponse(build:WeaponFamilyBuild):PlatformResponse{
 const {family,parts}=build;
 const receiver=parts.receiver;
 const barrel=FAMILY_PARTS[parts.barrel]?.length??'mid';
 let turn=1,acquisition=1,recovery=1,recoilKick=1;
 let manipulation=1,stable=1;
 let sight:WeaponSightSystem='aperture';
 if(family==='ar'){
  turn=1.01;acquisition=.985;recovery=1.015;recoilKick=.99;
  manipulation=.96;
 }else if(family==='ak'){
  turn=.98;acquisition=1.035;recovery=.97;recoilKick=1.035;
  manipulation=1.10;sight='open';
 }else if(family==='hk'){
  sight=receiver==='hk-g3-early'?'aperture':'diopter';
  if(receiver.startsWith('hk-mp5')){
   turn=1.055;acquisition=.955;recovery=1.045;recoilKick=.95;
   manipulation=1.065;
  }else if(receiver.startsWith('hk53')){
   turn=1.04;acquisition=.99;recovery=.995;recoilKick=1.045;
   manipulation=1.10;
  }else if(receiver.startsWith('hk33')){
   turn=.975;acquisition=1.025;recovery=.985;recoilKick=1.025;
   manipulation=1.12;
  }else{
   turn=.915;acquisition=1.075;recovery=.935;recoilKick=1.10;
   manipulation=1.16;
  }
 }else if(family==='fal'){
  turn=.915;acquisition=1.075;recovery=.925;recoilKick=1.11;
  manipulation=1.16;
 }else if(family==='fnc'){
  turn=.985;acquisition=1.025;recovery=.99;recoilKick=1.02;
  manipulation=1.08;
 }else if(family==='g36'){
  turn=.97;acquisition=.99;recovery=1.015;recoilKick=.99;
  manipulation=1.10;sight='integrated';
 }
 // Barrel length contributes even when a receiver accepts several lengths.
 // Short weapons turn faster but settle less predictably after a shot.
 if(barrel==='long'){
  turn*=.984;acquisition*=1.015;recovery*=1.012;recoilKick*=.99;
 }else if(barrel==='short'){
  turn*=1.045;acquisition*=.98;recovery*=.977;recoilKick*=1.035;
 }
 // These factory stocks are drawn DEPLOYED. Never simulate a magically
 // folded gun just because its part name says "folder" or "retract".
 const stockless=parts.stock==='hk-mp5k-cap';
 const compact=/^(ar-car|ar-compact|ar-stock-m4|ak-skeleton|hk-mp5k-pdw-stock)$/
  .test(parts.stock);
 if(compact){turn*=1.018;recovery*=.987;}
 if(stockless){
  turn*=1.09;acquisition*=1.12;recovery*=.90;
  recoilKick*=1.15;stable*=1.085;manipulation*=1.055;
 }
 return {turn,acquisition,recovery,recoilKick,manipulation,stable,
  clearanceLead:clamp((barrel==='long'?16:barrel==='short'?11.5:14)-
   (stockless?1.5:0),9.5,17),sight};
}
function configuredSight(opticId:string,native:WeaponSightSystem):WeaponSightSystem{
 if(opticId==='optic-reflex')return 'reflex';
 if(opticId==='optic-magnified'||opticId.startsWith('optic-kashtan'))
  return 'magnified';
 if(opticId==='optic-g36-integrated')return 'integrated';
 return native;
}
export function weaponHandlingModifiers(configuration?:WeaponConfiguration):WeaponHandlingModifiers{
 if(!configuration)return neutral;
 const hit=cache.get(configuration);if(hit)return hit;
 const a=resolveWeaponAssembly(configuration);
 const i=clamp(a.rotationalInertia/base[a.weapon],.76,1.6);
 const stock=a.mounted.stock.id;
 const muzzle=a.mounted.muzzle.id;
 const grip=a.mounted.foregrip.id;
 const optic=a.mounted.optic.id==='optic-reflex'?'reflex':
  a.mounted.optic.id==='optic-magnified'||
  a.mounted.optic.id.startsWith('optic-kashtan')?'magnified':'irons';
 const platform=a.configuration.build?platformResponse(a.configuration.build):null;
 const sightSystem=configuredSight(a.mounted.optic.id,platform?.sight??'irons');
 const handling:WeaponHandlingModifiers={
  turn:clamp(1/(1+(i-1)*.24)*(stock==='stock-compact'?1.055:
   stock==='stock-extended'?.975:1)*(platform?.turn??1),.82,1.15),
  acquisition:clamp((1+(i-1)*.22)*(stock==='stock-compact'?.97:
   stock==='stock-extended'?1.035:1)*
   (platform?.acquisition??1),.84,1.22),
  recovery:clamp((muzzle==='muzzle-brake'?1.17:1)*
   (grip==='foregrip-vertical'?1.075:grip==='foregrip-handstop'?1.035:1)*
   (stock==='stock-extended'?1.035:1)*
   (platform?.recovery??1),.82,1.35),
  recoilKick:clamp((muzzle==='muzzle-brake'?.86:
   muzzle==='muzzle-suppressor'?.96:1)*
   (stock==='stock-compact'?1.035:stock==='stock-extended'?.96:1)*
   (platform?.recoilKick??1),.77,1.23),
  noise:muzzle==='muzzle-suppressor'?.65:muzzle==='muzzle-brake'?1.10:1,
  optic,stable:clamp(
   (grip==='foregrip-vertical'?.97:grip==='foregrip-handstop'?.985:1)*
   (platform?.stable??1),.94,1.12),
  manipulation:clamp(platform?.manipulation??1,.90,1.24),
  clearanceLead:platform?.clearanceLead??14,sightSystem
 };
 cache.set(configuration,handling);return handling;
}
export function sightAcquisitionScale(h:WeaponHandlingModifiers,range:number):number{
 const sight=h.sightSystem==='reflex'?(range<=150?.91:1.035):
  h.sightSystem==='magnified'?(range<100?1.16:range>175?.94:1.03):
  h.sightSystem==='integrated'?(range<95?.94:range>190?.97:1.045):
  h.sightSystem==='diopter'?(range<105?1.045:range>165?.965:1.01):
  h.sightSystem==='open'?(range<110?.965:range>165?1.065:1.02):
  h.sightSystem==='aperture'?(range<95?1.025:range>175?.975:1):1;
 return clamp(h.acquisition*sight,.75,1.45);
}
export function sightSpreadScale(h:WeaponHandlingModifiers,
 mode:FiringMode,range:number):number{
 if(mode==='point')return h.sightSystem==='magnified'?1.04:h.stable;
 const sight=h.sightSystem==='magnified'?(range>130?.90:1.03):
  h.sightSystem==='reflex'?(range<=160?.96:1):
  h.sightSystem==='integrated'?(range>190?.94:range<95?.975:1.025):
  h.sightSystem==='diopter'?(range>170?.96:1):
  h.sightSystem==='open'?(range>170?1.055:1):
  h.sightSystem==='aperture'?(range>175?.975:1):1;
 return clamp(h.stable*sight,.82,1.16);
}
