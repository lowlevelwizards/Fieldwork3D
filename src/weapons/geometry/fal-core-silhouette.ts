/** FN FAL 50.00 shared exterior art. Stage 1 comparison and live family
 * use the SAME compact solid profiles, never duplicated or per-frame rebuilt.
 * Pure appearance only: no firing, inventory, ballistics or physical assembly.
 *
 * +X points toward the muzzle, +Y is up, and Z is side-to-side depth.
 * The object is deliberately monochrome and constructed on demand, never per frame.
 * Do not promote this blockout to live equipment before visual approval.
 */
import * as THREE from 'three';
import {addOutline,addCuboid,addFacetedTube,addProfileFrame,
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

 // S1C: genuine swept FAL stock with a restrained rearward comb; no M16 triangle.
 // One uninterrupted, low-vertex stock volume with a broad miniaturized pad.
 p('stock',[
  [-15.00,.98],[-13.54,1.02],[-10.78,1.08],
  [-8.30,1.43],[-6.20,.68],[-6.13,-1.40],
  [-9.42,-2.42],[-14.72,-3.38],[-15.00,-3.20]
 ],3.18);
 b('stock',-14.86,-1.12,0,.28,4.22,3.45);

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
 // S1C: short wide gas-block ears; never an M16 tower or G3 hood.
 p('barrel',[
  [13.98,.24],[14.08,1.55],[14.12,2.68],
  [14.39,3.02],[14.61,2.82],[14.70,2.32],
  [14.87,2.80],[15.12,3.00],[15.37,2.65],
  [15.38,.24]
 ],1.82);
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

 // Optional compact, FAL-specific folding carry handle; never an AR bridge.
 // Factory presentation may enable it; monochrome silhouette can hide it.
 if(options.raisedCarryHandle){
  addProfileFrame(root,'receiver',partIds.receiver,ids.receiver++,
   [[3.55,1.47],[3.58,2.92],[5.68,3.01],[5.73,1.44]],
   [[5.21,1.83],[5.17,2.47],[4.10,2.43],[4.08,1.83]],
   1.48,materials.receiver);
 }
 return root;
}
