/** R3 single-source display proportions for modular weapon art.
 * Operator physics and weapon contacts continue using resolveWeaponAssembly();
 * this module is a presentation contract, never a gameplay override.
 */
import type {WeaponConfiguration} from '../../equipment-weapon-assemblies.ts';
import {resolveWeaponAssembly} from '../../equipment-weapon-assemblies.ts';
export type WeaponVisualLayout={
 longitudinalScale:number;workbenchCenterX:number;
 stockX:number;muzzleX:number;compact:boolean;
};
export function weaponVisualLayout(config:WeaponConfiguration):WeaponVisualLayout{
 const assembly=resolveWeaponAssembly(config);
 const compact=config.build?.parts.barrel==='ar-103'||
  config.build?.parts.barrel==='ar-733-115'||
  config.build?.parts.barrel==='ak-short';
 const scale=config.build?assembly.lengthScale:1;
 return {
  longitudinalScale:scale,
  // Center the dramatically longer RPK and shorter carbine/compact against
  // their real authored muzzle endpoint, not an obsolete fixed AK position.
  workbenchCenterX:config.build?.family==='ar'?
   (assembly.muzzleX-15.2)*.5*scale:
   config.build?.family==='ak'?
    (assembly.muzzleX+assembly.stockX)*.5*scale:2*scale,
  stockX:assembly.stockX,
  muzzleX:assembly.muzzleX,
  compact:Boolean(compact)
 };
}
