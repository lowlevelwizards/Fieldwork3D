/** R5G: M1956 canvas pistol belt with actual H-suspender system on torso.
 * Pouches are empty visual containers; real magazines come from equipment ledger.
 */
import * as THREE from 'three';
import {garmentBoxUV} from './operator-fabric-camo-materials.ts';
import type {M1956Variant} from './operator-m1956-policy.ts';
export type M1956Waist={
 root:THREE.Group;casesEarly:THREE.Group;casesLate:THREE.Group;
 canteenLeft:THREE.Group;canteenRight:THREE.Group;aid:THREE.Group;
 packEarly:THREE.Group;packLate:THREE.Group;variant:M1956Variant;
};
function box(parent:THREE.Group,mat:THREE.Material,
 x:number,y:number,z:number,w:number,h:number,d:number,name:string){
 const geo=garmentBoxUV(new THREE.BoxGeometry(w,h,d),w,h,d,mat,x,y,z);
 const mesh=new THREE.Mesh(geo,mat);
 mesh.name=name;mesh.position.set(x,y,z);
 mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);
}
function group(parent:THREE.Group,name:string){
 const g=new THREE.Group();g.name=name;parent.add(g);return g;
}
export function createM1956Waist(hip:THREE.Group,canvas:THREE.Material,
 pouch:THREE.Material,webbing:THREE.Material,hardware:THREE.Material):M1956Waist{
 const root=new THREE.Group();root.name='m1956-canvas-pistol-belt';
 root.visible=false;hip.add(root);
 box(root,webbing,4.55,0,0,1.25,1.70,13.20,'M56-front-pistol-belt');
 box(root,webbing,-4.55,0,0,1.25,1.70,13.20,'M56-rear-pistol-belt');
 for(const side of [-1,1])
  box(root,webbing,0,0,side*6.35,9.20,1.70,1.15,'M56-side-pistol-belt');
 box(root,hardware,5.24,0,0,.40,1.30,1.75,'M56-closed-belt-buckle');
 const casesEarly=group(root,'m1956-early-universal-cases');
 const casesLate=group(root,'m1956-late-rectangular-cases');
 for(const side of [-1,1]){
  const z=side*7.06;
  box(casesEarly,pouch,2.07,-.17,z,3.20,4.02,3.10,'early-universal-case');
  box(casesEarly,canvas,3.77,1.16,z,.48,1.45,3.28,'early-large-flap');
  box(casesEarly,webbing,4.05,.36,z,.32,1.15,.72,'early-toggle');
  box(casesLate,pouch,2.05,-.18,z,3.12,3.67,2.82,'late-ammunition-case');
  box(casesLate,canvas,3.71,1.11,z,.46,1.25,2.99,'late-closure-flap');
  box(casesLate,webbing,3.98,.41,z,.32,.95,.72,'late-fastener');
 }
 const canteenLeft=group(root,'m1956-canteen-left');
 const canteenRight=group(root,'m1956-canteen-right');
 for(const [side,g] of [[-1,canteenLeft],[1,canteenRight]] as const){
  box(g,canvas,-2.68,-.56,side*7.12,3.25,4.32,3.10,'canvas-canteen-cover');
  box(g,pouch,-.94,1.02,side*7.12,.46,1.34,3.32,'canteen-cloth-lid');
  box(g,hardware,-2.55,1.79,side*7.12,1.30,.62,1.30,'canteen-cap-peek');
 }
 const aid=group(root,'m1956-compact-first-aid-case');
 box(aid,pouch,.05,.20,-7.15,1.75,2.10,1.85,'first-aid-square');
 box(aid,canvas,1.01,.83,-7.15,.32,.84,1.98,'first-aid-flap');
 const packEarly=group(root,'m1956-early-butt-pack');
 box(packEarly,canvas,-5.44,-.60,0,2.45,4.65,6.50,'early-field-pack-main');
 box(packEarly,pouch,-6.73,1.15,0,.46,1.32,6.70,'early-pack-flap');
 const packLate=group(root,'m1956-later-field-pack');
 box(packLate,canvas,-5.43,-.68,0,2.65,4.30,6.85,'late-field-pack-main');
 box(packLate,pouch,-6.83,.95,0,.48,1.24,7.08,'late-pack-cover');
 for(const g of [packEarly,packLate])
  for(const sign of [-1,1])
   box(g,webbing,-7.08,-.35,sign*2.0,.36,2.15,.43,'canvas-pack-closure');
 // Keep the two or three source parts per section distinct: mixed clothing UV
 // attributes can make BufferGeometryUtils refuse a merge on some variants.
 // Each visibility group is small, built once, and never updated per frame.
 const v:M1956Waist={root,casesEarly,casesLate,canteenLeft,canteenRight,aid,
  packEarly,packLate,variant:'late'};
 updateM1956Variant(v,'late');return v;
}
export function updateM1956Variant(v:M1956Waist,variant:M1956Variant){
 v.variant=variant;
 v.casesEarly.visible=variant==='early';
 v.casesLate.visible=variant!=='early';
 v.canteenLeft.visible=true;
 v.canteenRight.visible=variant!=='light';
 v.aid.visible=variant!=='light';
 v.packEarly.visible=variant==='early';
 v.packLate.visible=variant==='late';
}
