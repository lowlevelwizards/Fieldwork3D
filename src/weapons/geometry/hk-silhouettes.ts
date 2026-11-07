/** Chunky, iconic G3 roller-delayed family silhouettes, exterior game art only.
 * Never allocate meshes during the animation loop; no mechanics or ballistics here.
 */
import * as THREE from 'three';
import type {WeaponFamilyBuild} from '../../equipment-weapon-families.ts';
import {addOutline,addCuboid,addFacetedTube,type Outline,type SlotName}
 from './profile-primitives.ts';
import {HK_OLIVE_POLYMER,HK_MAG_METAL}
 from './weapon-visual-palette.ts';
import {HK_BARREL_ART} from './hk-barrel-profiles.ts';
import {addHKFacetedForearm,addHKHandguardOpenings} from './hk-handguard-profiles.ts';
import {HK_MAG20_OUTLINE} from './hk-magazine-profiles.ts';
import {addHKRetractableStock} from './hk-retractable-stock.ts';
import {addHK556Family} from './hk-556-silhouettes.ts';
import {addHKMP5Family} from './hk-mp5-silhouettes.ts';
import {HK_VISUAL_ANATOMY} from './weapon-receiver-anatomy.ts';
import {addWeaponPixelMark} from './weapon-pixel-detail.ts';

