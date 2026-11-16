/** FT1.9B: one production-intended, original-pattern G36 monochrome blockout.
 * Built only when the lab requests it. This is deliberately NOT a live family
 * dispatcher or a factory preset until approval of actual WebGL contact sheets.
 * No gameplay, ammunition, attachment mounting, or fabrication data.
 */
import * as THREE from 'three';
import {addOutline,addCuboid,addFacetedTube,addProfileFrame,
 type Outline,type SlotName} from './profile-primitives.ts';
import {G36_B_ART as A} from './g36-art-layout.ts';
import {G36_MAG30_OUTLINE,G36_MAG30_DEPTH} from './g36-magazine-profiles.ts';

export const G36_B_PART_IDS=Object.freeze({
 stock:'g36-stock',receiver:'g36-dual-receiver',
 grip:'g36-grip',magazine:'g36-mag30',
 handguard:'g36-handguard-long',barrel:'g36-barrel-480'
});

/** A single extruded polygon with two actual voids: one broad rear stock
 * opening and the forward small web opening. No overlapping black-fill quads.
 */
function addTwoOpeningStock(root:THREE.Group,material:THREE.Material,n:number):THREE.Mesh{
 const outer:Outline=[
  [-14.72,.26],[-6.48,.28],[-6.48,-1.89],
  [-8.90,-2.02],[-11.75,-3.91],[-14.72,-4.48]
 ];
 const rear:Outline=[
  [-13.78,-.51],[-10.31,-.50],[-9.60,-1.73],
  [-11.74,-3.08],[-13.78,-3.43]
 ];
 const forward:Outline=[
  [-9.55,-.45],[-7.31,-.45],[-7.29,-1.42],[-8.62,-1.43]
 ];
 // Three.js expects outer and hole windings to oppose each other.
 const area=(points:Outline)=>points.reduce((v,p,i)=>{
  const q=points[(i+1)%points.length];return v+p[0]*q[1]-q[0]*p[1];
 },0);
 const path=(points:Outline,shape:THREE.Shape|THREE.Path)=>{
  shape.moveTo(points[0][0],points[0][1]);
  for(const [x,y] of points.slice(1))shape.lineTo(x,y);
  shape.closePath();
 };
 const shape=new THREE.Shape();
 const body=area(outer)<0?[...outer].reverse():outer;
 path(body,shape);
 for(const hole of [rear,forward]){
  const inside=area(hole)>0?[...hole].reverse():hole;
  const p=new THREE.Path();path(inside,p);shape.holes.push(p);
 }
 const geometry=new THREE.ExtrudeGeometry(shape,{
  depth:2.04,steps:1,bevelEnabled:false,curveSegments:1
 });
 geometry.translate(0,0,-1.02);
 const mesh=new THREE.Mesh(geometry,material);
 mesh.name='family-stock-'+G36_B_PART_IDS.stock+'-'+n;
 mesh.castShadow=true;mesh.receiveShadow=true;
 mesh.userData.g36StockOpeningCount=shape.holes.length;
 root.add(mesh);return mesh;
}

export function buildG36OriginalBlockout(material:THREE.Material):THREE.Group{
 const root=new THREE.Group();
 root.name='g36-ft19b-original-monochrome-master';
 const index:Record<SlotName,number>={
  stock:0,receiver:0,grip:0,magazine:0,handguard:0,barrel:0
 };
 const ids=G36_B_PART_IDS;
 const outline=(slot:SlotName,points:Outline,depth:number)=>{
  const o=addOutline(root,slot,ids[slot],index[slot]++,points,depth,material);
  return o;
 };
 const box=(slot:SlotName,x:number,y:number,z:number,w:number,h:number,d:number)=>{
  return addCuboid(root,slot,ids[slot],index[slot]++,x,y,z,w,h,d,material);
 };

 // Extended stock silhouette, not a tubular FNC duplicate.
 const stock=addTwoOpeningStock(root,material,index.stock++);
 stock.userData.g36MasterStock=true;
 const pad=box('stock',-14.77,-2.10,0,.56,4.85,2.64);
 pad.userData.g36Buttpad=true; // rear exactly -15.05
 const hinge=box('stock',-6.64,-.73,0,.72,2.43,2.66);
 hinge.userData.g36StockHinge=true;

 // Continuous broad polymer upper with a lowered nose into the handguard.
 const upper=outline('receiver',[
  [-6.80,1.10],[-6.40,1.50],[2.90,1.50],[4.00,1.12],
  [4.00,-1.22],[2.70,-1.66],[-6.80,-1.50]
 ],2.94);
 upper.userData.g36ReceiverUpper=true;
 const lower=outline('receiver',[
  [-6.43,-1.12],[3.72,-1.12],[3.40,-3.35],
  [-1.39,-3.35],[-1.87,-2.20],[-6.43,-2.18]
 ],2.72);
 lower.userData.g36ReceiverLower=true;

 // Tall original dual-optic carrier. Model its open center as real geometry.
 const handle=addProfileFrame(root,'receiver',ids.receiver,index.receiver++,[
  [-5.80,1.32],[-5.23,3.93],[5.55,3.93],[7.70,2.64],[7.70,1.29]
 ],[
  [-3.55,2.13],[-3.15,3.18],[5.14,3.18],[6.49,2.33],[6.49,2.03]
 ],1.60,material);
 handle.userData.g36HandleOpening=true;
 // Two stacked optics as only two convincing major volumes in the blockout.
 const lowerOptic=box('receiver',-3.75,3.39,0,3.64,1.18,1.87);
 lowerOptic.userData.g36LowerOptic=true;
 const reflex=box('receiver',-4.06,4.95,0,2.81,1.30,2.13);
 reflex.userData.g36UpperReflex=true;
 // Short hood is a large direction cue; detail optics/lenses deferred.
 const hood=box('receiver',-2.65,5.06,0,.36,.98,2.31);
 hood.userData.g36OpticHood=true;

 // Short, raked rear grip; no modelled internal trigger mechanism.
 const grip=outline('grip',[
  [-5.38,-2.11],[-2.95,-2.11],[-4.40,-6.50],[-6.58,-6.50]
 ],2.29);
 grip.userData.g36Grip=true;

 // G36 magazine independent from shared AR/HK/STANAG silhouettes.
 const mag=outline('magazine',G36_MAG30_OUTLINE,G36_MAG30_DEPTH);
 mag.userData.g36Magazine=true;
 const baseplate=box('magazine',1.27,-7.93,0,3.54,.28,2.15);
 baseplate.userData.g36MagazineBase=true;

 // One broad original-pattern fore-end. Surface vents belong to later stages.
 const guard=outline('handguard',[
  [3.75,1.19],[4.15,1.39],[12.80,1.39],[13.45,.80],
  [13.45,-1.70],[12.86,-2.13],[4.14,-2.13],[3.75,-1.55]
 ],3.16);
 guard.userData.g36LongHandguard=true;

 // Factory exterior front; barrel overlaps rear furniture and muzzle.
 const barrel=addFacetedTube(root,'barrel',ids.barrel,index.barrel++,
  A.barrelStartX,18.34,.56,material);
 barrel.userData.g36Barrel=true;
 const muzzle=addFacetedTube(root,'barrel',ids.barrel,index.barrel++,
  18.21,A.muzzleX,.71,material);
 muzzle.userData.g36FactoryMuzzle=true;
 return root;
}
