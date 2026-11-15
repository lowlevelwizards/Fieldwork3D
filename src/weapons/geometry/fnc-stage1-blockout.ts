/** FN FNC P2 visual refinement. Independent, inspection-only geometry;
 * no weapon preset, faction allocation, animation or ballistic modification.
 * Geometry is built once on selection, never in a frame loop.
 * +X muzzle, +Y up, +Z right; share scale with approved Fieldwork rifles.
 */
import * as THREE from 'three';
import {addOutline,addCuboid,addBar} from './profile-primitives.ts';
import type {SlotName,Outline} from './profile-primitives.ts';
import {arMagazineCurve,arMagazineOutline,arMagazineRibOutlines}
 from './ar-magazine-profiles.ts';
import {addFNCFacetedForearm,addFNCForearmMarks}
 from './fnc-handguard-profiles.ts';

export const FNC_P1=Object.freeze({
 stockRearX:-14.85,receiverRearX:-6.38,receiverFrontX:4.12,
 handguardStartX:3.45,handguardEndX:13.55,
 frontSightX:15.20,muzzleX:19.50,magazineBottomY:-7.80,
 nominalBarrelInches:17.7
});
type Finish='steel'|'lower'|'stock'|'cheek'|'grip'|'handguard'|
 'magazine'|'stamp'|'barrel'|'muzzle'|'shadow';
export type FNCArtFinishes=Readonly<Partial<Record<Finish,THREE.Material>>>;

