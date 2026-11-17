/** FT1.9D0: selective major-form exaggeration of the original Bundeswehr G36.
 * One real exterior builder shared by review and intended future production.
 * No gameplay, magazine feed, receiver mechanics, or live Arsenal registration.
 */
import * as THREE from 'three';
import {addOutline,addCuboid,addProfileFrame,
 type Outline,type SlotName} from './profile-primitives.ts';
import {G36_B_ART as A} from './g36-art-layout.ts';
import {G36_B_PART_IDS} from './g36-family-contract.ts';
import {G36_MAG30_OUTLINE,G36_MAG30_DEPTH} from './g36-magazine-profiles.ts';
import {addG36LongHandguard} from './g36-handguard-profiles.ts';

export {G36_B_PART_IDS} from './g36-family-contract.ts';

/** Both stock openings are actual holes in ONE solid molded frame. They
 * grow without adding braces, decorative side-plates or independent bars.
 */
function addTwoOpeningStock(root:THREE.Group,material:THREE.Material,n:number):THREE.Mesh{
 const outer:Outline=[
  [-14.69,.51],[-6.43,.50],[-6.43,-2.04],
  [-8.89,-2.48],[-11.85,-4.47],[-14.69,-5.24]
 ];
 const rear:Outline=[
  [-14.02,-.43],[-10.38,-.43],[-9.70,-1.54],
  [-11.88,-4.17],[-14.02,-4.56]
 ];
 const forward:Outline=[
  [-9.51,-.38],[-7.14,-.38],[-7.08,-1.69],[-8.66,-1.68]
 ];
 const area=(points:Outline)=>points.reduce((v,p,i)=>{
  const q=points[(i+1)%points.length];return v+p[0]*q[1]-q[0]*p[1];
 },0);
 const trace=(points:Outline,shape:THREE.Shape|THREE.Path)=>{
  shape.moveTo(points[0][0],points[0][1]);
  for(const [x,y] of points.slice(1))shape.lineTo(x,y);
  shape.closePath();
 };
 const shape=new THREE.Shape();
 trace(area(outer)<0?[...outer].reverse():outer,shape);
 for(const hole of [rear,forward]){
  const p=new THREE.Path();
  trace(area(hole)>0?[...hole].reverse():hole,p);
  shape.holes.push(p);
 }
 const geometry=new THREE.ExtrudeGeometry(shape,{
  depth:1.78,steps:1,bevelEnabled:false,curveSegments:1
 });
 geometry.translate(0,0,-.89);
 const mesh=new THREE.Mesh(geometry,material);
 mesh.name='family-stock-'+G36_B_PART_IDS.stock+'-'+n;
 mesh.castShadow=true;mesh.receiveShadow=true;
 mesh.userData.g36StockOpeningCount=2;
 mesh.userData.g36MasterStock=true;
 root.add(mesh);return mesh;
}
export function buildG36OriginalBlockout(material:THREE.Material):THREE.Group{
 const root=new THREE.Group();
 root.name='g36-p4-original-essential-forms';
 const index:Record<SlotName,number>={
  stock:0,receiver:0,grip:0,magazine:0,handguard:0,barrel:0
 };
 const ids=G36_B_PART_IDS;
 const outline=(slot:SlotName,points:Outline,depth:number)=>{
  return addOutline(root,slot,ids[slot],index[slot]++,points,depth,material);
 };
 const box=(slot:SlotName,x:number,y:number,z:number,w:number,h:number,d:number)=>{
  return addCuboid(root,slot,ids[slot],index[slot]++,x,y,z,w,h,d,material);
 };

 // A recognizably molded two-hole stock. Slightly heavier heel, thin open
 // interior and shoulder contact at the same original art X=-15.05.
 addTwoOpeningStock(root,material,index.stock++);
 const pad=outline('stock',[
  [-15.05,.39],[-14.57,.34],[-14.57,-4.83],
  [-14.72,-5.27],[-15.05,-5.09]
 ],1.94);
 pad.userData.g36Buttpad=true;
 const hinge=box('stock',-6.64,-.73,0,.72,2.43,2.02);
 hinge.userData.g36StockHinge=true;

 // Molded receiver: broad crown, asymmetric lower step, decisive descending
 // front and integrated rear grip/magwell shoulders, not a long stamped slab.
 const upper=outline('receiver',[
  [-6.80,.91],[-6.43,1.43],[-3.90,1.52],[1.52,1.52],
  [3.06,1.18],[4.00,.76],[4.00,-.91],[3.27,-1.43],
  [.88,-1.68],[-6.80,-1.47]
 ],2.58);
 upper.userData.g36ReceiverUpper=true;
 // Open lower contour deliberately stops above the trigger gap.
 // No lower closing strut and no three-dimensional trigger-guard frame.
 const lower=outline('receiver',[
  [-6.42,-1.12],[3.72,-1.12],[3.48,-2.22],
  [2.75,-3.08],[.55,-3.13],[-.75,-3.13],[-1.32,-2.73],
  [-1.66,-2.37],[-3.63,-2.37],[-4.27,-3.56],
  [-6.42,-2.15]
 ],2.38);
 lower.userData.g36ReceiverLower=true;
 lower.userData.g36OpenTriggerGap=true;

 // Original long bridge, one real cut-out, stronger slanted front leg.
 // Keep the first optical housing inside the rear handle rather than
 // growing a detached tall tower. Upper reflex is short and seated.
 // The frame's inner and outer contours MUST have opposite winding:
 // Three.js otherwise culls the inward-facing extrusion walls on mobile.
 const frameOuter:Outline=[
  [-5.76,1.34],[-5.08,4.05],[5.30,4.05],
  [7.43,2.71],[7.43,1.24]
 ];
 const frameInner:Outline=[
  [-3.56,1.86],[-3.12,3.60],[5.10,3.60],
  [7.12,2.47],[7.12,1.86]
 ];
 const signedArea=(poly:Outline)=>poly.reduce((a,p,i)=>{
  const q=poly[(i+1)%poly.length];return a+p[0]*q[1]-q[0]*p[1];
 },0);
 const contour=(poly:Outline,ccw:boolean):Outline=>
  (signedArea(poly)>0)===ccw?poly:[...poly].reverse();
 const handle=addProfileFrame(root,'receiver',ids.receiver,index.receiver++,
  contour(frameOuter,true),contour(frameInner,false),1.34,material);
 handle.userData.g36HandleOpening=true;
 const lowerOptic=outline('receiver',[
  [-5.88,2.91],[-5.71,4.02],[-1.39,4.02],
  [-.90,3.53],[-1.44,2.91]
 ],1.92);
 lowerOptic.userData.g36LowerOptic=true;
 const reflex=outline('receiver',[
  [-4.87,3.95],[-4.78,4.70],[-2.62,4.70],
  [-2.33,4.40],[-2.45,3.95]
 ],1.92);
 reflex.userData.g36UpperReflex=true;
 // One dark, frontal sight window: recognize the upper reflex from an
 // oblique camera without modeling screws, lens stacks or a mounting rail.
 const reflexWindow=box('receiver',-2.31,4.34,0,.34,.68,1.30);
 reflexWindow.userData.g36UpperReflexWindow=true;
 // A single faceted circular front face, oriented down the G36 sight axis.
 // The lens is an art-scale shape cue, not an additional accessory/rail.
 const opticFaceGeo=new THREE.CylinderGeometry(.49,.49,.19,6,1);
 opticFaceGeo.rotateZ(-Math.PI/2);
 const opticFace=new THREE.Mesh(opticFaceGeo,material);
 opticFace.position.set(-.91,3.57,0);
 opticFace.name='family-receiver-'+ids.receiver+'-'+index.receiver++;
 opticFace.userData.g36OpticFace=true;
 opticFace.castShadow=true;opticFace.receiveShadow=true;
 root.add(opticFace);

 // Raise trigger void readability by shortening the rear-raked grip
 // and aligning its forward root with the lower housing.
 const grip=outline('grip',[
  [-5.51,-2.14],[-3.20,-2.14],[-3.66,-3.18],
  [-4.26,-5.72],[-6.04,-5.72],[-6.20,-5.27]
 ],2.12);
 grip.userData.g36Grip=true;

 // One stock G36 polymer magazine. Curvature, width and floor are carried by
 // the actual outline: no redundant floating rectangular floorplate mesh.
 const mag=outline('magazine',G36_MAG30_OUTLINE,G36_MAG30_DEPTH);
 mag.userData.g36Magazine=true;

 // One sculpted polymer fore-end, broad at the back with tapered shoulder,
 // sloping forward nose and shallow upward swept underside. No vent meshes.
 const guard=addG36LongHandguard(root,ids.handguard,index.handguard++,material);
 guard.userData.g36LongHandguard=true;

 // Stout square silhouette, with a smaller quiet muzzle termination.
 // Keep 12 triangles per part; no cylinder, steps, machining or flash-hider cuts.
 const barrel=box('barrel',16.12,0,0,5.90,1.14,1.14);
 barrel.userData.g36Barrel=true;
 const muzzle=box('barrel',A.muzzleX-.25,0,0,.50,1.00,1.00);
 muzzle.userData.g36FactoryMuzzle=true;
 return root;
}

/** FT1.9D0 shared-finish-only assignment. No mesh rebuild and no new material.
 * Geometry slot ownership remains intact, so future Arsenal material and
 * saved finish handling can use the same single art source.
 */
export type G36FactoryMaterials=Readonly<{
 polymer:THREE.Material;steel:THREE.Material;magazine:THREE.Material;
 buttpad:THREE.Material;optic:THREE.Material;muzzle:THREE.Material
}>;
export function applyG36FactoryMaterials(root:THREE.Group,finishes:G36FactoryMaterials):void{
 for(const child of root.children){
  if(!(child instanceof THREE.Mesh))continue;
  let material:THREE.Material=finishes.polymer;
  if(child.userData.g36Magazine)material=finishes.magazine;
  else if(child.userData.g36Buttpad)material=finishes.buttpad;
  else if(child.userData.g36FactoryMuzzle)material=finishes.muzzle;
  else if(child.userData.g36Barrel||child.userData.g36StockHinge)material=finishes.steel;
  else if(child.userData.g36OpticFace||
   child.userData.g36UpperReflexWindow)material=finishes.buttpad;
  else if(child.userData.g36UpperReflex||child.userData.g36LowerOptic)material=finishes.optic;
  child.material=material;
 }
}
