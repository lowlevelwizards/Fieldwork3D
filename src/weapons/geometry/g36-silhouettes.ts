/** G36 P6 — Fieldwork's original full-length G36, interpreted as a
 * deliberate miniature. Do not trace molded manufacture or add micro-steps.
 * Every component is one primary silhouette plus at most one identity cue.
 * This is the actual production builder, not a separate art preview.
 */
import * as THREE from 'three';
import {addOutline,addCuboid,addProfileFrame,
 type Outline,type SlotName} from './profile-primitives.ts';
import {G36_B_ART as A} from './g36-art-layout.ts';
import {G36_B_PART_IDS} from './g36-family-contract.ts';
import {G36_MAG30_OUTLINE,G36_MAG30_DEPTH} from './g36-magazine-profiles.ts';
import {addG36LongHandguard} from './g36-handguard-profiles.ts';

export {G36_B_PART_IDS} from './g36-family-contract.ts';

function area(poly:Outline):number{
 return poly.reduce((sum,p,i)=>{
  const q=poly[(i+1)%poly.length];return sum+p[0]*q[1]-q[0]*p[1];
 },0);
}
function contour(poly:Outline,ccw:boolean):Outline{
 return (area(poly)>0)===ccw?poly:[...poly].reverse();
}
/** Stock silhouette: two deliberate openings, a single descending lower
 * diagonal, a strong horizontal upper bar. No inset frame or cosmetic struts.
 */
