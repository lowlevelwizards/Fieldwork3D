/** Fieldwork body-first armor silhouettes. Full authored shells, not scaled
 * copies of one vest. Positive local X is forward; +/-Z is left/right.
 * All visual only: equipment slots remain the sole protection authority.
 */
import * as THREE from 'three';
import {garmentBoxUV} from './operator-fabric-camo-materials.ts';
import {consolidateVisualGroup} from './operator-visual-mesh-merge.ts';
import {fittedShoulderBridge,fittedArmorBag} from './operator-armor-shapes.ts';
import {createAdaptiveArmorSilhouettes,updateAdaptiveArmorFit}
 from './operator-adaptive-armor.ts';
export {updateAdaptiveArmorFit};

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
/** Armor bags retain authored size, but their connectors are rebuilt only
 * when the selected uniform changes. The chest rig below remains independent.
 */
export function createArmorSilhouettes(chest:THREE.Group,
 armor:THREE.Material,utility:THREE.Material,dark:THREE.Material,
 trim:THREE.Material):ShapeGroups{
 return createAdaptiveArmorSilhouettes(chest,armor,utility,dark,trim,
  ARMOR_PROFILES);
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
/** Nested strap groups must NOT be baked into the rig's static mesh.
 * They are deterministically refitted when either uniform or armor changes.
 */
const shoulderHarness=(g:THREE.Group,m:THREE.Material,spread=4.8)=>{
 const harness=new THREE.Group();harness.name='uniform-fitted-rig-harness';
 harness.userData.fitMaterial=m;harness.userData.spread=spread;
 g.add(harness);
 for(const sign of [-1,1]){
  strap(harness,m,[7.30,2.15,sign*spread],
   [1.15,5.52,sign*5.2],1.18,.90);
  strap(harness,m,[1.15,5.52,sign*5.2],
   [-6.0,2.30,sign*4.15],1.17,.90);
 }
};
/** The named rig harness uses the same fitted garment/armor frame as
 * the plate carrier shoulder connections. Only the currently selected
 * rig is rebuilt, and only when the uniform or armor fit changes.
 */
export type FittedRigFrame={
 front:{x:number};back:{x:number};sideRight:{z:number};
 shoulderRight:{z:number};shoulderY:number;rigShiftX:number;
 sideContact?:number;mode?:'carrier-placard'|'external-harness';
};
/** One topology per family: suspension geometry has to explain the load,
 * including in the unarmored rear view. All endpoints use the fitted
 * exterior of the currently equipped garment or armor.
 *
 * RIG-R2: keep these connectors separate from pouch/bag meshes; geometry
 * changes only on an outfit change, never on the animation tick.
 */
export function updateFittedRigHarness(
 groups:ShapeGroups,rig:string,top:string,frame:FittedRigFrame):void{
 const outer=groups[rig];if(!outer)return;
 const harness=outer.getObjectByName('uniform-fitted-rig-harness');
 if(!(harness instanceof THREE.Group))return;
 const key=[rig,top,frame.mode??'legacy',
  frame.front.x,frame.back.x,frame.shoulderY,frame.rigShiftX,
  frame.sideRight.z,frame.shoulderRight.z,frame.sideContact??0]
  .map(x=>typeof x==='number'?x.toFixed(3):x).join('|');
 if(harness.userData.fitKey===key)return;
 const material=harness.userData.fitMaterial as THREE.Material;
 harness.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});
 harness.clear();

 // Positive X faces forward. These coordinates are local to the rig
 // group, which itself receives the fitted X translation. Rear/side
 // anchors are transformed into the same space as the front panel.
 const fx=frame.front.x-frame.rigShiftX;
 const bx=frame.back.x-frame.rigShiftX-.18;
 const sx=1.65-frame.rigShiftX;
 const rx=-1.65-frame.rigShiftX;
 const sy=frame.shoulderY+.18;
 const sh=Math.max(3.35,Math.min(5.15,frame.shoulderRight.z));
 const sideZ=frame.sideRight.z+.04;
 type Pt=readonly [number,number,number];
 const line=(points:readonly Pt[],width:number,depth=.44)=>{
  for(let i=0;i<points.length-1;i++)
   strap(harness,material,points[i],points[i+1],width,depth);
 };
 const across=(x:number,y:number,halfZ:number,width=.75,depth=.38)=>
  line([[x,y,-halfZ],[x,y,halfZ]],width,depth);
 const shoulder=(sign:number,front:Pt,back:Pt,width:number)=>{
  const route:readonly Pt[]=[front,
   [fx+.25,sy-.92,sign*sh],
   [sx,sy,sign*sh],
   [rx,sy,sign*sh],
   back];
  fittedShoulderBridge(harness,material,route,width,.48,1);
 };
 const sideTie=(sign:number,y:number,fromX:number,toX:number,width=.56)=>{
  line([[fromX,y,sign*sideZ],[toX,y,sign*sideZ]],width,.42);
 };

 if(rig==='chest-placard'&&frame.mode==='carrier-placard'){
  // This is a carrier attachment, NOT another standalone chest harness.
  // Two short tabs join the top of the placard to its own upper corners.
  for(const sign of [-1,1])
   line([[8.14,1.0,sign*3.25],[fx+.21,2.05,sign*3.25]],
    .82,.40);
 }else if(rig==='micro-rig'||rig==='chest-placard'){
  const micro=rig==='micro-rig';
  const x=micro?7.90:8.14,z=micro?2.85:3.30;
  const topY=micro?-.84:.35;
  for(const sign of [-1,1])
   shoulder(sign,[x,topY,sign*z],[bx,-.84,sign*3.75],
    micro?.82:.72);
  // Short upper H bridge plus one lower, narrow stabilizing back strap.
  across(bx,-.86,3.75,.78);
  across(bx,-3.24,Math.min(sideZ,4.65),.50);
 }else if(rig==='light-rig'||rig==='chicom-rig'){
  // Real crossed shoulder suspension: shoulders CONTINUE into opposing
  // lower rear attachment points instead of receiving a decorative X.
  const classic=rig==='light-rig',x=classic?8.38:7.95;
  const z=classic?4.42:4.13;
  for(const sign of [-1,1]){
   const topY=classic?.10:.62;
   shoulder(sign,[x,topY,sign*z],[bx,1.13,sign*3.78],
    classic?1.04:.77);
   line([[bx,1.13,sign*3.78],[bx,-3.35,-sign*4.22]],
    classic?1.02:.74,.43);
   sideTie(sign,-3.30,fx+.04,bx,classic?.62:.48);
  }
 }else if(rig==='bandolier'){
  // Unbroken front-right / rear-left diagonal with a shoulder turn and
  // lower flank connection; no second shoulder strap or rear H bridge.
  line([[bx,-4.42,-4.52],[bx,1.12,4.02],
   [rx,sy,4.12],[sx,sy,4.12],
   [fx+.20,2.85,3.18],[fx+.20,-4.25,-4.16],
   [(fx+bx)*.5,-4.37,-sideZ],[bx,-4.42,-4.52]],1.38,.44);
 }else if(rig==='field-webbing'||rig==='belt-harness'){
  // Belt-first: twin front braces, one true rear Y and no chest slab.
  const wide=rig==='belt-harness';
  for(const sign of [-1,1]){
   line([[fx+.08,-5.18,sign*5.70],
    [fx+.12,.90,sign*4.67],[sx,sy,sign*sh],
    [rx,sy,sign*sh],[bx,1.16,sign*3.65],
    [bx,-2.15,0]],wide?1.22:1.02,.54);
  }
  line([[bx,-2.15,0],[bx,-5.22,0]],wide?1.20:1.03,.53);
 }else if(rig==='split-front'){
  // Independent wings joined by an H harness; no continuous back shell.
  for(const sign of [-1,1])
   shoulder(sign,[8.12,1.01,sign*4.75],
    [bx,-1.05,sign*4.55],1.08);
  across(bx,-.58,4.55,1.02);
  across(bx,-3.58,Math.min(sideZ,5.30),.62);
  for(const sign of [-1,1])sideTie(sign,-3.58,fx+.2,bx,.48);
 }else if(rig==='full-chest'){
  // A substantial patrol bib gets a strong rear support yoke, not the
  // split-front's narrow H and not the plate carrier's flat bag.
  for(const sign of [-1,1])
   shoulder(sign,[8.39,2.62,sign*4.65],
    [bx,.46,sign*4.82],1.28);
  box(harness,material,bx-.07,-.76,0,.47,2.05,9.82);
  across(bx,-3.70,Math.min(sideZ,5.36),.69);
 }else if(rig==='lbv'){
  // The rear of a real LBV carries a broad shoulder yoke, two descending
  // panels, and a waist support; the sternum remains open.
  for(const sign of [-1,1]){
   shoulder(sign,[7.82,3.05,sign*3.52],
    [bx,.76,sign*4.85],1.43);
   line([[bx,.72,sign*4.82],[bx,-3.86,sign*5.26]],1.25,.49);
   sideTie(sign,-4.04,fx+.05,bx,.72);
  }
  box(harness,material,bx-.05,.32,0,.48,1.26,10.02);
  across(bx,-4.03,5.26,.92);
 }else if(rig==='sadf-webbing'){
  // Pattern-83 Battle Jacket: broad shoulder support, physical side wrap
  // and TWO visible rear cargo compartments instead of a blank back slab.
  for(const sign of [-1,1]){
   shoulder(sign,[7.78,.88,sign*4.72],
    [bx,.85,sign*4.93],1.20);
   box(harness,material,(fx+bx)*.5,-2.82,
    sign*(sideZ-.18),Math.max(1.1,fx-bx-.18),5.35,.78);
   sideTie(sign,-5.12,fx,bx,.72);
  }
  box(harness,material,bx-.12,-.92,0,.55,1.32,9.74);
  for(const [y,h,w] of [[-2.04,2.14,8.7],[-4.35,1.82,9.32]] as const){
   box(harness,material,bx-.57,y,0,.82,h,w);
   box(harness,material,bx-1.04,y+h*.39,0,.19,.40,w+.12);
  }
 }
 consolidateVisualGroup(harness);
 harness.userData.fitKey=key;
}

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
  // Keep the legacy mode marker for existing wardrobe/UI consumers,
  // but mount the REBUILT fitted harness directly to the rig. Otherwise
  // the placard's carrier tabs would disappear when standalone is hidden.
  const standalone=new THREE.Group();standalone.name='standalone-harness';
  g.add(standalone);
  shoulderHarness(g,dark,4.0);
  // The fitted mesh chooses carrier tabs OR independent shoulder runs.
 }
 {
  const g=make('micro-rig');
  shoulderHarness(g,dark,3.75);
  box(g,fabric,7.90,-2.65,0,.76,3.55,7.30);
  // Two substantial front cells and a small high organizer distinguish
  // the complete micro harness from the flat three-cell carrier placard.
  for(const z of [-1.65,1.65])
   pouch(g,pocketFabric,trim,8.54,-2.58,z,2.62,2.86,.91);
  box(g,trim,8.35,-.70,0,.29,.68,5.20);
  for(const s of [-1,1])
   pouch(g,pocketFabric,trim,7.75,-2.62,s*4.55,2.10,1.62,.72);
 }
 {
  const g=make('light-rig');
  // Classic X-harness: crossed rear straps and 2+2 broad front pouch banks.
  shoulderHarness(g,dark,4.7);
  // The rear X is regenerated at actual armor contact in the fitted harness.
  for(const z of [-4.6,-1.5,1.5,4.6]){
   pouch(g,pocketFabric,trim,8.38,-2.20,z,4.33,2.75,1.07);
   // Four independent closure flaps; never read as one continuous panel.
   box(g,trim,9.02,-.57,z,.23,.51,2.92);
  }
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
  // Only two chunky closure tabs bridge toward the opening. The deep
  // vertical separation and independent banks remain the major silhouette.
  for(const y of [.15,-2.85])
   for(const s of [-1,1])
    box(g,dark,8.66,y,s*1.03,.26,.56,.62);
 }
 {
  const g=make('lbv');
  shoulderHarness(g,fabric,5.20);
  for(const s of [-1,1]){
   // Two real tapered load-bearing vest halves, not side-on slabs.
   // Open sternum stays readable; the broad hems carry the pockets.
   const half=new THREE.Group();half.position.z=s*3.25;g.add(half);
   fittedArmorBag(half,fabric,7.82,1,3.55,-5.80,3.70,.72,.72);
   for(const y of [1.28,-2.56,-5.35])
    pouch(g,pocketFabric,trim,8.12,y,s*4.20,2.88,3.22,.99);
   // Recognizable upper yoke joins the tapered vest panel, without
   // closing the open central sternum.
   box(g,fabric,7.86,2.76,s*3.98,.56,.76,3.18);
  }
 }
 {
  const g=make('full-chest');
  shoulderHarness(g,trim,5.02);
  // One broad polygon with clipped high shoulders; avoids a square slab
  // intersecting raised protective collars on bulkier armor.
  fittedArmorBag(g,fabric,8.39,1,3.10,-6.55,12.25,1.30,.78);
  // A full-bib patrol platform: high admin shelf and lower four-cell
  // storage. The broken horizontal cargo hierarchy reads as fabric,
  // not another monolithic armor plate.
  box(g,trim,8.56,1.22,0,.38,1.40,8.18);
  for(const z of [-4.60,-1.5,1.5,4.60])
   pouch(g,pocketFabric,trim,8.65,-3.05,z,4.25,2.65,1.07);
  for(const sign of [-1,1])
   box(g,pocketFabric,8.55,-.45,sign*5.10,.49,1.28,1.28);
 }
 {
  const g=make('field-webbing');
  const h=new THREE.Group();h.name='uniform-fitted-rig-harness';
  h.userData.fitMaterial=trim;h.userData.spread=5.95;g.add(h);
  for(const sign of [-1,1]){
   strap(h,trim,[6.40,-5.24,sign*5.95],
    [1.0,5.45,sign*4.60],1.10,.90);
   strap(h,trim,[1.0,5.45,sign*4.60],
    [-5.5,-5.4,sign*5.95],1.10,.90);
   // The lower belt and magazine pockets now live on the hip.
  }
 }
 {
  const g=make('belt-harness');
  const h=new THREE.Group();h.name='uniform-fitted-rig-harness';
  h.userData.fitMaterial=dark;h.userData.spread=6.3;g.add(h);
  for(const sign of [-1,1]){
   strap(h,dark,[3.75,-5.05,sign*6.3],
    [.05,5.70,sign*5.20],1.45,1.04);
   strap(h,dark,[.05,5.70,sign*5.20],
    [-5.10,-4.7,sign*6.3],1.36,1.04);
   pouch(g,pocketFabric,trim,3.1,-5.30,sign*7.65,5.30,3.40,1.49);
  }
  box(g,dark,3.55,-5.7,0,1.35,1.45,14.15);
 }
 {
  const g=make('chicom-rig');
  shoulderHarness(g,fabric,4.55);
  box(g,fabric,7.95,-2.35,0,.60,6.12,11.65);
  // Chicom canvas reads by three TALL independent flap pouches and
  // two abbreviated flank pockets, not a modern flat MOLLE array.
  for(const z of [-3.12,0,3.12])
   pouch(g,pocketFabric,trim,8.52,-2.32,z,5.18,2.82,.99);
  for(const s of [-1,1])
   pouch(g,pocketFabric,trim,8.42,-3.46,s*5.65,2.38,1.65,.75);
 }
 {
  const g=make('bandolier');
  const h=new THREE.Group();h.name='uniform-fitted-rig-harness';
  h.userData.fitMaterial=fabric;h.userData.spread=4.8;g.add(h);
  for(let i=0;i<5;i++){
   const t=i/4,z=3.85-t*7.7,y=3.6-t*7.4;
   // Four magazine positions plus a deliberate fifth utility cell.
   pouch(g,pocketFabric,trim,8.20,y,z,2.46,1.64,.72);
  }
 }
 {
  const g=make('sadf-webbing');
  shoulderHarness(g,fabric,5.35);
  for(const s of [-1,1]){
   for(const z of [3.25,6.05])
    pouch(g,pocketFabric,trim,7.78,-2.75,s*z,5.80,2.50,1.35);
   // Differentiate front and flank cargo from the Chicom three-cell
   // apron. Separate rear compartment shapes follow the fitted frame.
   box(g,trim,7.97,.70,s*5.40,.52,1.42,2.34);
   // Broad P83 waist pockets and belt live on the hip.
  }
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
 'lbv':[[-4.20,1.28],[-4.20,-2.56],[4.20,1.28],[4.20,-2.56]],
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
