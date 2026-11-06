/** Chunky, iconic G3 roller-delayed family silhouettes, exterior game art only.
 * Never allocate meshes during the animation loop; no mechanics or ballistics here.
 */
import * as THREE from 'three';
import type {WeaponFamilyBuild} from '../../equipment-weapon-families.ts';
import {addOutline,addCuboid,addFacetedTube,addProfileFrame,type Outline,type SlotName}
 from './profile-primitives.ts';
import {HK_OLIVE_POLYMER,HK_MAG_METAL}
 from './weapon-visual-palette.ts';
import {HK_BARREL_ART} from './hk-barrel-profiles.ts';
import {addHKFacetedForearm,addHKHandguardOpenings} from './hk-handguard-profiles.ts';
import {HK_MAG20_OUTLINE} from './hk-magazine-profiles.ts';
import {addWeaponPixelMark} from './weapon-pixel-detail.ts';

export function addHKFamily(root:THREE.Group,build:WeaponFamilyBuild,
 steel:THREE.Material,dark:THREE.Material,wood:THREE.Material,
 showFactoryMuzzle=true){
 const parts=build.parts,early=parts.receiver==='hk-g3-early';
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
 // A single real negative-space trigger guard, not a delicate wire loop.
 // It overlaps grip/lower and magwell; the lower strip remains continuous.
 addProfileFrame(root,'receiver',parts.receiver,ids.receiver++,
  [[-3.09,-2.36],[-.33,-2.36],[-.37,-3.72],
   [-1.08,-4.00],[-2.47,-4.00],[-3.16,-3.52]],
  [[-2.40,-2.89],[-2.28,-3.47],[-1.10,-3.47],[-.83,-2.89]],
  1.12,dark);

 // Early and polymer buttstocks are both confident single solid shapes.
 const rear=early?-15.15:-15.30;
 p('stock',early?[
  [rear,1.22],[-11.18,1.25],[-10.77,1.16],
  [-6.25,.67],[-6.18,-1.46],[-9.13,-2.49],
  [-13.76,-3.29],[rear,-2.87]
 ]:[
  [rear,1.12],[-11.03,1.13],[-10.61,1.06],
  [-6.23,.69],[-6.15,-1.44],[-9.52,-2.33],
  [-14.73,-3.04],[rear,-2.85]
 ],3.12,early?'wood':'olive');
 // Rear pad is seated within the stock envelope, not protruding into camera fit.
 b('stock',rear+.21,-.90,0,.42,4.28,3.30,'dark');

 // Simple HK grip, shorter and chunkier than literal scale reference.
 p('grip',[[-4.88,-2.31],[-2.48,-2.31],[-2.23,-5.82],
   [-2.70,-6.81],[-4.42,-6.68],[-5.06,-3.40]],2.16,'dark');

 // Straight, full-power 20-round box magazine; slight rearward heel bias.
 p('magazine',HK_MAG20_OUTLINE,2.08,'mag');
 // Dark integral heel: no disconnected bright bar across the underside.
 b('magazine',1.20,-7.69,0,3.36,.20,2.15,'dark');
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
  [3.82,1.52],[5.50,1.52],[5.50,2.16],
  [4.91,2.16],[4.83,2.86],[4.08,2.86],
  [3.82,2.48]
 ],.98,'steel');
 handle.position.z=-1.05;
 handle.userData.hkCockingHandle=true;

 // Six-sided clean exposed nose: miniature roundness rather than the
 // previous square beam, but with the exact existing 22.4 shot-time tip.
 const barrelGeo=new THREE.CylinderGeometry(.74,.74,
  art.muzzleX-art.barrelStartX,6,1);
 barrelGeo.rotateZ(-Math.PI/2);
 const barrelMesh=new THREE.Mesh(barrelGeo,steel);
 barrelMesh.position.x=(art.barrelStartX+art.muzzleX)/2;
 barrelMesh.name='family-barrel-'+parts.barrel+'-'+ids.barrel++;
 barrelMesh.castShadow=true;barrelMesh.receiveShadow=true;root.add(barrelMesh);
 if(showFactoryMuzzle)
  p('barrel',[[art.muzzleX-1.12,-.61],
   [art.muzzleX-.27,-.73],[art.muzzleX,-.56],
   [art.muzzleX,.56],[art.muzzleX-.27,.73],
   [art.muzzleX-1.12,.61]],1.70,'dark');

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

 // Widen the EJECTION OPENING and bold bolt-like silver mass in one decal.
 // Keep it flush on the real right receiver face, not extra floating metal.
 addWeaponPixelMark(root,'hk-port',.42,.27,1.775,4.35,1.28);
 const selector=addWeaponPixelMark(root,'hk-selector',-3.48,-.67,-1.777,2.05,.60);
 selector.rotation.y=Math.PI;
 
 // One solid silhouette per rear sight: no separate base/knobs.
 // Low early folding blade versus a broader, squat G3A3 diopter turret.
 if(early){
  const rear=p('receiver',[[-4.34,1.73],[-4.34,2.08],
   [-4.04,2.08],[-3.89,2.88],[-3.49,2.88],
   [-3.29,2.11],[-2.96,2.11],[-2.96,1.72]],
  1.44,'steel');
  rear.userData.hkRearSight='early-leaf';
 }else{
  const rear=p('receiver',[[-4.48,1.73],[-4.48,2.30],
   [-4.12,2.32],[-4.06,2.94],
   [-3.70,3.17],[-3.24,3.17],
   [-2.92,2.87],[-2.90,1.73]],
  1.82,'steel');
  rear.userData.hkRearSight='diopter-drum';
 }
}