export function addHKFamily(root:THREE.Group,build:WeaponFamilyBuild,
 steel:THREE.Material,dark:THREE.Material,wood:THREE.Material,
 showFactoryMuzzle=true){
 const parts=build.parts,early=parts.receiver==='hk-g3-early';
 if(parts.receiver.startsWith('hk-mp5')){
  addHKMP5Family(root,build,steel,dark,showFactoryMuzzle);
  return;
 }
 if(parts.receiver==='hk33-556-rifle'||parts.receiver==='hk53-556-compact'){
  addHK556Family(root,build,steel,dark,showFactoryMuzzle);
  return;
 }
 const art=HK_BARREL_ART[parts.barrel];
 if(!art)throw new Error('Unknown HK art barrel: '+parts.barrel);
 const ids:Record<SlotName,number>={
  stock:0,receiver:0,grip:0,magazine:0,handguard:0,barrel:0
 };
 const material=(finish:'steel'|'dark'|'wood'|'olive'|'mag')=>
  finish==='steel'?steel:finish==='wood'?wood:
  finish==='olive'?HK_OLIVE_POLYMER:finish==='mag'?HK_MAG_METAL:dark;
 const p=(slot:SlotName,points:Outline,depth:number,
  finish:'steel'|'dark'|'wood'|'olive'|'mag'='steel')=>
  addOutline(root,slot,parts[slot],ids[slot]++,points,depth,material(finish));
 const b=(slot:SlotName,x:number,y:number,z:number,w:number,h:number,d:number,
  finish:'steel'|'dark'|'wood'|'olive'|'mag'='steel')=>
  addCuboid(root,slot,parts[slot],ids[slot]++,x,y,z,w,h,d,material(finish));

 // Stamped HK receiver and connected trigger housing: deliberately no AR split.
 p('receiver',[[-6.50,-1.43],[-6.50,1.05],[-5.75,1.85],
   [3.50,1.85],[4.55,1.20],[4.55,-1.36],[3.70,-1.71],
   [-5.65,-1.71]],3.52);
 // One low, stepped HK trigger housing: its outline must not imitate an
 // AR's visually split upper/lower nor the AK's projecting dust cover.
 p('receiver',[[-5.80,-1.28],[-5.34,-2.10],[-4.73,-2.23],
   [-4.38,-2.55],[-3.32,-2.61],[-2.95,-2.41],
   [-.80,-2.42],[-.42,-2.32],[2.52,-2.48],
   [3.95,-1.48]],3.18,'dark');
 // Integrated angular magazine housing; the magazine top stays fully seated.
 p('receiver',[[-.58,-2.08],[3.32,-2.08],[3.39,-2.93],
   [3.13,-3.13],[-.29,-3.13],[-.50,-2.91]],3.35);
 // No separately modeled trigger guard. The stepped lower housing,
 // grip shoulder, and magazine housing carry the silhouette just as they
 // do in the existing Fieldwork AR/AK miniature families.

 // Early and polymer buttstocks are both confident single solid shapes.
 const retract=parts.stock==='hk-g3-retract-stock';
 const rear=early||retract?-15.15:-15.30;
 // The stock shell stops INSIDE the buttplate. Its cap is now a genuine
 // outward-facing slab instead of a coplanar overlaid side face (R3 Z-fight).
 if(retract){
  addHKRetractableStock(root,parts.stock,rear,steel,dark);
 }else{
 const stockStart=rear+.46;
 p('stock',early?[
  [stockStart,1.22],[-11.18,1.25],[-10.77,1.16],
  [-6.25,.67],[-6.18,-1.46],[-9.13,-2.49],
  [-13.76,-3.29],[stockStart,-2.87]
 ]:[
  [stockStart,1.12],[-11.03,1.13],[-10.61,1.06],
  [-6.23,.69],[-6.15,-1.44],[-9.52,-2.33],
  [-14.73,-3.04],[stockStart,-2.85]
 ],3.12,early?'wood':'olive');
 // One deliberately thick miniature buttplate: the visible rear remains
 // at the ORIGINAL rear landmark. Its inner end overlaps the stock .10,
 // and the side surfaces stand .19 clear of the stock on either side.
 // No coplanar stock/pad faces or decorative buttplate layers.
 const padMidY=early?-.825:-.865;
 const padHeight=early?4.40:4.27;
 const buttpad=b('stock',rear+.28,padMidY,0,.56,padHeight,3.50,'dark');
 buttpad.userData.hkButtpad=true;
 }

 // Simple HK grip, shorter and chunkier than literal scale reference.
 // Distinct HK rearward rake; root stays underneath the trigger group
 // and remains inside the existing -4.20 primary-hand pose contact.
 p('grip',[[-4.90,-2.31],[-2.50,-2.31],[-2.90,-5.88],
   [-3.12,-6.72],[-4.95,-6.66],[-5.06,-3.43]],2.16,'dark');

 // The 20-round steel magazine is a TRUE straight-sided box. Shared
 // outline also drives carried and reload magazines; no AK-like heel drift.
 p('magazine',HK_MAG20_OUTLINE,2.08,'mag');
 // Seat one muted heel cap flush to the new centered lower magazine width.
 b('magazine',1.55,-7.73,0,3.22,.16,2.18,'dark');
 // The simple straight box silhouette beats tiny pale stamped stripes.

 // HK slim fore-end: one faceted YZ body. Never an AK upper/lower split.
 const woodGuard=parts.handguard==='hk-g3-wood-vented';
 const guardMat=woodGuard?wood:HK_OLIVE_POLYMER;
 // A real 8-sided broad-face tube with only a gentle taper at the nose:
 // single mesh, no fragile decorative sleeves or extended tropical furniture.
 addHKFacetedForearm(root,parts.handguard,ids.handguard++,
  art.handguardStartX,art.handguardEndX,woodGuard,guardMat);
 b('handguard',4.23,-.15,0,.37,2.76,3.02,'steel');
 // Four big, face-aligned vents per side instead of a tiny dot strip.
 // No separate front lip to float beneath the tapered fore-end.
 addHKHandguardOpenings(root,art.handguardStartX,art.handguardEndX,woodGuard);

 // Cocking tube sits above and slightly intersects the handguard roof.
 const tube=addFacetedTube(root,'receiver',parts.receiver,ids.receiver++,
  3.45,14.10,.57,steel);
 tube.position.y=1.58;
 // One oversized side-folded HK cocking handle, carved as a single
 // low-poly L-shaped silhouette on the LEFT of the tube.
 // Its foot intersects both the receiver nose and tube; never floats.
 const handle=p('receiver',[
  [3.83,1.48],[5.45,1.48],[5.45,2.03],
  [4.85,2.03],[4.79,2.53],[4.06,2.53],
  [3.83,2.24]
 ],1.80,'steel');
 // Z [-2.02, -.22]: one continuous solid engages the receiver flank
 // AND forward cocking tube, while projecting clearly from the left side.
 handle.position.z=-1.12;
 handle.userData.hkCockingHandle=true;

 // One slightly larger, solid factory flash hider wraps the last .15 of
 // the exposed barrel instead of sharing any visible barrel surface.
 // This removes the factory muzzle's Z-fighting at the nose while keeping
 // the authoritative visible / shot-time muzzle at exactly X=22.40.
 // On accessory-muzzle builds, the bare barrel still reaches that anchor.
 const hiderStart=art.muzzleX-1.30;
 const exposedBarrelTip=showFactoryMuzzle?hiderStart+.15:art.muzzleX;
 const barrelGeo=new THREE.CylinderGeometry(.74,.74,
  exposedBarrelTip-art.barrelStartX,6,1);
 barrelGeo.rotateZ(-Math.PI/2);
 const barrelMesh=new THREE.Mesh(barrelGeo,steel);
 barrelMesh.position.x=(art.barrelStartX+exposedBarrelTip)/2;
 barrelMesh.name='family-barrel-'+parts.barrel+'-'+ids.barrel++;
 barrelMesh.castShadow=true;barrelMesh.receiveShadow=true;root.add(barrelMesh);
 if(showFactoryMuzzle){
  const flashHider=p('barrel',[
   [hiderStart,-.82],[hiderStart+.16,-.85],
   [art.muzzleX-.24,-.85],[art.muzzleX,-.69],
   [art.muzzleX,.69],[art.muzzleX-.24,.85],
   [hiderStart+.16,.85],[hiderStart,.82]
  ],1.92,'dark');
  flashHider.userData.hkFactoryFlashHider=true;
 }

 // Keep the successful open front ring. Reshape its large rectangular
 // foot into one seated tapered neck, avoiding a slab across the barrel.
 p('barrel',[[art.frontSightX-.57,.10],
  [art.frontSightX-.39,1.33],[art.frontSightX-.22,1.47],
  [art.frontSightX+.21,1.47],[art.frontSightX+.51,.10]],
  1.66);
 // Six broad sides, one thick iconic ring, no fiddly sight hardware.
 const hoodGeo=new THREE.TorusGeometry(.85,.31,4,6);
 hoodGeo.rotateY(Math.PI/2);
 const hood=new THREE.Mesh(hoodGeo,steel);
 hood.position.set(art.frontSightX,2.34,0);
 hood.name='family-barrel-'+parts.barrel+'-'+ids.barrel++;
 hood.castShadow=true;hood.receiveShadow=true;root.add(hood);

 // One dark receiver port with enlarged muted bolt, on the RIGHT,
 // centered above the magazine. Shared anatomy prevents editor drift.
 const anatomy=HK_VISUAL_ANATOMY;
 const port=addWeaponPixelMark(root,'hk-port',anatomy.portX,
  anatomy.portY,1.775,anatomy.portWidthX,anatomy.portHeightY);
 port.userData.hkEjectionPort=true;
 const selector=addWeaponPixelMark(root,'hk-selector',-3.48,-.67,-1.777,2.05,.60);
 selector.rotation.y=Math.PI;
 
 // One solid silhouette per rear sight: no separate base/knobs.
 // Low early folding blade versus a broader, squat G3A3 diopter turret.
 if(early){
  // Thin early folding sight: one meaningful leaf shape, not a turret.
  const rear=p('receiver',[[-4.33,1.73],[-4.33,2.14],
   [-3.98,2.14],[-3.80,3.04],[-3.33,3.04],
   [-3.02,1.73]],1.68,'steel');
  rear.userData.hkRearSight='early-leaf';
 }else{
  // One real squat SIX-sided vertical turret. A distinctive HK drum
  // silhouette, broad across X/Z but shorter than an AR carry handle.
  const drum=new THREE.CylinderGeometry(1.18,1.18,1.48,6);
  const rear=new THREE.Mesh(drum,steel);
  rear.position.set(-3.55,2.54,0); // base Y=1.80 buried .05 into the roof
  rear.name='family-receiver-'+parts.receiver+'-'+ids.receiver++;
  rear.castShadow=true;rear.receiveShadow=true;root.add(rear);
  rear.userData.hkRearSight='diopter-drum';
 }
}
