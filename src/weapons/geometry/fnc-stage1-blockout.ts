/** FNC P1: independent, monochrome, inspection-only FN FNC exterior.
 * This is NOT a live weapon, serialized family, faction default or ballistics definition.
 * +X muzzle, +Y up, +Z right; existing Fieldwork weapon art scale.
 * Shapes are authored once on lab creation, never in the animation loop.
 */
import * as THREE from 'three';
import {addOutline,addCuboid,addBar} from './profile-primitives.ts';
import type {SlotName,Outline} from './profile-primitives.ts';

export const FNC_P1=Object.freeze({
  stockRearX:-14.85,receiverRearX:-6.38,receiverFrontX:4.12,
  handguardStartX:3.45,handguardEndX:13.55,
  frontSightX:15.20,muzzleX:19.50,magazineBottomY:-8.05,
  nominalBarrelInches:17.7
});

export function buildFNCStage1Silhouette(material:THREE.Material):THREE.Group{
 const root=new THREE.Group();
 root.name='fnc-p1-isolated-silhouette';
 const ids:Record<SlotName,number>={
  stock:0,receiver:0,grip:0,magazine:0,handguard:0,barrel:0
 };
 const p=(slot:SlotName,points:Outline,depth:number)=>
  addOutline(root,slot,'fnc-p1-'+slot,ids[slot]++,points,depth,material);
 const b=(slot:SlotName,x:number,y:number,z:number,w:number,h:number,d:number)=>
  addCuboid(root,slot,'fnc-p1-'+slot,ids[slot]++,x,y,z,w,h,d,material);
 const rail=(a:readonly [number,number],end:readonly [number,number],width:number)=>{
  const mesh=addBar(root,'stock','fnc-p1-stock',ids.stock++,a,end,width,1.04,material);
  mesh.userData.fncStockRail=true;
 };
 // Authentic open, folded-capable tubular stock; no solid FAL butt mass.
 rail([-6.45,.03],[-14.13,-.03],.57);
 rail([-6.50,-1.62],[-14.12,-3.05],.58);
 const brace=b('stock',-6.52,-.74,0,1.16,2.18,1.72);
 brace.userData.fncStockHinge=true;
 const pad=b('stock',-14.42,-1.60,0,.86,3.92,1.96);
 pad.userData.fncButtPlate=true;

 // Broad horizontal stamped upper plus separated lower; no crowned FAL roof,
 // long G3 cocking tube or raised AR carrying handle.
 const upper=p('receiver',[
  [-6.38,1.42],[3.08,1.42],[3.50,.78],[4.12,.18],
  [4.12,-1.22],[-6.38,-1.22]
 ],2.80);
 upper.userData.fncFlatStampedUpper=true;
 const lower=p('receiver',[
  [-6.30,-1.10],[3.96,-1.10],[3.50,-2.94],
  [-.35,-2.94],[-1.14,-2.39],[-6.30,-2.39]
 ],2.88);
 lower.userData.fncAngularLower=true;
 // One broad top-cover step, not rows of rivets or fake rails.
 const cover=b('receiver',-.45,1.57,0,6.90,.38,2.28);
 cover.userData.fncTopCover=true;

 p('grip',[
  [-5.07,-2.31],[-3.42,-2.31],[-5.03,-6.08],[-7.01,-6.08]
 ],2.02);
 // Corrected FNC 30-round STANAG silhouette. The P1 straight slab was too
 // broad at its heel and visually uncurved. These nine broad outline points
 // make one gently swept, slightly narrowed magazine, no decorative ridges.
 const mag=p('magazine',[
  [.55,-2.81],[2.85,-2.81],[2.90,-4.10],[2.75,-5.60],
  [2.50,-7.30],[2.18,-7.90],[-.23,-8.05],
  [-.05,-6.55],[.32,-4.95]
 ],1.49);
 mag.userData.fnc556Magazine=true;
 mag.userData.fnc30RoundCurved=true;

 // Iconic long handguard with substantial rounded-bottom outline and
 // one recessed longitudinal groove. Stay legible at gameplay distance.
 const guard=p('handguard',[
  [3.45,1.05],[12.65,1.05],[13.55,.50],
  [13.29,-1.61],[11.70,-2.04],[5.04,-2.04],[3.45,-1.47]
 ],2.76);
 guard.userData.fncLongGroovedHandguard=true;
 const groove=b('handguard',8.32,-.76,1.45,6.45,.34,.12);
 groove.userData.fncSingleHandguardGroove=true;
 // Slender upper gas-run: separate from main handguard and receiver.
 b('barrel',12.48,1.15,0,2.57,.48,1.15);

 // P1B: the .66 pencil-thin tube exaggerated how exposed the FNC barrel
 // feels. Use a heavier 0.96 art diameter; shorten exposed span to bring
 // extended rifle length into line with the shorter 997 mm FNC vs FAL.
 // Nominal real 449 mm barrel remains 17.7 in; art units are not inches.
 const barrel=b('barrel',16.33,0,0,5.35,.96,.96);
 barrel.userData.fncServiceBarrel=true;
 const muzzle=b('barrel',18.90,0,0,1.20,1.16,1.16);
 muzzle.userData.fncMuzzle=true;
 const front=b('barrel',15.20,.80,0,1.12,1.30,1.38);
 front.userData.fncFrontSightBase=true;
 for(const side of [-1,1] as const){
  const ear=b('barrel',15.20,1.84,side*.49,.54,1.20,.45);
  ear.userData.fncFrontSightEar=side;
 }
 const rear=b('receiver',-4.91,1.99,0,.96,1.18,1.11);
 rear.userData.fncRearAperture=true;
 // One side-mounted handle is visible in three-quarter; do not duplicate
 // FAL's forward-left handle or add tiny moving parts.
 const handle=b('receiver',.42,.61,1.60,.98,.55,.56);
 handle.userData.fncRightChargingHandle=true;
 return root;
}
