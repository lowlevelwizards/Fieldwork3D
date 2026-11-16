/** FT1.9C: selective major-form exaggeration of the original Bundeswehr G36.
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
  [-14.66,.36],[-6.43,.35],[-6.43,-2.02],
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
 const pad=box('stock',-14.665,-2.00,0,.77,4.82,2.59);
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
  [-6.42,-1.12],[3.72,-1.12],[3.37,-3.35],
  [-1.12,-3.35],[-1.48,-3.60],[-4.30,-3.60],[-6.42,-2.15]
 ],[
  [-3.10,-2.45],[-1.72,-2.45],[-1.64,-3.02],[-3.16,-3.08]
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
  [-5.72,3.18],[-5.49,3.99],[-2.22,3.99],
  [-1.95,3.61],[-2.30,3.12]
 ],2.08);
 lowerOptic.userData.g36LowerOptic=true;
 const reflex=outline('receiver',[
  [-5.38,3.92],[-5.16,4.78],[-2.67,4.78],
  [-2.39,4.48],[-2.61,3.92]
 ],2.12);
 reflex.userData.g36UpperReflex=true;

 // Raise trigger void readability by shortening the rear-raked grip
 // and aligning its forward root with the lower housing.
 const grip=outline('grip',[
  [-5.47,-2.14],[-3.14,-2.14],[-4.08,-5.72],
  [-6.08,-5.72]
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
