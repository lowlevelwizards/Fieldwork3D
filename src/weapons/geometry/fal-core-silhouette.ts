/** FN FAL 50.00 shared exterior art. Stage 1 comparison and live family
 * use the SAME compact solid profiles, never duplicated or per-frame rebuilt.
 * Pure appearance only: no firing, inventory, ballistics or physical assembly.
 *
 * +X points toward the muzzle, +Y is up, and Z is side-to-side depth.
 * The object is deliberately monochrome and constructed on demand, never per frame.
 * Live Arsenal and the one-material comparison lab share this same builder.
 */
import * as THREE from 'three';
import {addOutline,addCuboid,addFacetedTube,addBar,
 type Outline,type SlotName} from './profile-primitives.ts';

export const FAL_ART:Readonly<{
 stockRearX:number;receiverRearX:number;receiverFrontX:number;
 handguardStartX:number;handguardEndX:number;frontSightX:number;
 muzzleX:number;magazineCenterX:number;magazineBottomY:number;
}> = Object.freeze({
 stockRearX:-15.00,receiverRearX:-6.60,receiverFrontX:3.85,
 handguardStartX:3.65,handguardEndX:14.10,
 frontSightX:14.70,muzzleX:22.00,
 magazineCenterX:1.35,magazineBottomY:-8.05
});

export type FALCoreOptions={raisedCarryHandle?:boolean;showFactoryMuzzle?:boolean};
export type FALCoreMaterials=Readonly<Record<SlotName,THREE.Material>>;
export type FALCoreIds=Readonly<Record<SlotName,string>>;
/** One source of geometry for the test lab and production FAL. */
export function buildFALCoreSilhouette(
 materials:FALCoreMaterials, partIds:FALCoreIds,options:FALCoreOptions={}
):THREE.Group{
 const root=new THREE.Group();
 root.name='fal-5000-core-silhouette';
 const ids:Record<SlotName,number>={
  stock:0,receiver:0,grip:0,magazine:0,handguard:0,barrel:0
 };
 const p=(slot:SlotName,points:Outline,depth:number)=>
  addOutline(root,slot,partIds[slot],ids[slot]++,points,depth,materials[slot]);
 const b=(slot:SlotName,x:number,y:number,z:number,w:number,h:number,d:number)=>
  addCuboid(root,slot,partIds[slot],ids[slot]++,x,y,z,w,h,d,materials[slot]);

 // FAL rear stock: full butt, long level comb and narrow wrist near receiver.
 // No M16-style peak or G3-like constant-width wedge.
 // One uninterrupted, low-vertex stock volume with a broad miniaturized pad.
 // Shell ends inside the broad plate; the plate alone owns X=-15.
 // Preserve the FAL comb/wrist rather than inventing a taller M16-like hump.
 p('stock',[
  [-14.60,1.03],[-13.30,1.14],[-11.20,1.17],
  [-9.50,.96],[-8.23,.54],[-6.20,.48],
  [-6.13,-1.25],[-8.40,-1.58],[-10.50,-2.50],
  [-14.60,-3.39]
 ],3.18);
 b('stock',-14.73,-1.15,0,.54,4.70,3.45);

 // S1C: continuous FAL cover with one angular nose, no invented top notch.
 // cocking tube and NO AR-like split carry-handle upper.
 p('receiver',[
  [-6.60,-.89],[-6.60,1.15],[-5.70,1.83],
  [2.80,1.83],[3.85,1.08],[3.85,-.76],
  [2.95,-1.21],[-5.72,-1.46]
 ],3.50);
 // Single angular lower, sculpting the grip/magazine negative space.
 p('receiver',[
  [-6.27,-1.17],[-5.66,-1.98],[-4.51,-2.38],
  [-3.15,-2.38],[-2.08,-1.53],[-.56,-1.50],
  [.16,-2.54],[3.36,-2.64],[3.75,-1.05]
 ],3.18);
 // Distinct FAL magazine-well wedge projecting down toward the magazine.
 p('receiver',[
  [-.42,-1.95],[3.38,-1.95],[3.52,-3.02],
  [3.10,-3.19],[-.25,-3.19]
 ],3.28);

 // S1C: compact raked FAL grip; preserve open mag/grip gap.
 p('grip',[
  [-5.12,-2.18],[-2.91,-2.18],
  [-3.72,-5.87],[-4.12,-6.58],
  [-6.11,-6.58],[-5.92,-5.15]
 ],2.32);
 p('magazine',[
  [-.36,-2.98],[3.10,-2.98],
  [3.12,-7.61],[2.96,-8.05],
  [-.08,-8.05],[-.34,-7.69]
 ],2.32);

 // S1C: shallow, wide and gently tapered FAL forearm, NOT M16 triangular.
 p('handguard',[
  [3.65,1.06],[4.48,1.40],[12.30,1.39],
  [14.10,1.01],[14.10,-1.05],[12.86,-1.45],
  [4.46,-1.74],[3.65,-1.32]
 ],3.46);

 // One six-sided barrel. The gas-block sight is near the end of the
 // handguard rather than at the muzzle as on the G3.
 const barrel=addFacetedTube(root,'barrel',partIds.barrel,
  ids.barrel++,13.85,options.showFactoryMuzzle===false?22.00:21.15,.61,materials.barrel);
 barrel.position.y=0;
 // Authentic protected FAL post: one broad gas-block base, two lateral
 // ears and a central post. Ears spread across Z, NOT along barrel X like
 // an M16 A-frame. Large contiguous shapes, no pins or mechanism geometry.
 p('barrel',[
  [14.02,.20],[14.06,1.40],[14.24,1.73],
  [15.10,1.73],[15.35,1.43],[15.35,.20]
 ],2.20);
 const earProfile:Outline=[
  [14.15,1.42],[14.22,2.52],[14.41,2.94],
  [14.76,2.94],[15.04,2.63],[15.16,1.42]
 ];
 const leftEar=p('barrel',earProfile,.46);
 leftEar.position.z=-.79;
 leftEar.userData.falFrontEar='left';
 const rightEar=p('barrel',earProfile,.46);
 rightEar.position.z=.79;
 rightEar.userData.falFrontEar='right';
 const sightPost=b('barrel',14.70,2.16,0,.22,1.24,.23);
 sightPost.userData.falFrontPost=true;
 // Simple short Belgian factory muzzle; omit when a mounted muzzle replaces it.
 if(options.showFactoryMuzzle!==false)p('barrel',[
  [21.03,-.74],[21.28,-.84],[21.70,-.84],
  [22.00,-.67],[22.00,.67],[21.70,.84],
  [21.28,.84],[21.03,.74]
 ],1.78);
 // S1C: low chunky rear blade; no knobs, pins or aperture holes.
 p('receiver',[
  [-5.52,1.82],[-5.42,2.49],[-5.06,2.76],
  [-4.72,2.66],[-4.48,1.82]
 ],1.74);

 // A small offset folding-handle representation: bent steel support with
 // long rearward horizontal polymer grip. Both solids physically overlap;
 // no AR-style upright arch, hollow box, hinges or screws. Factory enabled.
 if(options.raisedCarryHandle){
  const support=addBar(root,'receiver',partIds.receiver,ids.receiver++,
   [3.20,1.42],[2.96,3.07],.29,.48,materials.receiver);
  support.position.z=-1.60;
  support.userData.falCarrySupport=true;
  const grip=addCuboid(root,'receiver',partIds.receiver,ids.receiver++,
   1.56,3.19,-1.61,3.04,.64,.74,materials.stock);
  grip.userData.falCarryGrip=true;
 }
 return root;
}