export function buildFNCStage1Silhouette(
 material:THREE.Material,finishes:FNCArtFinishes={}
):THREE.Group{
 const root=new THREE.Group();
 root.name='fnc-p2-exterior-art-preview';
 const ids:Record<SlotName,number>={
  stock:0,receiver:0,grip:0,magazine:0,handguard:0,barrel:0
 };
 const mat=(role:Finish)=>finishes[role]??material;
 const p=(slot:SlotName,points:Outline,depth:number,role:Finish='steel')=>
  addOutline(root,slot,'fnc-p2-'+slot,ids[slot]++,points,depth,mat(role));
 const b=(slot:SlotName,x:number,y:number,z:number,
  w:number,h:number,d:number,role:Finish='steel')=>
  addCuboid(root,slot,'fnc-p2-'+slot,ids[slot]++,x,y,z,w,h,d,mat(role));
 const rail=(a:readonly [number,number],end:readonly [number,number],
  width:number,role:Finish='stock')=>{
  const mesh=addBar(root,'stock','fnc-p2-stock',ids.stock++,
   a,end,width,1.04,mat(role));
  mesh.userData.fncStockRail=true;
  return mesh;
 };
 // Two separate slender metal stock members; true negative space is crucial.
 rail([-6.45,.03],[-14.13,-.03],.57);
 rail([-6.50,-1.62],[-14.12,-3.05],.58);
 const brace=b('stock',-6.52,-.74,0,1.16,2.18,1.72,'stock');
 brace.userData.fncStockHinge=true;
 const pad=b('stock',-14.42,-1.60,0,.86,3.92,1.96,'stock');
 pad.userData.fncButtPlate=true;
 // FNC insulating cheek sleeve is ONLY on the top stock member, not an
 // entirely new buttstock. It stays clear of the open triangular void.
 const cheek=rail([-9.45,.02],[-13.48,-.02],.78,'cheek');
 cheek.userData.fncStockRail=false;
 cheek.userData.fncCheekSleeve=true;

 // Flat stamped upper: no FAL triangular roof, HK cocking tube or AR handle.
 const upper=p('receiver',[
  [-6.38,1.42],[3.08,1.42],[3.50,.78],[4.12,.18],
  [4.12,-1.22],[-6.38,-1.22]
 ],2.80,'steel');
 upper.userData.fncFlatStampedUpper=true;
 const lower=p('receiver',[
  [-6.30,-1.10],[3.96,-1.10],[3.50,-2.94],
  [-.35,-2.94],[-1.14,-2.39],[-6.30,-2.39]
 ],2.88,'lower');
 lower.userData.fncAngularLower=true;
 // Pressed steel top cover is a modest roof step, NEVER a Picatinny rail.
 const cover=b('receiver',-.45,1.50,0,6.9,.27,2.42,'steel');
 cover.userData.fncStampedCover=true;
 // One chunky detachable-magazine housing lip: a legible FNC box-like lower.
 const magwell=b('receiver',1.66,-2.88,0,3.13,.34,3.00,'lower');
 magwell.userData.fncMagwellLip=true;

 // Correct angular FNC pistol grip, inspired by FAL rake but proportionally
 // smaller and noticeably detached from the outer lower receiver wall.
 const grip=p('grip',[
  [-5.07,-2.31],[-3.42,-2.31],[-5.03,-6.08],[-7.01,-6.08]
 ],2.02,'grip');
 grip.userData.fncGrip=true;
 // Shared 30-round STANAG centerline/normal math: not another hand-tuned
 // stepped magazine. Two broad pressed ribs track the same curved face.
 const magazineCurve={
  ...arMagazineCurve('30',1.65,-2.81,2.55,1.49),
  length:4.65,sweep:.72
 };
 const mag=p('magazine',arMagazineOutline(magazineCurve),
  magazineCurve.depth,'magazine');
 mag.userData.fnc556Magazine=true;
 mag.userData.fnc30RoundCurved=true;
 for(const profile of arMagazineRibOutlines(magazineCurve)){
  const rib=p('magazine',profile,1.54,'stamp');
  rib.userData.fncStampedMagazineRib=true;
  rib.castShadow=false;rib.receiveShadow=false;
 }

 // True eight-face molded fore-end with forward taper. Unlike the FAL,
 // long broad flat sides are dominant. Side grooves/vents are batched quads.
 addFNCFacetedForearm(root,mat('handguard'));
 addFNCForearmMarks(root,mat('shadow'));
 const collar=b('handguard',13.48,-.30,0,.44,2.33,2.31,'steel');
 collar.userData.fncHandguardNoseCollar=true;
 // Upper gas path reads as a SINGLE separated longitudinal mass.
 const gas=b('barrel',12.45,1.25,0,2.48,.47,1.08,'barrel');
 gas.userData.fncUpperGasRun=true;
 // Retain corrected P1B barrel diameter and overall muzzle/stock datums.
 const barrel=b('barrel',16.33,0,0,5.35,.96,.96,'barrel');
 barrel.userData.fncServiceBarrel=true;
 const muzzle=b('barrel',18.90,0,0,1.20,1.16,1.16,'muzzle');
 muzzle.userData.fncMuzzle=true;
 const gasBlock=b('barrel',14.25,.15,0,.88,1.12,1.30,'steel');
 gasBlock.userData.fncFrontGasBlock=true;
 const front=b('barrel',15.20,.80,0,1.12,1.30,1.38,'steel');
 front.userData.fncFrontSightBase=true;
 for(const side of [-1,1] as const){
  const ear=b('barrel',15.20,1.84,side*.49,.54,1.20,.45,'steel');
  ear.userData.fncFrontSightEar=side;
 }
 const rear=b('receiver',-4.91,1.99,0,.96,1.18,1.11,'steel');
 rear.userData.fncRearAperture=true;

 // Asymmetric: right-side port/cover and charging handle, left selector.
 // Protruding parts overlap the RECEIVER body rather than float beside it.
 const port=b('receiver',2.08,.35,1.45,2.38,.65,.15,'shadow');
 port.userData.fncRightPort=true;
 port.castShadow=false;port.receiveShadow=false;
 const portLip=b('receiver',3.16,.35,1.54,.32,.58,.14,'lower');
 portLip.userData.fncPortLip=true;
 const handle=b('receiver',.42,.61,1.73,.98,.55,.69,'steel');
 handle.userData.fncRightChargingHandle=true;
 const selectorGeo=new THREE.CylinderGeometry(.37,.37,.22,6,1);
 selectorGeo.rotateX(Math.PI/2);
 const selector=new THREE.Mesh(selectorGeo,mat('steel'));
 selector.name='family-receiver-fnc-p2-selector';
 selector.position.set(-4.63,-1.55,-1.47);
 selector.userData.fncLeftSelector=true;
 selector.castShadow=true;selector.receiveShadow=true;
 root.add(selector);
 return root;
}
