/** Equipment 19.03: low-resolution, rigid attachment shapes with true mount
 * coordinates. Only built on configuration changes, never per render frame.
 */
import * as THREE from 'three';
import {WEAPON_ACCESSORY_STEEL,WEAPON_ACCESSORY_POLYMER,
 HK_SD_SUPPRESSOR_METAL,HK_MUZZLE_METAL}
 from './weapons/geometry/weapon-visual-palette.ts';
import type {WeaponConfiguration} from './equipment-weapon-assemblies.ts';
import {retentionSocketsForConfiguration} from './breach-weapon-geometry.ts';
import {readSlingKind} from './breach-weapon-retention.ts';
import {resolveWeaponAssembly} from './equipment-weapon-assemblies.ts';
import {accessoryBox,accessoryTube,accessoryFrame,accessoryProfile,accessoryMergedBoxes}
 from './weapons/geometry/accessory-primitives.ts';
import {AR_VISUAL_AXIS_Y} from './weapons/geometry/ar-barrel-profiles.ts';
import {opticVisualSeat} from './weapons/geometry/optic-visual-seating.ts';
import {mountedAccessorySeat} from './weapons/geometry/mounted-accessory-layout.ts';
export function buildWeaponAccessories(raw:WeaponConfiguration,
 steel:THREE.Material,dark:THREE.Material,
 lensMaterial:THREE.Material=steel):THREE.Group{
 const assembly=resolveWeaponAssembly(raw),g=new THREE.Group(),parts=assembly.mounted;
 // All modular families share the same cached accessory finishes regardless of
 // caller/viewer. Preserve caller materials for the legacy shotgun fallback.
 const metal=raw.build?WEAPON_ACCESSORY_STEEL:steel;
 const polymer=raw.build?WEAPON_ACCESSORY_POLYMER:dark;
 const optic=parts.optic;
 // A3.H1: derive only the visual support surface; never touch gameplay
 // mountX, sightHeight or the weapon assembly's ballistic optic settings.
 const seat=opticVisualSeat(raw,optic.mountX);
 const opticX=seat.x,baseY=seat.supportY;
 const opticZ=seat.z??0;
 if(seat.mount!=='unresolved'&&optic.id==='optic-reflex'){
  // A3: an actual open hood, not a solid sight tower. The sight origin is
  // still the immutable equipment resolver's mountX/sightHeight.
  accessoryBox(g,'weapon-accessory-optic-reflex-base',
   opticX,baseY+.55,0,4,1.1,3,metal);
  accessoryFrame(g,'weapon-accessory-optic-reflex-hood',
   opticX,baseY+2.10,0,3.5,2.8,.90,.57,polymer);
 }else if(seat.mount!=='unresolved'&&optic.id==='optic-magnified'){
  // A3: one faceted tube, modest stepped objective/ocular, one grouped
  // hardware mesh and a single recognisable adjustment cap.
  accessoryTube(g,'weapon-accessory-optic-magnified-body',
   opticX,baseY+2.125,0,7.0,1.11,1.11,polymer);
  accessoryTube(g,'weapon-accessory-optic-magnified-objective',
   opticX+2.95,baseY+2.125,0,1.55,1.12,1.63,metal);
  accessoryTube(g,'weapon-accessory-optic-magnified-ocular',
   opticX-3.20,baseY+2.125,0,.95,1.24,1.34,metal);
  accessoryMergedBoxes(g,'weapon-accessory-optic-magnified-mounts',[
   [opticX-1.65,baseY+.825,0,.95,1.65,1.60],
   [opticX+1.45,baseY+.825,0,.95,1.65,1.60]
  ],metal);
  accessoryBox(g,'weapon-accessory-optic-magnified-turret',
   opticX-.42,baseY+3.515,0,1.15,.75,1.38,metal,false);
 }else if(seat.mount!=='unresolved'&&
  (optic.id==='optic-kashtan-ak'||optic.id==='optic-kashtan-p')){
  const direct=optic.id==='optic-kashtan-ak';
  const y=baseY+1.55;
  // One squat, memorable Kashtan body; two completely different physical
  // brackets. No generic floating magnified-scope rings or fake picatinny
  // hardware on the integrated Russian side-mounted version.
  accessoryTube(g,'weapon-accessory-optic-kashtan-main',
   opticX,y,opticZ,4.65,1.00,1.13,polymer,8);
  accessoryTube(g,'weapon-accessory-optic-kashtan-objective',
   opticX+1.87,y,opticZ,1.12,1.14,1.36,metal,8);
  accessoryTube(g,'weapon-accessory-optic-kashtan-eyecup',
   opticX-2.08,y,opticZ,.86,1.21,1.06,polymer,8);
  accessoryBox(g,'weapon-accessory-optic-kashtan-housing',
   opticX-.30,y+.94,opticZ,2.70,.45,1.60,metal,false);
  if(direct){
   // Rail contact is (-Z) on the actual receiver at Y=-.07.
   // The leg/elbow intersects both the clamping cheek and optic cradle.
   accessoryMergedBoxes(g,'weapon-accessory-optic-kashtan-side-bracket',[
    [opticX,-.07,-2.55,3.05,.84,.56],
    [opticX-.28,1.28,-2.42,1.18,2.74,.80],
    [opticX-.23,2.82,-1.51,2.85,.77,2.12],
    [opticX,baseY+.44,opticZ,2.58,.88,2.02]
   ],metal);
  }else{
   accessoryMergedBoxes(g,'weapon-accessory-optic-kashtan-rail-bracket',[
    [opticX,baseY+.42,opticZ,2.65,.84,2.05],
    [opticX-1.08,baseY+.10,opticZ,.46,.20,2.22],
    [opticX+1.07,baseY+.10,opticZ,.46,.20,2.22]
   ],metal);
  }
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
 // The exact same rail contact owns the modeled grip and the pose palm.
 const gripSeat=mountedAccessorySeat(raw,'foregrip');
 const gripX=gripSeat?.x??assembly.supportX;
 const gripContactY=gripSeat?.placement.y;
 if(parts.foregrip.id==='foregrip-handstop'&&(!raw.build||gripSeat)){
  accessoryProfile(g,'weapon-accessory-foregrip-handstop',
   gripX,gripContactY!==undefined?gripContactY-1.0:-2.35+muzzleY,0,
   [[-1.16,.78],[1.10,.78],[1.18,-.28],[.36,-1.08],
    [-.73,-.88],[-1.16,-.16]],3.00,polymer);
 }
 if(parts.foregrip.id==='foregrip-vertical'&&(!raw.build||gripSeat)){
  // Single visual owner across AR/AK/MP5 tri-rail. No extra HK body grip.
  accessoryProfile(g,'weapon-accessory-foregrip-vertical',
   gripX,gripContactY!==undefined?gripContactY-2.60:-3.5+muzzleY,0,
   [[-1.09,2.45],[1.07,2.45],[1.01,-2.05],[.68,-2.63],
    [-.80,-2.63],[-1.08,-2.05]],2.27,polymer);
  accessoryBox(g,'weapon-accessory-foregrip-vertical-base',
   gripX,gripContactY!==undefined?gripContactY-.50:-1.2+muzzleY,0,
   3.35,1.00,3.10,metal);
 }
 const fittedLight=mountedAccessorySeat(raw,'light');
 // Invalid *legacy* fitted items remain owned but never float or illuminate
 // on an unmodeled rail; they are reported by the read-only layout audit.
 if(parts.light.id==='light-compact'&&(!raw.build||fittedLight)){
  const light=parts.light;
  const mount=fittedLight;
  const lx=mount?.x??light.mountX;
  const ly=mount?.y??(light.mountY+muzzleY);
  const lz=mount?.z??light.mountZ;
  accessoryTube(g,'weapon-accessory-light-body',
   lx,ly,lz,4.30,1.08,1.08,polymer,8);
  accessoryTube(g,'weapon-accessory-light-head',
   lx+2.22,ly,lz,.82,1.20,1.38,metal,8);
  const lens=accessoryTube(g,'weapon-light-lens',
   lx+2.68,ly,lz,.16,.91,.91,lensMaterial,8,false);
  // Runtime light state still owns this exact stable name and visibility.
  lens.visible=false;
  if(mount){
   // Metal cheek touches the real rail face, not an imaginary +Z socket.
   const outer=mount.placement.z,side=mount.normalZ;
   const inner=outer+side*.10;
   const span=Math.abs(lz-inner)+.48;
   accessoryBox(g,'weapon-accessory-light-rail-bracket',
    lx-1.40,ly,(inner+lz)/2,2.25,.80,span,metal);
  }else accessoryBox(g,'weapon-accessory-light-rail-bracket',
   lx-1.40,ly+.96,lz,2.25,.80,2.05,metal);
 }
 const slingKind=readSlingKind(parts.sling.id);
 if(slingKind!=='none'){
  const seats=retentionSocketsForConfiguration(raw,steel,dark);
  const points=slingKind==='single'?[seats?.single]:
   [seats?.rear,seats?.front];
  const boxes=points.flatMap(p=>p?[[p.x,p.y,p.z+.15,1.35,.85,.65] as const]:[]);
  if(boxes.length)accessoryMergedBoxes(g,'weapon-accessory-sling-rigid-mounts',boxes,metal);
 }
 return g;
}
