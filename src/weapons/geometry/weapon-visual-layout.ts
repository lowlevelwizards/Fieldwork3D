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
  config.build?.parts.barrel==='ak-short';
 const scale=config.build?assembly.lengthScale:1;
 return {
  longitudinalScale:scale,
  workbenchCenterX:2*scale,
  stockX:assembly.stockX,
  muzzleX:assembly.muzzleX,
  compact:Boolean(compact)
 };
}
