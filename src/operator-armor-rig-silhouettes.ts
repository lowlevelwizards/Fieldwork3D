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

/** Rig archetypes attach over the selected armor surface via an independent
 * front mount offset. Strap geometry remains blocky, not a decal. Pockets
 * are EMPTY visual carriers; the equipment ledger owns actual magazines.
 */
export const RIG_FRONT_PROFILES:Readonly<Record<string,{front:number;low:number}>>={
 'no-rig':{front:0,low:0},
 'chest-placard':{front:9.25,low:-2.0},
 'micro-rig':{front:9.16,low:-2.0},
 'light-rig':{front:9.12,low:-1.8},
 'split-front':{front:9.25,low:-2.0},
 'field-webbing':{front:8.45,low:-4.35},
 'lbv':{front:8.95,low:-2.35},
 'full-chest':{front:9.16,low:-2.25},
 'belt-harness':{front:8.35,low:-4.5},
 'chicom-rig':{front:9.00,low:-2.0},
 'bandolier':{front:8.90,low:-2.0},
 'sadf-webbing':{front:8.65,low:-4.0}
};
const pouch=(g:THREE.Group,m:THREE.Material,fold:THREE.Material,
 x:number,y:number,z:number,h:number,d:number,depth=1.10)=>{
 box(g,m,x,y,z,depth,h,d);
 box(g,fold,x+depth*.51+.035,y+h*.39,z,.19,.40,d+.12);
};
const shoulderHarness=(g:THREE.Group,m:THREE.Material,spread=4.8)=>{
 for(const s of [-1,1]){
  strap(g,m,[7.30,2.15,s*spread],[1.15,5.52,s*5.2],1.18,.90);
  strap(g,m,[1.15,5.52,s*5.2],[-6.0,2.30,s*4.15],1.17,.90);
 }
};
export function createChestRigSilhouettes(chest:THREE.Group,
 fabric:THREE.Material,dark:THREE.Material,trim:THREE.Material):ShapeGroups{
 const groups:ShapeGroups={};
 const make=(id:string)=>{
  const g=new THREE.Group();g.name='authored-rig-'+id;
  g.visible=false;chest.add(g);groups[id]=g;return g;
 };
 make('no-rig');
 {
  const g=make('chest-placard');
  box(g,fabric,8.14,-2.05,0,.70,4.75,8.45);
  for(const z of [-2.73,0,2.73])
   pouch(g,fabric,trim,8.74,-2.20,z,3.48,2.45,1.08);
  for(const s of [-1,1])
   box(g,dark,7.95,1.2,s*3.65,.40,2.65,.90);
  // Standalone harness is present ONLY without an outer carrier.
  // A nested group remains toggleable after consolidating the placard body.
  const harness=new THREE.Group();harness.name='standalone-harness';
  g.add(harness);
  shoulderHarness(harness,dark,4.0);
  box(harness,dark,-6.15,-1.0,0,.48,1.0,9.15);
  consolidateVisualGroup(harness);
 }
 {
  const g=make('micro-rig');
  shoulderHarness(g,dark,3.75);
  box(g,fabric,7.90,-2.65,0,.76,3.55,7.30);
  for(const z of [-1.65,1.65])
   pouch(g,fabric,trim,8.54,-2.58,z,2.42,2.86,.91);
  for(const s of [-1,1])
   pouch(g,fabric,trim,7.75,-2.62,s*4.55,2.40,1.62,.72);
 }
 {
  const g=make('light-rig');
  // Classic X-harness: crossed rear straps and 2+2 broad front pouch banks.
  shoulderHarness(g,dark,4.7);
  strap(g,dark,[-5.90,3.75,-4.5],[-5.9,-3.10,4.50],1.10,.70);
  strap(g,dark,[-5.90,3.75,4.5],[-5.9,-3.10,-4.50],1.10,.70);
  for(const z of [-4.6,-1.5,1.5,4.6])
   pouch(g,fabric,trim,8.38,-2.20,z,4.23,2.85,1.07);
  box(g,dark,7.94,-4.65,0,.48,.70,13.25);
 }
 {
  const g=make('split-front');
  shoulderHarness(g,dark,5.00);
  // Two independent banks with a large, entirely unobstructed center seam.
  for(const s of [-1,1]){
   box(g,fabric,8.12,-1.90,s*4.3,.75,5.85,5.45);
   for(const p of [2.92,5.64])
    pouch(g,fabric,trim,8.77,-2.18,s*p,3.98,2.34,1.08);
   box(g,trim,8.64,-1.95,s*1.35,.37,4.72,.44);
  }
 }
 {
  const g=make('lbv');
  shoulderHarness(g,fabric,5.20);
  for(const s of [-1,1]){
   box(g,fabric,6.75,-1.55,s*5.35,1.14,9.25,3.15);
   for(const y of [1.28,-2.56,-5.35])
    pouch(g,fabric,trim,7.95,y,s*5.05,2.88,3.33,.99);
  }
 }
 {
  const g=make('full-chest');
  shoulderHarness(g,trim,5.02);
  box(g,fabric,8.0,-1.72,0,.78,9.65,12.25);
  for(const z of [-4.60,-1.5,1.5,4.60])
   pouch(g,fabric,trim,8.65,-2.75,z,4.45,2.65,1.07);
  box(g,dark,8.48,2.68,0,.23,1.22,9.25);
 }
 {
  const g=make('field-webbing');
  for(const s of [-1,1]){
   strap(g,trim,[6.40,-5.24,s*5.95],[1.0,5.45,s*4.60],1.10,.90);
   strap(g,trim,[1.0,5.45,s*4.60],[-5.5,-5.4,s*5.95],1.10,.90);
   pouch(g,fabric,trim,3.90,-5.42,s*7.45,4.55,3.12,1.30);
  }
  box(g,trim,3.80,-5.90,0,1.30,1.20,13.40);
 }
 {
  const g=make('belt-harness');
  for(const s of [-1,1]){
   strap(g,dark,[3.75,-5.05,s*6.3],[.05,5.70,s*5.20],1.45,1.04);
   strap(g,dark,[.05,5.70,s*5.20],[-5.10,-4.7,s*6.3],1.36,1.04);
   pouch(g,fabric,trim,3.1,-5.30,s*7.65,5.30,3.40,1.49);
  }
  box(g,dark,3.55,-5.7,0,1.35,1.45,14.15);
 }
 {
  const g=make('chicom-rig');
  shoulderHarness(g,fabric,4.55);
  box(g,fabric,7.95,-2.35,0,.60,5.75,11.65);
  for(const z of [-3.12,0,3.12])
   pouch(g,fabric,trim,8.52,-2.32,z,4.30,2.82,.99);
  for(const s of [-1,1])
   pouch(g,fabric,trim,8.42,-3.38,s*5.65,2.55,1.65,.75);
 }
 {
  const g=make('bandolier');
  strap(g,fabric,[7.0,4.85,5.1],[8.0,-5.05,-5.4],2.25,1.05);
  for(let i=0;i<5;i++){
   const t=i/4,z=3.85-t*7.7,y=3.6-t*7.4;
   pouch(g,fabric,trim,8.20,y,z,2.28,1.42,.72);
  }
 }
 {
  const g=make('sadf-webbing');
  shoulderHarness(g,fabric,5.35);
  for(const s of [-1,1]){
   for(const z of [3.25,6.05])
    pouch(g,fabric,trim,7.78,-2.75,s*z,5.80,2.50,1.35);
   pouch(g,fabric,trim,2.55,-5.72,s*7.8,4.70,2.85,1.65);
  }
  box(g,dark,7.20,-5.65,0,.72,1.15,12.15);
 }
 for(const g of Object.values(groups))consolidateVisualGroup(g);
 return groups;
}

