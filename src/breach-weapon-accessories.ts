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
  // Build inside the EXACT existing extension envelope: no new gameplay
  // muzzle coordinate. Cylinder defaults to Y; shared primitive aligns +X.
  const cx=muzzle.mountX+ext/2;
  if(muzzle.id==='muzzle-suppressor'){
   accessoryTube(g,'weapon-accessory-muzzle-suppressor',cx,muzzleY,0,
    ext,1.27,1.27,raw.build?HK_SD_SUPPRESSOR_METAL:polymer,8);
   accessoryTube(g,'weapon-accessory-muzzle-suppressor-front',
    muzzle.mountX+ext-.17,muzzleY,0,.34,1.18,1.18,
    raw.build?HK_MUZZLE_METAL:metal,8,false);
  }else if(muzzle.id==='muzzle-brake'){
   accessoryTube(g,'weapon-accessory-muzzle-brake',cx,muzzleY,0,
    ext,.91,1.06,raw.build?HK_MUZZLE_METAL:metal,6);
   accessoryMergedBoxes(g,'weapon-accessory-muzzle-brake-ports',[
    [muzzle.mountX+ext*.42,muzzleY,1.01,.19,.72,.085],
    [muzzle.mountX+ext*.72,muzzleY,1.01,.19,.72,.085],
    [muzzle.mountX+ext*.42,muzzleY,-1.01,.19,.72,.085],
    [muzzle.mountX+ext*.72,muzzleY,-1.01,.19,.72,.085]
   ],polymer);
  }else{
   accessoryTube(g,'weapon-accessory-muzzle-hider',cx,muzzleY,0,
    ext,.77,.87,raw.build?HK_MUZZLE_METAL:metal,6);
  }
 }
 if(parts.foregrip.id==='foregrip-handstop'){
  accessoryProfile(g,'weapon-accessory-foregrip-handstop',
   assembly.supportX,-2.35+muzzleY,0,
   [[-1.16,.78],[1.10,.78],[1.18,-.28],[.36,-1.08],
    [-.73,-.88],[-1.16,-.16]],3.00,polymer);
 }
 if(parts.foregrip.id==='foregrip-vertical'){
  // Single visual owner across AR/AK/MP5 tri-rail. No extra HK body grip.
  accessoryProfile(g,'weapon-accessory-foregrip-vertical',
   assembly.supportX,-3.5+muzzleY,0,
   [[-1.09,2.45],[1.07,2.45],[1.01,-2.05],[.68,-2.63],
    [-.80,-2.63],[-1.08,-2.05]],2.27,polymer);
  accessoryBox(g,'weapon-accessory-foregrip-vertical-base',
   assembly.supportX,-1.2+muzzleY,0,3.35,1.00,3.10,metal);
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
