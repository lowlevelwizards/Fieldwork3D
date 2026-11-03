/** Fieldwork body-first armor silhouettes. Full authored shells, not scaled
 * copies of one vest. Positive local X is forward; +/-Z is left/right.
 * All visual only: equipment slots remain the sole protection authority.
 */
import * as THREE from 'three';
import {garmentBoxUV} from './operator-fabric-camo-materials.ts';
import {consolidateVisualGroup} from './operator-visual-mesh-merge.ts';

export type ShapeGroups=Record<string,THREE.Group>;
export type ArmorProfile={front:number;side:number};
export const ARMOR_PROFILES:Readonly<Record<string,ArmorProfile>>={
 'armor-bare':{front:5.2,side:7.15},
 'soft-slick':{front:5.95,side:7.35},
 'soft-paca':{front:6.45,side:7.75},
 'soft-vest':{front:7.17,side:8.10},
 'soft-flak':{front:7.55,side:8.25},
 'plate-slick':{front:7.07,side:7.50},
 'plate-jpc':{front:7.28,side:7.65},
 'plate-standard':{front:7.78,side:8.15},
 'plate-heavy':{front:8.32,side:8.75},
 'plate-legacy':{front:8.35,side:8.85}
};
const box=(g:THREE.Group,m:THREE.Material,x:number,y:number,z:number,
 w:number,h:number,d:number)=>{
 const mesh=new THREE.Mesh(garmentBoxUV(new THREE.BoxGeometry(w,h,d),
  w,h,d,m,x,y,z),m);
 mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;
 g.add(mesh);return mesh;
};
const strap=(g:THREE.Group,m:THREE.Material,
 a:readonly [number,number,number],b:readonly [number,number,number],
 width:number,depth:number)=>{
 const v1=new THREE.Vector3(...a),v2=new THREE.Vector3(...b);
 const delta=v2.clone().sub(v1),length=delta.length();
 const mesh=new THREE.Mesh(garmentBoxUV(
  new THREE.BoxGeometry(width,length,depth),width,length,depth,m),m);
 mesh.position.copy(v1.add(v2).multiplyScalar(.5));
 mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
 mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);return mesh;
};
export function createArmorSilhouettes(chest:THREE.Group,
 armor:THREE.Material,utility:THREE.Material,dark:THREE.Material,
 trim:THREE.Material):ShapeGroups{
 const groups:ShapeGroups={};
 const make=(id:string)=>{
  const g=new THREE.Group();g.name='authored-armor-'+id;
  g.visible=false;chest.add(g);groups[id]=g;return g;
 };
 make('armor-bare');
 {
  const g=make('soft-slick');
  box(g,armor,5.57,-.35,0,.72,10.20,12.85);
  box(g,armor,-5.53,-.35,0,.72,10.20,12.85);
  for(const s of [-1,1])
   box(g,armor,0,-.85,s*6.73,10.75,8.50,.64);
 }
 {
  const g=make('soft-paca');
  box(g,armor,5.90,-.65,0,1.10,11.20,13.35);
  box(g,armor,-5.90,-.65,0,1.10,11.20,13.35);
  for(const s of [-1,1]){
   box(g,armor,0,-.60,s*7.05,11.0,9.10,1.04);
   box(g,utility,6.33,-4.95,s*4.55,.22,1.13,3.20);
  }
 }
 {
  const g=make('soft-vest');
  box(g,armor,6.20,-.40,0,1.93,12.05,13.5);
  box(g,armor,-6.15,-.40,0,1.85,11.6,13.5);
  for(const s of [-1,1]){
   box(g,armor,.10,-.65,s*7.34,11.7,10.05,1.48);
   box(g,armor,1.1,5.48,s*4.70,8.2,1.65,2.25);
  }
  box(g,dark,7.25,2.70,0,.28,1.05,9.4); // broad ID patch
  box(g,trim,7.25,-5.57,0,.18,.47,13.00);
 }
 {
  const g=make('soft-flak');
  box(g,armor,6.25,-1.12,0,2.35,13.6,14.55);
  box(g,armor,-6.20,-1.12,0,2.1,13.2,14.5);
  for(const s of [-1,1]){
   box(g,armor,0,-1.2,s*7.6,11.4,11.4,1.7);
   box(g,armor,.1,5.12,s*4.8,10.7,1.95,3.05);
  }
  box(g,utility,7.50,-.3,0,.26,10.25,1.9);
 }
 {
  const g=make('plate-slick');
  box(g,armor,6.18,0,0,1.78,9.35,10.8);
  box(g,armor,-6.10,0,0,1.70,9.25,10.8);
  for(const s of [-1,1]){
   box(g,armor,-.30,5.12,s*4.32,10.9,.96,1.52);
   box(g,utility,-.15,-2.10,s*6.10,10.2,1.38,1.0);
  }
  box(g,trim,7.10,-4.28,0,.20,.46,9.80);
 }
 {
  const g=make('plate-jpc');
  box(g,armor,6.40,.55,0,1.76,9.10,10.1);
  box(g,armor,-6.35,.55,0,1.72,8.98,10.35);
  box(g,trim,7.35,-3.22,0,.18,.60,9.25);
  for(const s of [-1,1]){
   box(g,utility,-.25,5.05,s*4.10,10.8,.82,1.15);
   // Three separated thin side rails; large gaps identify the light cut.
   for(const y of [-2.8,-1.0,.85])
    box(g,utility,.0,y,s*6.67,9.6,.42,.65);
   box(g,dark,6.38,4.64,s*4.1,.26,1.00,1.5);
  }
 }
 {
  const g=make('plate-standard');
  box(g,armor,6.62,.15,0,2.30,10.60,11.55);
  box(g,armor,-6.52,.15,0,2.22,10.55,11.75);
  for(const s of [-1,1]){
   box(g,armor,.15,5.45,s*4.55,11.4,1.32,1.80);
   box(g,utility,-.15,-1.30,s*7.24,10.9,3.00,1.74);
   box(g,dark,6.80,4.55,s*4.25,.29,.58,2.20);
  }
  box(g,trim,7.86,-4.49,0,.22,.58,10.9);
 }
 {
  const g=make('plate-heavy');
  box(g,armor,6.87,-.55,0,2.87,12.35,13.05);
  box(g,armor,-6.85,-.55,0,2.75,12.25,13.10);
  for(const s of [-1,1]){
   box(g,armor,.1,5.35,s*5.0,12.0,2.20,3.10);
   box(g,armor,.0,-1.55,s*7.87,11.7,5.40,1.75);
   box(g,utility,7.40,-4.80,s*3.65,.65,2.45,4.60);
  }
  box(g,armor,8.4,-6.10,0,.55,2.0,6.1);
 }
 {
  const g=make('plate-legacy');
  // Longer wraparound OTV/IOTV-like shell. Deliberately NOT a big JPC.
  box(g,armor,6.90,-.85,0,2.90,13.8,14.15);
  box(g,armor,-6.80,-.85,0,2.65,13.30,14.25);
  for(const s of [-1,1]){
   box(g,armor,-.10,-1.15,s*7.82,12.0,11.85,2.10);
   box(g,armor,.0,5.65,s*5.25,11.6,2.40,3.30);
   box(g,utility,7.84,-4.1,s*5.05,.43,4.0,2.55);
   box(g,armor,2.40,6.58,s*1.45,4.65,2.3,1.85);
  }
  box(g,utility,8.44,-.5,0,.28,11.30,2.2);
  box(g,trim,8.54,3.38,0,.2,.88,6.65);
 }
 for(const g of Object.values(groups))consolidateVisualGroup(g);
 return groups;
}