/** Grounded visual sockets for real magazine instances. Indices are the
 * authoritative magazines carried by the equipment ledger; these sockets
 * do not create magazines, capacity or physical protection.
 */
export type RigMagazineSocket={x:number;y:number;z:number;rotation:number};
type FrontCell=readonly [number,number]; // lateral offset, vertical center
const RIG_CELLS:Readonly<Record<string,readonly FrontCell[]>>={
 'chest-placard':[[-2.73,-2.18],[0,-2.18],[2.73,-2.18]],
 'micro-rig':[[-1.65,-2.58],[1.65,-2.58]],
 'light-rig':[[-4.60,-2.20],[-1.50,-2.20],[1.50,-2.20],[4.60,-2.20]],
 'split-front':[[-5.64,-2.18],[-2.92,-2.18],[2.92,-2.18],[5.64,-2.18]],
 'chicom-rig':[[-3.12,-2.32],[0,-2.32],[3.12,-2.32]],
 'bandolier':[[3.85,3.6],[1.93,1.75],[0,-.1],[-1.93,-1.95]],
 'full-chest':[[-4.60,-2.75],[-1.50,-2.75],[1.50,-2.75],[4.60,-2.75]],
 'lbv':[[-5.10,1.28],[-5.10,-2.56],[5.10,1.28],[5.10,-2.56]],
 'field-webbing':[[-6.8,-5.40],[6.8,-5.40]],
 'belt-harness':[[-6.6,-5.3],[6.6,-5.3]],
 'sadf-webbing':[[-5.85,-2.75],[-3.25,-2.75],[3.25,-2.75],[5.85,-2.75]]
};
export function rigMagazineMount(style:string,index:number,armor:string,
 mirror=1):RigMagazineSocket{
 const profile=ARMOR_PROFILES[armor]??ARMOR_PROFILES['armor-bare'];
 const rig=RIG_FRONT_PROFILES[style]??RIG_FRONT_PROFILES['light-rig'];
 const delta=profile.front-ARMOR_PROFILES['plate-standard'].front;
 const cells=RIG_CELLS[style]??RIG_CELLS['light-rig'];
 if(index<cells.length){
  const [z,y]=cells[index];
  return {x:rig.front+delta,y,z:mirror*z,rotation:0};
 }
 // Any remaining actual carried magazines use a distinct side socket
 // instead of projecting an imaginary second row across the front plate.
 const sideIndex=index-cells.length;
 const sign=(sideIndex%2===0?1:-1)*mirror;
 return {x:sideIndex>=2?-2.35:1.25,
  y:rig.low-.3, z:sign*(profile.side+.35),
  rotation:sign*Math.PI/2};
}
