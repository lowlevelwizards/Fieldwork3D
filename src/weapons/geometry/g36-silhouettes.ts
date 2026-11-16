/** FT1.9D0: selective major-form exaggeration of the original Bundeswehr G36.
 * One real exterior builder shared by review and intended future production.
 * No gameplay, magazine feed, receiver mechanics, or live Arsenal registration.
 */
import * as THREE from 'three';
import {addOutline,addCuboid,addFacetedTube,addProfileFrame,
 type Outline,type SlotName} from './profile-primitives.ts';
import {G36_B_ART as A} from './g36-art-layout.ts';
import {G36_MAG30_OUTLINE,G36_MAG30_DEPTH} from './g36-magazine-profiles.ts';
import {addG36LongHandguard} from './g36-handguard-profiles.ts';

export const G36_B_PART_IDS=Object.freeze({
 stock:'g36-stock',receiver:'g36-dual-receiver',
 grip:'g36-grip',magazine:'g36-mag30',
 handguard:'g36-handguard-long',barrel:'g36-barrel-480'
});

/** Both stock openings are actual holes in ONE solid molded frame. They
 * grow without adding braces, decorative side-plates or independent bars.
 */
function addTwoOpeningStock(root:THREE.Group,material:THREE.Material,n:number):THREE.Mesh{
 const outer:Outline=[
  [-14.66,.51],[-6.43,.50],[-6.43,-2.02],
  [-8.82,-2.35],[-11.80,-4.00],[-14.66,-4.43]
 ];
 const rear:Outline=[
  [-13.97,-.45],[-10.35,-.45],[-9.75,-1.60],
  [-11.90,-3.28],[-13.97,-3.43]
 ];
 const forward:Outline=[
  [-9.63,-.35],[-7.19,-.35],[-7.12,-1.60],[-8.70,-1.65]
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
  depth:2.18,steps:1,bevelEnabled:false,curveSegments:1
 });
 geometry.translate(0,0,-1.09);
 const mesh=new THREE.Mesh(geometry,material);
 mesh.name='family-stock-'+G36_B_PART_IDS.stock+'-'+n;
 mesh.castShadow=true;mesh.receiveShadow=true;
 mesh.userData.g36StockOpeningCount=2;
 mesh.userData.g36MasterStock=true;
 root.add(mesh);return mesh;
}
export function buildG36OriginalBlockout(material:THREE.Material):THREE.Group{
 const root=new THREE.Group();
 root.name='g36-ft19c-original-major-forms';
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
  [-15.05,.39],[-14.31,.35],[-14.31,-3.96],
  [-14.69,-4.48],[-15.05,-4.32]
 ],2.59);
 pad.userData.g36Buttpad=true;
 const hinge=box('stock',-6.64,-.73,0,.72,2.43,2.64);
 hinge.userData.g36StockHinge=true;

 // Molded receiver: broad crown, asymmetric lower step, decisive descending
 // front and integrated rear grip/magwell shoulders, not a long stamped slab.
 const upper=outline('receiver',[
  [-6.80,.93],[-6.48,1.50],[1.70,1.50],[3.18,1.23],
  [4.00,.86],[4.00,-.91],[3.35,-1.47],
  [.88,-1.76],[-6.80,-1.47]
 ],3.05);
 upper.userData.g36ReceiverUpper=true;
 // Open trigger void is cut from the lower shell itself: no fake black paint.
 const lower=addProfileFrame(root,'receiver',ids.receiver,index.receiver++,[
  [-6.42,-1.12],[3.72,-1.12],[3.54,-2.38],
  [3.02,-3.52],[-.98,-3.52],[-1.25,-2.98],
  [-1.66,-3.59],[-4.38,-3.59],[-6.42,-2.15]
 ],[
  [-3.63,-2.37],[-1.71,-2.37],[-1.59,-2.71],
  [-1.92,-3.13],[-3.61,-3.13]
 ],2.74,material);
 lower.userData.g36ReceiverLower=true;
 lower.userData.g36TriggerVoid=true;

 // Original long bridge, one real cut-out, stronger slanted front leg.
 // Keep the first optical housing inside the rear handle rather than
 // growing a detached tall tower. Upper reflex is short and seated.
 const handle=addProfileFrame(root,'receiver',ids.receiver,index.receiver++,[
  [-5.76,1.34],[-5.08,4.05],[5.30,4.05],
  [7.43,2.71],[7.43,1.24]
 ],[
  [-3.20,1.84],[-2.78,3.42],[4.99,3.42],
  [6.32,2.42],[6.32,1.84]
 ],1.64,material);
 handle.userData.g36HandleOpening=true;
 const lowerOptic=outline('receiver',[
  [-5.94,3.17],[-5.74,3.96],[-1.57,3.96],
  [-1.30,3.61],[-1.75,3.16]
 ],2.08);
 lowerOptic.userData.g36LowerOptic=true;
 const reflex=outline('receiver',[
  [-4.84,3.93],[-4.69,4.70],[-2.87,4.70],
  [-2.65,4.43],[-2.77,3.93]
 ],2.06);
 reflex.userData.g36UpperReflex=true;
 // A single faceted circular front face, oriented down the G36 sight axis.
 // The lens is an art-scale shape cue, not an additional accessory/rail.
 const opticFaceGeo=new THREE.CylinderGeometry(.37,.37,.15,6,1);
 opticFaceGeo.rotateZ(-Math.PI/2);
 const opticFace=new THREE.Mesh(opticFaceGeo,material);
 opticFace.position.set(-1.31,3.57,0);
 opticFace.name='family-receiver-'+ids.receiver+'-'+index.receiver++;
 opticFace.userData.g36OpticFace=true;
 opticFace.castShadow=true;opticFace.receiveShadow=true;
 root.add(opticFace);

 // Raise trigger void readability by shortening the rear-raked grip
 // and aligning its forward root with the lower housing.
 const grip=outline('grip',[
  [-5.51,-2.14],[-3.25,-2.14],[-3.59,-3.04],
  [-4.10,-5.72],[-6.19,-5.72],[-6.32,-5.24]
 ],2.43);
 grip.userData.g36Grip=true;

 // One stock G36 polymer magazine. Curvature, width and floor are carried by
 // the actual outline: no redundant floating rectangular floorplate mesh.
 const mag=outline('magazine',G36_MAG30_OUTLINE,G36_MAG30_DEPTH);
 mag.userData.g36Magazine=true;

 // One sculpted polymer fore-end, broad at the back with tapered shoulder,
 // sloping forward nose and shallow upward swept underside. No vent meshes.
 const guard=addG36LongHandguard(root,ids.handguard,index.handguard++,material);
 guard.userData.g36LongHandguard=true;

 // Preserve full-length G36 bare-barrel rhythm; compact, stout terminal.
 const barrel=addFacetedTube(root,'barrel',ids.barrel,index.barrel++,
  A.barrelStartX,18.78,.55,material);
 barrel.userData.g36Barrel=true;
 const muzzle=addFacetedTube(root,'barrel',ids.barrel,index.barrel++,
  18.65,A.muzzleX,.77,material);
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
  else if(child.userData.g36UpperReflex||child.userData.g36LowerOptic||child.userData.g36OpticFace)material=finishes.optic;
  child.material=material;
 }
}
