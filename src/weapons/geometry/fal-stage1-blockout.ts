/** FN FAL 50.00 Stage 1 — silhouette study only.
 * Isolated from factory catalogs, gameplay weapon stats, inventory and saving.
 *
 * +X points toward the muzzle, +Y is up, and Z is side-to-side depth.
 * The object is deliberately monochrome and constructed on demand, never per frame.
 * Do not promote this blockout to live equipment before visual approval.
 */
import * as THREE from 'three';
import {addOutline,addCuboid,addFacetedTube,addProfileFrame,
 type Outline,type SlotName} from './profile-primitives.ts';

export const FAL_STAGE1:Readonly<{
 stockRearX:number;receiverRearX:number;receiverFrontX:number;
 handguardStartX:number;handguardEndX:number;frontSightX:number;
 muzzleX:number;magazineCenterX:number;magazineBottomY:number;
}> = Object.freeze({
 stockRearX:-15.00,receiverRearX:-6.60,receiverFrontX:3.85,
 handguardStartX:3.80,handguardEndX:14.10,
 frontSightX:14.70,muzzleX:22.00,
 magazineCenterX:1.35,magazineBottomY:-8.05
});

export type FALStage1Options={
 /** Silhouette must already read as FAL without the optional raised handle. */
 raisedCarryHandle?:boolean;
};
/** Only supported geometry tools from the AR/AK/HK families.
 * This is a minimal exterior sketch, not a mechanical firearm model.
 */
export function buildFALStage1Silhouette(
 material:THREE.Material,options:FALStage1Options={}
):THREE.Group{
 const root=new THREE.Group();
 root.name='fal-stage1-5000-silhouette';
 const ids:Record<SlotName,number>={
  stock:0,receiver:0,grip:0,magazine:0,handguard:0,barrel:0
 };
 const p=(slot:SlotName,points:Outline,depth:number)=>
  addOutline(root,slot,'fal-stage1-'+slot,ids[slot]++,points,depth,material);
 const b=(slot:SlotName,x:number,y:number,z:number,w:number,h:number,d:number)=>
  addCuboid(root,slot,'fal-stage1-'+slot,ids[slot]++,x,y,z,w,h,d,material);

 // Fixed stock: large swept silhouette, a real hump behind the receiver,
 // and a thick black-box-scale rear pad. One continuous large outline.
 p('stock',[
  [-15.00,.55],[-13.15,.70],[-10.45,1.12],[-7.96,1.17],
  [-6.20,.48],[-6.13,-1.32],[-9.35,-2.39],
  [-14.70,-3.38],[-15.00,-3.18]
 ],3.18);
 b('stock',-14.86,-1.30,0,.28,4.12,3.44);

 // Receiver's long stepped upper cover. Deliberately NO G3-style raised
 // cocking tube and NO AR-like split carry-handle upper.
 p('receiver',[
  [-6.60,-.85],[-6.60,1.17],[-5.76,1.81],
  [2.95,1.81],[3.85,1.15],[3.85,-.72],
  [2.95,-1.18],[-5.72,-1.44]
 ],3.50);
 // Single angular lower, sculpting the grip/magazine negative space.
 p('receiver',[
  [-6.25,-1.14],[-5.73,-1.82],[-4.56,-2.23],
  [-3.14,-2.23],[-2.18,-1.42],[-.60,-1.34],
  [.16,-2.40],[3.34,-2.56],[3.75,-1.05]
 ],3.18);
 // Distinct FAL magazine-well wedge projecting down toward the magazine.
 p('receiver',[
  [-.42,-1.95],[3.38,-1.95],[3.52,-3.02],
  [3.10,-3.19],[-.25,-3.19]
 ],3.28);

 // Chunky rear-raked grip and close-to-vertical full-size box magazine.
 p('grip',[
  [-5.02,-2.16],[-2.90,-2.16],
  [-3.34,-5.72],[-3.60,-6.49],
  [-5.43,-6.53],[-5.48,-4.45]
 ],2.32);
 p('magazine',[
  [-.36,-2.98],[3.10,-2.98],
  [3.12,-7.61],[2.96,-8.05],
  [-.08,-8.05],[-.34,-7.69]
 ],2.32);

 // FN handguard: long flattened taper rather than a straight G3 tube
 // or a square M4 quad rail. NO slots, ribs, screws or textures in Stage 1.
 p('handguard',[
  [3.80,1.13],[4.50,1.40],[12.78,1.36],
  [14.10,.93],[14.10,-1.08],[12.95,-1.45],
  [4.44,-1.70],[3.80,-1.31]
 ],3.46);

 // One six-sided barrel. The gas-block sight is near the end of the
 // handguard rather than at the muzzle as on the G3.
 const barrel=addFacetedTube(root,'barrel','fal-stage1-barrel',
  ids.barrel++,13.85,21.15,.61,material);
 barrel.position.y=.12;
 // Large protective-ears front sight: one silhouette, not a G3 ring.
 p('barrel',[
  [14.13,.23],[14.16,2.41],[14.38,2.83],
  [14.61,2.83],[14.70,2.11],
  [14.91,2.70],[15.18,2.70],[15.28,.23]
 ],1.82);
 // Simple long Belgian muzzle treatment, entirely within authoritative tip.
 p('barrel',[
  [21.03,-.74],[21.28,-.84],[21.70,-.84],
  [22.00,-.67],[22.00,.67],[21.70,.84],
  [21.28,.84],[21.03,.74]
 ],1.78);
 // One short rear sight block. Leave tiny knobs, posts and pins unmodeled.
 p('receiver',[
  [-5.43,1.79],[-5.32,2.53],[-4.99,2.73],
  [-4.62,2.66],[-4.42,1.79]
 ],1.74);

 // Optional, deliberately gated silhouette probe. If the rifle only looks
 // like a FAL when this is raised, the primary geometry has failed.
 if(options.raisedCarryHandle){
  addProfileFrame(root,'receiver','fal-stage1-carry',ids.receiver++,
   [[2.45,1.75],[2.48,3.82],[5.97,3.94],[6.15,1.63]],
   [[3.02,2.18],[3.02,3.25],[5.42,3.28],[5.52,2.08]],
   1.48,material);
 }
 return root;
}