function addTwoOpeningStock(root:THREE.Group,material:THREE.Material,n:number):THREE.Mesh{
 const outside:Outline=[
  [-14.69,.50],[-6.43,.50],[-6.43,-2.08],
  [-8.75,-2.35],[-14.69,-5.24]
 ];
 const largeHole:Outline=[
  [-14.00,-.42],[-10.31,-.42],[-9.62,-1.55],
  [-12.12,-4.23],[-14.00,-4.58]
 ];
 const smallHole:Outline=[
  [-9.42,-.40],[-7.13,-.40],[-7.09,-1.72],[-8.60,-1.72]
 ];
 const trace=(poly:Outline,path:THREE.Shape|THREE.Path)=>{
  path.moveTo(poly[0][0],poly[0][1]);
  for(const [x,y] of poly.slice(1))path.lineTo(x,y);
  path.closePath();
 };
 const shape=new THREE.Shape();
 trace(contour(outside,true),shape);
 for(const hole of [largeHole,smallHole]){
  const opening=new THREE.Path();trace(contour(hole,false),opening);
  shape.holes.push(opening);
 }
 const geom=new THREE.ExtrudeGeometry(shape,{
  depth:1.72,steps:1,bevelEnabled:false,curveSegments:1
 });
 geom.translate(0,0,-.86);
 const mesh=new THREE.Mesh(geom,material);
 mesh.name='family-stock-'+G36_B_PART_IDS.stock+'-'+n;
 mesh.castShadow=true;mesh.receiveShadow=true;
 mesh.userData.g36MasterStock=true;
 mesh.userData.g36StockOpeningCount=2;
 root.add(mesh);return mesh;
}
export function buildG36OriginalBlockout(material:THREE.Material):THREE.Group{
 const root=new THREE.Group();
 root.name='g36-p6-fieldwork-interpretive-master';
 const i:Record<SlotName,number>={
  stock:0,receiver:0,grip:0,magazine:0,handguard:0,barrel:0
 };
 const ids=G36_B_PART_IDS;
 const outline=(slot:SlotName,pts:Outline,depth:number)=>
  addOutline(root,slot,ids[slot],i[slot]++,pts,depth,material);
 const box=(slot:SlotName,x:number,y:number,z:number,w:number,h:number,d:number)=>
  addCuboid(root,slot,ids[slot],i[slot]++,x,y,z,w,h,d,material);

 addTwoOpeningStock(root,material,i.stock++);
 const pad=outline('stock',[
  [-15.05,.40],[-14.60,.40],[-14.60,-4.90],[-15.05,-5.12]
 ],1.72);
 pad.userData.g36Buttpad=true;
 const hinge=box('stock',-6.64,-.74,0,.72,2.43,1.80);
 hinge.userData.g36StockHinge=true;

 // Two bold shells: the upper is an almost unbroken polymer slab; the
 // lower is ONE angled magwell/hand junction with a real open trigger gap.
 const upper=outline('receiver',[
  [-6.80,1.36],[3.35,1.36],[4.00,.69],
  [4.00,-1.62],[-6.80,-1.62]
 ],2.50);
 upper.userData.g36ReceiverUpper=true;
 const lower=outline('receiver',[
  [-6.42,-1.13],[3.70,-1.13],[2.85,-3.12],
  [-.45,-3.12],[-1.46,-2.28],[-3.76,-2.28],
  [-4.36,-3.56],[-6.42,-2.14]
 ],2.28);
 lower.userData.g36ReceiverLower=true;
 lower.userData.g36OpenTriggerGap=true;

 // A single large, clean, genuinely hollow integrated carry handle.
 // NO relief chamfers, arbitrary roof segments or decorative cover plates.
 const outside:Outline=[
  [-5.76,1.35],[-5.12,4.05],[5.28,4.05],
  [7.42,2.69],[7.42,1.35]
 ];
 const inside:Outline=[
  [-3.50,1.92],[-3.04,3.13],[5.01,3.13],
  [6.87,2.32],[6.87,1.92]
 ];
 const bridge=addProfileFrame(root,'receiver',ids.receiver,i.receiver++,
  contour(outside,true),contour(inside,false),1.50,material);
 bridge.userData.g36HandleOpening=true;

 // The dual sight is TWO geometric headlines, not a miniature mechanical
 // scope model. Each receives exactly one large dark frontal face.
 const magnified=box('receiver',-3.37,3.35,0,4.95,1.30,1.96);
 magnified.userData.g36LowerOptic=true;
 const reflex=box('receiver',-3.63,4.31,0,2.35,.78,1.78);
 reflex.userData.g36UpperReflex=true;
 const bigLens=box('receiver',-.86,3.57,0,.22,.94,1.16);
 bigLens.userData.g36OpticFace=true;
 const smallLens=box('receiver',-2.41,4.32,0,.22,.70,1.18);
 smallLens.userData.g36UpperReflexWindow=true;

 // Four-sided wedge, no physical trigger-guard frame or micro-controls.
 const grip=outline('grip',[
  [-5.70,-2.12],[-3.39,-2.12],[-4.26,-5.72],[-5.83,-5.72]
 ],2.02);
 grip.userData.g36Grip=true;

 const mag=outline('magazine',G36_MAG30_OUTLINE,G36_MAG30_DEPTH);
 mag.userData.g36Magazine=true;

 const guard=addG36LongHandguard(root,ids.handguard,i.handguard++,material);
 guard.userData.g36LongHandguard=true;

 // One stout barrel and one nearly invisible terminal block.
 const barrel=box('barrel',16.12,0,0,5.90,1.14,1.14);
 barrel.userData.g36Barrel=true;
 const muzzle=box('barrel',A.muzzleX-.25,0,0,.50,1.00,1.00);
 muzzle.userData.g36FactoryMuzzle=true;
 return root;
}

export type G36FactoryMaterials=Readonly<{
 polymer:THREE.Material;steel:THREE.Material;magazine:THREE.Material;
 buttpad:THREE.Material;optic:THREE.Material;muzzle:THREE.Material
}>;
/** One shared finish per meaningful material. No material allocations here. */
export function applyG36FactoryMaterials(root:THREE.Group,finishes:G36FactoryMaterials):void{
 for(const child of root.children){
  if(!(child instanceof THREE.Mesh))continue;
  let result:THREE.Material=finishes.polymer;
  if(child.userData.g36Magazine)result=finishes.magazine;
  else if(child.userData.g36Buttpad)result=finishes.buttpad;
  else if(child.userData.g36FactoryMuzzle)result=finishes.muzzle;
  else if(child.userData.g36Barrel||child.userData.g36StockHinge)result=finishes.steel;
  else if(child.userData.g36OpticFace||child.userData.g36UpperReflexWindow)result=finishes.buttpad;
  else if(child.userData.g36UpperReflex||child.userData.g36LowerOptic)result=finishes.optic;
  child.material=result;
 }
}
