/** FT1.9E1: live-renderer G36 family adapter, using exactly the same authored
 * six-slot geometry as the isolated FT1.9D1 reference master. It changes no
 * ballistics, simulated magazine feed, ammunition, or committed faction kit.
 */
import * as THREE from 'three';
import {validFamilyBuild,type WeaponFamilyBuild}
 from '../../equipment-weapon-families.ts';
import {G36_E0_FACTORY} from './g36-family-contract.ts';
import {applyG36FactoryMaterials} from './g36-silhouettes.ts';
import {buildG36FamilyBlockout} from './g36-variant-parts.ts';
import {applyG36PixelDetails} from './g36-pixel-details.ts';
import {HK_BLACK_METAL,HK_MUZZLE_METAL,
 G36_DARK_POLYMER,G36_OPTIC_RIM,G36_LENS_BLACK,G36_RUBBER,
 G36_SMOKED_MAGAZINE} from './weapon-visual-palette.ts';
export function addG36Family(root:THREE.Group,build:WeaponFamilyBuild,
 showFactoryMuzzle=true):void{
 const f=G36_E0_FACTORY;
 if(build.family!==f.family||
  !validFamilyBuild(build,build.parts.barrel==='g36-barrel-480'?'rifle':'carbine'))
  throw Error('Invalid G36 part combination');
 const form=buildG36FamilyBlockout(G36_DARK_POLYMER,build);
 applyG36FactoryMaterials(form,{
  polymer:G36_DARK_POLYMER,steel:HK_BLACK_METAL,
  magazine:G36_SMOKED_MAGAZINE,buttpad:G36_RUBBER,
  optic:G36_DARK_POLYMER,opticRim:G36_OPTIC_RIM,lens:G36_LENS_BLACK,
  muzzle:HK_MUZZLE_METAL
 });
 applyG36PixelDetails(form);
 for(const part of [...form.children]){
  form.remove(part);
  if(part.userData.g36FactoryMuzzle&&!showFactoryMuzzle){
   if(part instanceof THREE.Mesh)part.geometry.dispose();
  }else root.add(part);
 }
 root.userData.g36OriginalFactory=Object.entries(f.parts).every(
  ([slot,id])=>build.parts[slot as keyof typeof f.parts]===id);
 root.userData.g36IntegratedDualOptic=build.parts.receiver==='g36-dual-receiver';
 root.userData.g36SingleOptic=build.parts.receiver==='g36-single-receiver';
 root.userData.g36PicatinnySightRail=build.parts.receiver==='g36-rail-receiver';
 root.userData.g36FamilyPresetFront=build.parts.barrel;
}
