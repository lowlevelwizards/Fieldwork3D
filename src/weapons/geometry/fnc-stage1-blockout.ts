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
import {addFNCFacetedForearm,addFNCForearmMarks,addFNCGasCover}
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
 material:THREE.Material,finishes:FNCArtFinishes={},showFactoryMuzzle=true
):THREE.Group{
 const root=new THREE.Group();
 root.name='fnc-p3-fieldwork-exterior';
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
 // The insulated top tube and its metal portion now own DISJOINT lengths.
 // P2 drew the entire metal rail under a larger sleeve: equal-depth faces
 // shimmered in side views. Both terminate at x=-9.46 without overlap.
 rail([-6.45,.03],[-9.46,.01],.57);
 const lowerRail=p('stock',[
  [-6.50,-1.30],[-8.91,-1.64],[-14.12,-2.72],
  [-14.12,-3.36],[-8.90,-2.25],[-6.50,-1.95]
 ],1.04,'stock');
 lowerRail.userData.fncStockRail=true;
 lowerRail.userData.fncKinkedLowerRail=true;
 const hinge=p('stock',[
  [-7.10,.35],[-6.05,.35],[-5.93,-1.69],[-6.49,-2.05],[-7.10,-1.58]
 ],1.82,'stock');
 hinge.userData.fncStockHinge=true;
 const pad=p('stock',[
  [-14.85,.36],[-14.03,.36],[-13.99,-3.36],
  [-14.32,-3.56],[-14.85,-3.56]
 ],1.96,'stock');
 pad.userData.fncButtPlate=true;
 const cheek=rail([-9.46,.01],[-14.03,-.04],.83,'cheek');
 cheek.userData.fncStockRail=false;
 cheek.userData.fncCheekSleeve=true;
 cheek.userData.fncNoCoplanarRail=true;

 // One integrated stepped stamped upper: no redundant roof-cover plate.
 // Flat top, punched shoulder, angular transition into FN front furniture.
 const upper=p('receiver',[
  [-6.38,-1.22],[-6.38,1.24],[-5.60,1.60],
  [1.70,1.60],[2.95,1.36],[3.34,.84],[4.12,.17],
  [4.12,-1.22]
 ],2.80,'steel');
 upper.userData.fncFlatStampedUpper=true;
 // Integrate the magwell lip into the lower instead of stacking two almost
 // coplanar full-width extrusions. Broad steel lower edge remains readable.
 const lower=p('receiver',[
  [-6.30,-1.10],[3.90,-1.10],[3.60,-2.32],
  [3.15,-3.03],[.12,-3.03],[-.32,-2.71],
  [-1.25,-2.35],[-6.30,-2.35]
 ],2.93,'lower');
 lower.userData.fncAngularLower=true;
 lower.userData.fncMagwellLip=true;

 // A substantial lower heel and one bold rearward rake, not a wafer wedge.
 const grip=p('grip',[
  [-5.33,-2.27],[-3.46,-2.27],[-3.58,-2.66],
  [-4.77,-5.99],[-6.57,-6.16],[-6.88,-5.86]
 ],2.08,'grip');
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

 // Full polymer belly steps down while the independent upper metal housing
 // carries exactly three large ports per side. Same broad art boundaries.
 addFNCFacetedForearm(root,mat('handguard'));
 addFNCForearmMarks(root,mat('shadow'));
 addFNCGasCover(root,mat('steel'),mat('shadow'));
 const collar=b('handguard',13.47,-.29,0,.30,2.28,2.40,'steel');
 collar.userData.fncHandguardNoseCollar=true;
 // Retain corrected P1B barrel diameter and overall muzzle/stock datums.
 const barrel=b('barrel',showFactoryMuzzle?16.33:16.67,0,0,
  showFactoryMuzzle?5.35:5.66,.96,.96,'barrel');
 barrel.userData.fncServiceBarrel=true;
 if(showFactoryMuzzle){
  const collar=b('barrel',18.21,0,0,.42,1.24,1.24,'muzzle');
  collar.userData.fncMuzzleCollar=true;
  const geometry=new THREE.CylinderGeometry(.65,.65,1.20,6,1);
  geometry.rotateZ(Math.PI/2);
  const muzzle=new THREE.Mesh(geometry,mat('muzzle'));
  muzzle.position.x=18.90;
  muzzle.name='family-barrel-fnc-p3-flash-hider-'+ids.barrel++;
  muzzle.userData.fncMuzzle=true;
  muzzle.userData.fncSixFaceMuzzle=true;
  muzzle.castShadow=true;muzzle.receiveShadow=true;
  root.add(muzzle);
  // One batched long dark window per side, offset from the six-sided surface.
  // No teeth, holes or extra muzzle components; the front stays one hex body.
  const slots:number[]=[];
  for(const side of [-1,1] as const){
   const z=side*.688,a=[18.72,-.14,z],d=[18.72,.14,z],
    b=[19.28,-.14,z],c=[19.28,.14,z];
   if(side>0)slots.push(...a,...c,...b,...a,...d,...c);
   else slots.push(...a,...b,...c,...a,...c,...d);
  }
  const slotGeo=new THREE.BufferGeometry();
  slotGeo.setAttribute('position',new THREE.Float32BufferAttribute(slots,3));
  slotGeo.computeVertexNormals();
  const port=new THREE.Mesh(slotGeo,mat('shadow'));
  port.name='family-barrel-fnc-p3-muzzle-window-'+ids.barrel++;
  port.userData.fncMuzzleSlot=true;
  port.castShadow=false;port.receiveShadow=false;root.add(port);
 }
 const gasBlock=b('barrel',14.25,.15,0,.88,1.12,1.30,'steel');
 gasBlock.userData.fncFrontGasBlock=true;
 const front=b('barrel',15.20,.78,0,1.18,1.25,1.74,'steel');
 front.userData.fncFrontSightBase=true;
 for(const side of [-1,1] as const){
  const ear=p('barrel',[
   [14.66,1.22],[14.77,2.28],[15.01,2.66],
   [15.34,2.66],[15.70,2.14],[15.74,1.22]
  ],.46,'steel');
  ear.position.z=side*.64;
  ear.userData.fncFrontSightEar=side;
  ear.userData.fncSweptFrontEar=true;
 }
 // FNC protected rear aperture: a low U instead of the P2 LEGO-cube.
 const rear=b('receiver',-4.91,1.64,0,1.04,.42,1.43,'steel');
 rear.userData.fncRearAperture=true;
 for(const side of [-1,1] as const){
  const ear=b('receiver',-4.91,2.03,side*.52,.48,.67,.35,'steel');
  ear.userData.fncRearSightEar=side;
 }

 // Asymmetric: right-side port/cover and charging handle, left selector.
 // Protruding parts overlap the RECEIVER body rather than float beside it.
 const port=b('receiver',2.08,.35,1.45,2.38,.65,.15,'shadow');
 port.userData.fncRightPort=true;
 port.castShadow=false;port.receiveShadow=false;
 const portLip=b('receiver',3.16,.35,1.54,.32,.58,.14,'lower');
 portLip.userData.fncPortLip=true;
 // Short stem seated in side wall, with one broad six-face operating knob.
 b('receiver',.42,.61,1.50,.48,.38,.43,'steel');
 const handleGeo=new THREE.CylinderGeometry(.40,.40,.55,6,1);
 handleGeo.rotateX(Math.PI/2);
 const handle=new THREE.Mesh(handleGeo,mat('steel'));
 handle.position.set(.42,.61,1.85);
 handle.name='family-receiver-fnc-p3-charging-knob-'+ids.receiver++;
 handle.userData.fncRightChargingHandle=true;
 handle.userData.fncSixFacetedHandle=true;
 handle.castShadow=true;handle.receiveShadow=true;root.add(handle);
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
