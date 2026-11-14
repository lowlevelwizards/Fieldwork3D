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

 // S1B: exaggerated FAL hump-back, high cheek shoulder and low swept heel.
 // One uninterrupted, low-vertex stock volume with a broad miniaturized pad.
 p('stock',[
  [-15.00,.88],[-14.64,1.05],[-12.68,1.31],
  [-10.72,1.86],[-9.30,1.99],[-8.40,1.80],
  [-6.20,.52],[-6.13,-1.44],[-9.35,-2.18],
  [-14.72,-3.73],[-15.00,-3.55]
 ],3.18);
 b('stock',-14.86,-1.32,0,.28,4.60,3.45);

 // S1B: reinforce the distinctive two-step FAL top-cover near the nose.
 // cocking tube and NO AR-like split carry-handle upper.
 p('receiver',[
  [-6.60,-.87],[-6.60,1.10],[-5.78,1.86],
  [.88,1.86],[1.55,1.65],[3.06,1.65],
  [3.85,.99],[3.85,-.76],[2.94,-1.21],
  [-5.76,-1.46]
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

 // S1B: dramatically rear-raked chunky grip; preserve open mag/grip gap.
 p('grip',[
  [-5.18,-2.18],[-2.97,-2.18],
  [-4.34,-6.33],[-4.85,-7.14],
  [-6.87,-7.14],[-6.57,-5.52]
 ],2.32);
 p('magazine',[
  [-.36,-2.98],[3.10,-2.98],
  [3.12,-7.61],[2.96,-8.05],
  [-.08,-8.05],[-.34,-7.69]
 ],2.32);

 // S1B: prominent triangular/wedge forearm, fuller at rear and visibly
 // narrowing toward the gas block. NO vents, ribs or surface details.
 p('handguard',[
  [3.80,1.14],[4.46,1.67],[11.98,1.62],
  [13.74,1.26],[14.10,.75],[14.10,-.91],
  [12.22,-1.28],[4.56,-2.22],[3.80,-1.88]
 ],3.46);

 // One six-sided barrel. The gas-block sight is near the end of the
 // handguard rather than at the muzzle as on the G3.
 const barrel=addFacetedTube(root,'barrel','fal-stage1-barrel',
  ids.barrel++,13.85,21.15,.61,material);
 barrel.position.y=.12;
 // S1B: enlarged FAL gas-block sight with pronounced protective ears;
 // heavy V-shaped sight opening, never a G3 ring.
 p('barrel',[
  [13.97,.24],[14.05,1.47],[14.06,3.05],
  [14.35,3.38],[14.58,3.10],[14.67,2.36],
  [14.80,3.07],[15.07,3.32],[15.35,3.00],
  [15.38,.24]
 ],1.82);
 // Simple long Belgian muzzle treatment, entirely within authoritative tip.
 p('barrel',[
  [21.03,-.74],[21.28,-.84],[21.70,-.84],
  [22.00,-.67],[22.00,.67],[21.70,.84],
  [21.28,.84],[21.03,.74]
 ],1.78);
 // S1B: taller low-poly FAL rear blade; no knobs, pins or aperture holes.
 p('receiver',[
  [-5.52,1.82],[-5.42,2.74],[-5.06,3.00],
  [-4.68,2.86],[-4.48,1.82]
 ],1.74);

 // Optional, deliberately gated silhouette probe. If the rifle only looks
 // like a FAL when this is raised, the primary geometry has failed.
 if(options.raisedCarryHandle){
  addProfileFrame(root,'receiver','fal-stage1-carry',ids.receiver++,
   [[2.45,1.75],[2.48,3.82],[5.97,3.94],[6.15,1.63]],
   [[5.52,2.08],[5.42,3.28],[3.02,3.25],[3.02,2.18]],
   1.48,material);
 }
 return root;
}
