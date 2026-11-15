/** FN FNC P4 silhouette source shared by Arsenal, Workbench and operators.
 * Fieldwork art: five deliberate masses, two open stock members, continuous
 * fluted forearm, compact protected sights and minimal attached micro-parts.
 * No trigger guard: other approved Fieldwork rifles intentionally omit it.
 * +X muzzle, +Y up, +Z right. Geometry constructed only when a model changes.
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
 material:THREE.Material,finishes:FNCArtFinishes={},showFactoryMuzzle=true
):THREE.Group{
 const root=new THREE.Group();
 root.name='fnc-p4-fieldwork-exterior';
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
  const mesh=addBar(root,'stock','fnc-p4-stock',ids.stock++,
   a,end,width,1.04,mat(role));
  mesh.userData.fncStockRail=true;
  return mesh;
 };
 const aperture=(slot:SlotName,name:string,
   outer:readonly (readonly [number,number])[],
   inner:readonly (readonly [number,number])[],
   depth:number,role:Finish='steel')=>{
  const shape=new THREE.Shape();
  shape.moveTo(outer[0][0],outer[0][1]);
  for(let i=1;i<outer.length;i++)shape.lineTo(outer[i][0],outer[i][1]);
  shape.closePath();
  const opening=new THREE.Path();
  // Trace an opposite winding to form a real negative-space opening.
  opening.moveTo(inner[0][0],inner[0][1]);
  for(let i=1;i<inner.length;i++)opening.lineTo(inner[i][0],inner[i][1]);
  opening.closePath();shape.holes.push(opening);
  const geometry=new THREE.ExtrudeGeometry(shape,{
   depth,bevelEnabled:false,steps:1,curveSegments:1
  });
  geometry.translate(0,0,-depth/2);
  const mesh=new THREE.Mesh(geometry,mat(role));
  mesh.name='family-'+slot+'-fnc-p4-'+name+'-'+ids[slot]++;
  mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
  return mesh;
 };
 // The insulated top tube and its metal portion now own DISJOINT lengths.
 // P2 drew the entire metal rail under a larger sleeve: equal-depth faces
 // shimmered in side views. Both terminate at x=-9.46 without overlap.
 rail([-6.45,.03],[-9.46,.01],.69);
 // One stout, gently kinked lower member; NO flat triangular panel.
 const lowerRail=p('stock',[
  [-6.48,-1.34],[-8.88,-1.61],[-14.12,-2.75],
  [-14.12,-3.45],[-8.90,-2.33],[-6.48,-2.02]
 ],1.12,'stock');
 lowerRail.userData.fncStockRail=true;
 lowerRail.userData.fncKinkedLowerRail=true;
 const hinge=p('stock',[
  [-6.94,.29],[-6.05,.29],[-6.02,-1.83],[-6.94,-1.83]
 ],1.66,'stock');
 hinge.userData.fncStockHinge=true;
 const pad=p('stock',[
  [-14.85,.36],[-14.03,.36],[-13.99,-3.36],
  [-14.32,-3.56],[-14.85,-3.56]
 ],1.96,'stock');
 pad.userData.fncButtPlate=true;
 const cheek=rail([-9.46,.01],[-14.03,-.04],1.04,'cheek');
 cheek.userData.fncStockRail=false;
 cheek.userData.fncCheekSleeve=true;
 cheek.userData.fncNoCoplanarRail=true;

 // One integrated stepped stamped upper: no redundant roof-cover plate.
 // Flat top, punched shoulder, angular transition into FN front furniture.
 const upper=p('receiver',[
  [-6.38,-.99],[-6.38,1.13],[-5.59,1.58],
  [1.85,1.58],[2.80,1.26],[3.32,.58],[4.12,.10],
  [4.12,-.99]
 ],2.80,'steel');
 upper.userData.fncFlatStampedUpper=true;
 // Integrate the magwell lip into the lower instead of stacking two almost
 // coplanar full-width extrusions. Broad steel lower edge remains readable.
 const lower=p('receiver',[
  [-6.30,-1.00],[3.76,-1.00],[3.60,-2.30],
  [3.06,-3.06],[.18,-3.06],[-.40,-2.70],
  [-1.30,-2.35],[-6.30,-2.35]
 ],2.98,'lower');
 lower.userData.fncAngularLower=true;
 lower.userData.fncMagwellLip=true;

 // A substantial lower heel and one bold rearward rake, not a wafer wedge.
 const grip=p('grip',[
  [-5.36,-2.26],[-3.47,-2.26],[-3.65,-2.68],
  [-4.74,-5.72],[-6.58,-5.88],[-6.79,-5.59]
 ],2.18,'grip');
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

 // A single sculpted, fluted handguard, with three clean front vents
 // IN the same silhouette. No raised crown, floating vent box or collar.
 addFNCFacetedForearm(root,mat('handguard'));
 addFNCForearmMarks(root,mat('shadow'));
 // Retain corrected P1B barrel diameter and overall muzzle/stock datums.
 const barrel=b('barrel',showFactoryMuzzle?16.33:16.67,0,0,
  showFactoryMuzzle?5.35:5.66,.96,.96,'barrel');
 barrel.userData.fncServiceBarrel=true;
 if(showFactoryMuzzle){
  // One recognizable six-sided end, not layered collars and slots.
  const geometry=new THREE.CylinderGeometry(.65,.65,1.20,6,1);
  geometry.rotateZ(Math.PI/2);
  const muzzle=new THREE.Mesh(geometry,mat('muzzle'));
  muzzle.position.x=18.90;
  muzzle.name='family-barrel-fnc-p4-simple-muzzle-'+ids.barrel++;
  muzzle.userData.fncMuzzle=true;
  muzzle.userData.fncP4SingleMuzzle=true;
  muzzle.castShadow=true;muzzle.receiveShadow=true;
  root.add(muzzle);
 }
 // One integrated gas/sight seat replaces multiple little boxes.
 const front=p('barrel',[
  [13.93,-.20],[14.14,.83],[14.53,1.11],
  [15.71,1.11],[15.71,-.20]
 ],1.67,'steel');
 front.userData.fncFrontSightBase=true;
 front.userData.fncP4IntegratedGasSeat=true;
 const sight=aperture('barrel','front-guard',
  [[14.79,1.12],[14.83,2.15],[15.04,2.44],
   [15.34,2.44],[15.56,2.15],[15.60,1.12]],
  [[14.98,1.54],[15.09,2.09],[15.28,2.09],[15.40,1.54]],
  .69);
 sight.userData.fncProtectedFrontSight=true;
 // Low, thick U-profile rear guard: compact negative space, not twin pegs.
 const rear=aperture('receiver','rear-guard',
  [[-5.36,1.52],[-5.29,2.13],[-4.56,2.13],[-4.48,1.52]],
  [[-5.14,1.64],[-5.08,1.97],[-4.74,1.97],[-4.70,1.64]],
  .88);
 rear.userData.fncRearAperture=true;
 rear.userData.fncProtectedRearSight=true;

 // Asymmetric: right-side port/cover and charging handle, left selector.
 // Protruding parts overlap the RECEIVER body rather than float beside it.
 const port=b('receiver',2.09,.33,1.45,1.87,.50,.15,'shadow');
 port.userData.fncRightPort=true;
 port.castShadow=false;port.receiveShadow=false;
 // No separate lip: a second bright rectangle drew attention away from
 // the stamped receiver silhouette. The broad port itself is enough.
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
