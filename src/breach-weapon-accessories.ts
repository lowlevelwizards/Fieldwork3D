/** Equipment 19.03: low-resolution, rigid attachment shapes with true mount
 * coordinates. Only built on configuration changes, never per render frame.
 */
import * as THREE from 'three';
import {WEAPON_ACCESSORY_STEEL,WEAPON_ACCESSORY_POLYMER,
 HK_SD_SUPPRESSOR_METAL,HK_MUZZLE_METAL}
 from './weapons/geometry/weapon-visual-palette.ts';
import type {WeaponConfiguration} from './equipment-weapon-assemblies.ts';
import {resolveWeaponAssembly} from './equipment-weapon-assemblies.ts';
import {accessoryBox,accessoryTube,accessoryFrame,accessoryProfile,accessoryMergedBoxes}
 from './weapons/geometry/accessory-primitives.ts';
import {AR_VISUAL_AXIS_Y} from './weapons/geometry/ar-barrel-profiles.ts';
const block=(root:THREE.Group,x:number,y:number,z:number,
 w:number,h:number,d:number,m:THREE.Material)=>
 accessoryBox(root,'weapon-accessory-hardware',x,y,z,w,h,d,m);
export function buildWeaponAccessories(raw:WeaponConfiguration,
 steel:THREE.Material,dark:THREE.Material,
 lensMaterial:THREE.Material=steel):THREE.Group{
 const assembly=resolveWeaponAssembly(raw),g=new THREE.Group(),parts=assembly.mounted;
 // All modular families share the same cached accessory finishes regardless of
 // caller/viewer. Preserve caller materials for the legacy shotgun fallback.
 const metal=raw.build?WEAPON_ACCESSORY_STEEL:steel;
 const polymer=raw.build?WEAPON_ACCESSORY_POLYMER:dark;
 const optic=parts.optic;
 // Claw rail is its own receiver mesh; raise only the separate fitted optic.
 const sightRise=raw.slots.opticMount==='optic-hk-claw'?1.50:0;
 if(optic.id==='optic-reflex'){
  // A3: an actual open hood, not a solid sight tower. The sight origin is
  // still the immutable equipment resolver's mountX/sightHeight.
  accessoryBox(g,'weapon-accessory-optic-reflex-base',
   optic.mountX,3.8+sightRise,0,4,1.1,3,metal);
  accessoryFrame(g,'weapon-accessory-optic-reflex-hood',
   optic.mountX,5.35+sightRise,0,3.5,2.8,.90,.57,polymer);
 }else if(optic.id==='optic-magnified'){
  // A3: one faceted tube, modest stepped objective/ocular, one grouped
  // hardware mesh and a single recognisable adjustment cap.
  accessoryTube(g,'weapon-accessory-optic-magnified-body',
   optic.mountX,5.10+sightRise,0,7.0,1.11,1.11,polymer);
  accessoryTube(g,'weapon-accessory-optic-magnified-objective',
   optic.mountX+2.95,5.10+sightRise,0,1.55,1.12,1.63,metal);
  accessoryTube(g,'weapon-accessory-optic-magnified-ocular',
   optic.mountX-3.20,5.10+sightRise,0,.95,1.24,1.34,metal);
  accessoryMergedBoxes(g,'weapon-accessory-optic-magnified-mounts',[
   [optic.mountX-1.65,3.80+sightRise,0,.95,1.65,1.60],
   [optic.mountX+1.45,3.80+sightRise,0,.95,1.65,1.60]
  ],metal);
  accessoryBox(g,'weapon-accessory-optic-magnified-turret',
   optic.mountX-.42,6.49+sightRise,0,1.15,.75,1.38,metal,false);
 }
 const muzzle=parts.muzzle;
 const muzzleY=raw.build?.family==='ar'?AR_VISUAL_AXIS_Y:0;
 const ext=muzzle.muzzleExtension??0;
 if(ext>0){
  const radius=muzzle.id==='muzzle-suppressor'?2.65:2.05;
  block(g,muzzle.mountX+ext/2,muzzleY,0,ext,radius,radius,
   muzzle.id==='muzzle-suppressor'?
    (raw.build?HK_SD_SUPPRESSOR_METAL:polymer):
    (raw.build?HK_MUZZLE_METAL:metal));
  if(muzzle.id==='muzzle-brake'){
   block(g,muzzle.mountX+ext*.68,muzzleY,0,.32,2.4,2.7,polymer);
  }
 }
 if(parts.foregrip.id==='foregrip-handstop')
  block(g,assembly.supportX,-2.35+muzzleY,0,2.3,1.9,3.2,polymer);
 if(parts.foregrip.id==='foregrip-vertical'){
  block(g,assembly.supportX,-3.5+muzzleY,0,2.5,5.2,2.5,polymer);
  block(g,assembly.supportX,-1.2+muzzleY,0,4,1,3.4,metal);
 }
 if(parts.light.id==='light-compact'){
  const light=parts.light;
  block(g,light.mountX,light.mountY+muzzleY,light.mountZ,4.6,2.2,2.6,polymer);
  block(g,light.mountX+2.25,light.mountY+muzzleY,light.mountZ,1,2.6,3,metal);
  const lens=block(g,light.mountX+2.85,light.mountY+muzzleY,light.mountZ,
   .25,1.5,2.1,lensMaterial);
  lens.name='weapon-light-lens';lens.visible=false;
  block(g,light.mountX-2,light.mountY+.9+muzzleY,light.mountZ,2,.8,2.5,metal);
 }
 if(parts.sling.id==='sling-two-point'){
  // Rigid sling mounting hardware stays on the gun. The actual fabric
  // loop is positioned by the shared operator rig, not baked to receiver.
  block(g,-9,-.5,3,1.4,1,1.2,metal);
  block(g,10,-.5,3,1.4,1,1.2,metal);
 }
 return g;
}
