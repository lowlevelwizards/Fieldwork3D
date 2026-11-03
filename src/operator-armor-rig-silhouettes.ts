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
 'soft-slick':{front:5.15,side:6.85},
 'soft-paca':{front:5.3,side:6.95},
 'soft-vest':{front:6.5,side:7.65},
 'soft-flak':{front:6.82,side:8.22},
 'plate-slick':{front:6.74,side:6.99},
 'plate-jpc':{front:6.95,side:7.25},
 'plate-standard':{front:7.28,side:7.83},
 'plate-heavy':{front:7.62,side:8.62},
 'plate-legacy':{front:7.48,side:8.20}
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
/** All parts are placed within the EXISTING chest group's +X-forward frame.
 * The original operator's shirt is 10 deep x 12 tall x 14 wide. Negative
 * space at the neckline, waist and armpits is authored, not painted black.
 * Keep two or three large stepped forms, rather than enormous flat plates.
 */
const frontBag=(g:THREE.Group,m:THREE.Material,faceX:number,
 bottomY:number,lowerH:number,lowerW:number,upperH:number,upperW:number,depth:number)=>{
 // Touching, non-coplanar upper/lower shells; no overlapping front planes.
 const lowerY=bottomY+lowerH*.5;
 const upperY=bottomY+lowerH+upperH*.5;
 box(g,m,faceX-depth*.5,lowerY,0,depth,lowerH,lowerW);
 box(g,m,faceX-depth*.5,upperY,0,depth,upperH,upperW);
};
const wrapPanels=(g:THREE.Group,m:THREE.Material,side:number,
 sideY:number,sideH:number,sideDepth:number)=>{
 // Front and rear wearable surfaces actually connect around the ribs.
 for(const sign of [-1,1])
  box(g,m,-.05,sideY,sign*side,10.65,sideH,sideDepth);
};
const shoulderStraps=(g:THREE.Group,m:THREE.Material,
 z:number,width:number,thickness:number,frontX=5.8,backX=-5.8,
 crown=5.55)=>{
 for(const sign of [-1,1]){
  strap(g,m,[frontX,3.72,sign*z],[1.15,crown,sign*z],width,thickness);
  strap(g,m,[1.15,crown,sign*z],[backX,3.68,sign*z],width,thickness);
 }
};
const splitFront=(g:THREE.Group,m:THREE.Material,
 faceX:number,y:number,h:number,halfW:number,depth:number,
 gap=.22)=>{
 const center=halfW*.5+gap*.5;
 for(const sign of [-1,1])
  box(g,m,faceX-depth*.5,y,sign*center,depth,h,halfW);
};
const collarPieces=(g:THREE.Group,m:THREE.Material,
 tall:number,extent:number)=>{
 // Broad three-part stepped neck guard, open at the throat.
 box(g,m,-4.80,tall,0,1.4,1.30,extent*2+.4);
 for(const sign of [-1,1]){
  box(g,m,-.75,tall-.20,sign*extent,8.85,1.28,1.48);
  box(g,m,4.04,tall-.64,sign*(extent-.35),1.65,.82,1.5);
 }
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

 // Concealed armor is UNDER the blouse (the +X=5.2 fabric face).
 // A visible chest slab would fundamentally contradict this archetype.
 {
  const g=make('soft-slick');
  box(g,armor,4.87,-.34,0,.38,9.30,11.25);
  box(g,armor,-4.88,-.34,0,.38,9.30,11.25);
  for(const sign of [-1,1])
   box(g,armor,0,-1.0,sign*6.68,9.8,6.5,.34);
 }
 // Save compatibility only: retired PACA option no longer appears in UI.
 {
  const g=make('soft-paca');
  box(g,armor,5.0,-.4,0,.55,9.5,11.6);
  box(g,armor,-5.0,-.4,0,.55,9.5,11.6);
  for(const sign of [-1,1])
   box(g,armor,0,-1.0,sign*6.80,10.0,7.0,.45);
 }

 // Police: two long soft front halves, low U-neck, attached shoulder
 // fabric and continuous sides. Unlike plate bags the front is split.
 {
  const g=make('soft-vest');
  splitFront(g,armor,6.48,-.78,9.45,5.95,1.14,.26);
  box(g,armor,-5.86,-.75,0,1.05,9.35,12.6);
  wrapPanels(g,armor,7.15,-1.16,8.55,.95);
  for(const sign of [-1,1]){
   box(g,armor,.30,4.65,sign*4.55,10.85,1.24,2.18);
   box(g,armor,5.90,3.45,sign*4.05,1.03,1.25,3.25);
  }
  // Small authentic zip/identification features, never one fake plate.
  box(g,dark,6.59,-.40,0,.18,7.32,.23);
  box(g,dark,6.61,2.35,-3.53,.15,.92,4.52);
  box(g,trim,6.58,-5.27,0,.16,.35,11.75);
 }
 // Flak: older padded cloth, raised stiff collar, large shoulders,
 // long continuous lower hem. Do not re-use the police neckline.
 {
  const g=make('soft-flak');
  splitFront(g,armor,6.82,-1.25,10.05,6.45,1.42,.18);
  box(g,armor,-6.05,-1.26,0,1.35,10.0,13.55);
  wrapPanels(g,armor,7.57,-1.52,9.55,1.27);
  for(const sign of [-1,1])
   box(g,armor,.20,4.73,sign*5.05,10.9,1.70,2.78);
  collarPieces(g,armor,5.95,2.80);
  box(g,utility,6.87,-1.2,0,.18,7.05,.56);
  for(const sign of [-1,1]){
   // Plain padded pocket flaps, quite unlike modern magazine cells.
   box(g,utility,6.89,1.15,sign*3.54,.17,.59,3.75);
   box(g,armor,6.89,-.58,sign*3.54,.15,2.50,3.55);
  }
 }

 // Slick: two small, short bags with minimal shoulder/elastic sides.
 {
  const g=make('plate-slick');
  frontBag(g,armor,6.74,-4.0,5.50,8.35,2.20,6.75,1.0);
  // Back same stepped shape (reverse face) with compact clean profile.
  frontBag(g,armor,-6.70,-4.0,5.50,8.55,2.20,6.95,1.0);
  shoulderStraps(g,utility,3.25,.92,.62,5.95,-5.95,5.55);
  for(const sign of [-1,1])
   box(g,utility,-.05,-.85,sign*6.72,10.5,1.35,.55);
  box(g,trim,6.84,-3.91,0,.14,.18,6.80);
 }

 // Light: truly OPEN sides; three narrow bands are not a full slab.
 // The separated rails and much stronger shoulder shape do the work.
 {
  const g=make('plate-jpc');
  frontBag(g,armor,6.95,-4.05,5.65,8.7,2.45,6.90,1.1);
  frontBag(g,armor,-6.85,-4.05,5.65,8.8,2.45,6.95,1.0);
  shoulderStraps(g,utility,3.72,1.28,.72,6.10,-6.08,5.96);
  for(const sign of [-1,1]){
   for(const y of [-2.70,-.70,1.32])
    box(g,utility,-.02,y,sign*6.88,10.7,.39,.72);
   box(g,dark,6.99,4.42,sign*3.5,.13,.50,1.4);
  }
  box(g,trim,7.00,-3.95,0,.14,.2,8.24);
 }

 // Standard: medium stepped carrier bag and substantial connected side
 // cummerbund. This is the balance reference for slick/light/heavy.
 {
  const g=make('plate-standard');
  frontBag(g,armor,7.28,-4.58,6.55,9.60,2.70,7.65,1.42);
  frontBag(g,armor,-7.20,-4.58,6.55,9.70,2.70,7.75,1.25);
  shoulderStraps(g,utility,4.05,1.48,.92,6.60,-6.45,6.10);
  wrapPanels(g,utility,7.10,-1.15,2.78,1.42);
  // Three decisive, wider MOLLE bands (not individual micro-holes).
  for(const y of [-2.40,-1.04,.32])
   box(g,utility,7.36,y,0,.13,.30,8.20);
  box(g,trim,7.36,-4.42,0,.13,.30,9.20);
 }

 // Heavy: frontal carrier still stepped, but the side plates and
 // padded shoulders supply the bulk; NO scaled-up square body.
 {
  const g=make('plate-heavy');
  frontBag(g,armor,7.62,-4.95,6.95,10.10,2.65,8.15,1.65);
  frontBag(g,armor,-7.35,-4.95,6.95,10.2,2.65,8.22,1.52);
  shoulderStraps(g,armor,4.42,2.12,1.25,6.7,-6.6,6.26);
  wrapPanels(g,utility,7.45,-1.20,3.4,1.45);
  for(const sign of [-1,1]){
   // Side plates project outward independently of the front bag.
   box(g,armor,.3,-.95,sign*8.04,4.35,4.35,1.08);
   box(g,armor,1.20,5.26,sign*5.15,8.85,1.45,2.1);
  }
  box(g,utility,7.74,-4.78,0,.26,1.04,6.00);
  box(g,dark,7.73,3.68,0,.18,.46,5.35);
 }

 // Legacy: long, two-part wraparound body, large shoulder yoke and
 // raised throat collar. Full coverage rather than giant plate carrier.
 {
  const g=make('plate-legacy');
  splitFront(g,armor,7.48,-1.70,11.50,6.18,1.76,.20);
  box(g,armor,-6.88,-1.57,0,1.63,11.18,13.45);
  wrapPanels(g,armor,7.46,-1.80,10.82,1.48);
  for(const sign of [-1,1])
   box(g,armor,.15,4.89,sign*5.06,11.3,2.05,2.85);
  collarPieces(g,armor,6.05,2.97);
  box(g,utility,7.55,-1.65,0,.22,9.48,1.18);
  for(const sign of [-1,1])
   box(g,utility,7.57,-3.35,sign*4.55,.18,1.68,3.10);
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
 fabric:THREE.Material,pocketFabric:THREE.Material,
 dark:THREE.Material,trim:THREE.Material):ShapeGroups{
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
   pouch(g,pocketFabric,trim,8.74,-2.20,z,3.48,2.45,1.08);
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
   pouch(g,pocketFabric,trim,8.54,-2.58,z,2.42,2.86,.91);
  for(const s of [-1,1])
   pouch(g,pocketFabric,trim,7.75,-2.62,s*4.55,2.40,1.62,.72);
 }
 {
  const g=make('light-rig');
  // Classic X-harness: crossed rear straps and 2+2 broad front pouch banks.
  shoulderHarness(g,dark,4.7);
  strap(g,dark,[-5.90,3.75,-4.5],[-5.9,-3.10,4.50],1.10,.70);
  strap(g,dark,[-5.90,3.75,4.5],[-5.9,-3.10,-4.50],1.10,.70);
  for(const z of [-4.6,-1.5,1.5,4.6])
   pouch(g,pocketFabric,trim,8.38,-2.20,z,4.23,2.85,1.07);
  box(g,dark,7.94,-4.65,0,.48,.70,13.25);
 }
 {
  const g=make('split-front');
  shoulderHarness(g,dark,5.00);
  // Two independent banks with a large, entirely unobstructed center seam.
  for(const s of [-1,1]){
   box(g,fabric,8.12,-1.90,s*4.3,.75,5.85,5.45);
   for(const p of [2.92,5.64])
    pouch(g,pocketFabric,trim,8.77,-2.18,s*p,3.98,2.34,1.08);
   box(g,trim,8.64,-1.95,s*1.35,.37,4.72,.44);
  }
 }
 {
  const g=make('lbv');
  shoulderHarness(g,fabric,5.20);
  for(const s of [-1,1]){
   box(g,fabric,6.75,-1.55,s*5.35,1.14,9.25,3.15);
   for(const y of [1.28,-2.56,-5.35])
    pouch(g,pocketFabric,trim,7.95,y,s*5.05,2.88,3.33,.99);
  }
 }
 {
  const g=make('full-chest');
  shoulderHarness(g,trim,5.02);
  box(g,fabric,8.0,-1.72,0,.78,9.65,12.25);
  for(const z of [-4.60,-1.5,1.5,4.60])
   pouch(g,pocketFabric,trim,8.65,-2.75,z,4.45,2.65,1.07);
  box(g,dark,8.48,2.68,0,.23,1.22,9.25);
 }
 {
  const g=make('field-webbing');
  for(const s of [-1,1]){
   strap(g,trim,[6.40,-5.24,s*5.95],[1.0,5.45,s*4.60],1.10,.90);
   strap(g,trim,[1.0,5.45,s*4.60],[-5.5,-5.4,s*5.95],1.10,.90);
   pouch(g,pocketFabric,trim,3.90,-5.42,s*7.45,4.55,3.12,1.30);
  }
  box(g,trim,3.80,-5.90,0,1.30,1.20,13.40);
 }
 {
  const g=make('belt-harness');
  for(const s of [-1,1]){
   strap(g,dark,[3.75,-5.05,s*6.3],[.05,5.70,s*5.20],1.45,1.04);
   strap(g,dark,[.05,5.70,s*5.20],[-5.10,-4.7,s*6.3],1.36,1.04);
   pouch(g,pocketFabric,trim,3.1,-5.30,s*7.65,5.30,3.40,1.49);
  }
  box(g,dark,3.55,-5.7,0,1.35,1.45,14.15);
 }
 {
  const g=make('chicom-rig');
  shoulderHarness(g,fabric,4.55);
  box(g,fabric,7.95,-2.35,0,.60,5.75,11.65);
  for(const z of [-3.12,0,3.12])
   pouch(g,pocketFabric,trim,8.52,-2.32,z,4.30,2.82,.99);
  for(const s of [-1,1])
   pouch(g,pocketFabric,trim,8.42,-3.38,s*5.65,2.55,1.65,.75);
 }
 {
  const g=make('bandolier');
  strap(g,fabric,[7.0,4.85,5.1],[8.0,-5.05,-5.4],2.25,1.05);
  for(let i=0;i<5;i++){
   const t=i/4,z=3.85-t*7.7,y=3.6-t*7.4;
   pouch(g,pocketFabric,trim,8.20,y,z,2.28,1.42,.72);
  }
 }
 {
  const g=make('sadf-webbing');
  shoulderHarness(g,fabric,5.35);
  for(const s of [-1,1]){
   for(const z of [3.25,6.05])
    pouch(g,pocketFabric,trim,7.78,-2.75,s*z,5.80,2.50,1.35);
   pouch(g,pocketFabric,trim,2.55,-5.72,s*7.8,4.70,2.85,1.65);
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
