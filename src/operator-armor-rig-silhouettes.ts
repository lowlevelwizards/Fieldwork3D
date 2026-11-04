/** Fieldwork body-first armor silhouettes. Full authored shells, not scaled
 * copies of one vest. Positive local X is forward; +/-Z is left/right.
 * All visual only: equipment slots remain the sole protection authority.
 */
import * as THREE from 'three';
import {garmentBoxUV} from './operator-fabric-camo-materials.ts';
import {garmentContactAnchor} from './operator-garment-contact-surface.ts';
import {consolidateVisualGroup} from './operator-visual-mesh-merge.ts';
import {fittedShoulderBridge,fittedFlatSurfaceBand,fittedArmorBag,fittedSideWrap} from './operator-armor-shapes.ts';
import {rigVisualBudget} from './operator-rig-visual-standards.ts';
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
/** Construction profiles use a handful of BIG symbolic parts, not generic
 * anonymous gray-green boxes. Actual magazine instances remain inventory-owned.
 */
export type RigPocketConstruction='open-elastic'|'bungee'|'canvas-toggle'|
 'flap-snap'|'utility-buckle'|'double-stack'|'diagonal'|'plce-cover';
export const RIG_POCKET_CONSTRUCTION:Readonly<Record<string,RigPocketConstruction>>={
 'chest-placard':'open-elastic','micro-rig':'bungee',
 'light-rig':'flap-snap','chicom-rig':'canvas-toggle',
 bandolier:'diagonal','split-front':'utility-buckle',
 'full-chest':'utility-buckle',lbv:'double-stack',
 'sadf-webbing':'plce-cover','field-webbing':'plce-cover',
 'belt-harness':'plce-cover','no-rig':'open-elastic'
};
const pouch=(g:THREE.Group,m:THREE.Material,fold:THREE.Material,
 x:number,y:number,z:number,h:number,d:number,depth=1.10)=>{
 const style=g.name.replace('authored-rig-','');
 const construction=RIG_POCKET_CONSTRUCTION[style]??'flap-snap';
 const extra=rigVisualBudget(style).projection;
 const span=d+(d>=2.3?.17:.11);
 const front=x+depth*.5+extra;
 box(g,m,x+extra*.5,y,z,depth+extra,h,span);
 const lip=(cy:number,height:number,thickness:number,width=span+.14)=>
  box(g,fold,front+.08+thickness*.50,cy,z,thickness,height,width);
 if(construction==='open-elastic'){
  lip(y+h*.46,.19,.23);
 }else if(construction==='bungee'){
  lip(y+h*.42,.24,.28);
  box(g,fold,front+.19,y+.20,z,.33,h*.48,.40);
 }else if(construction==='canvas-toggle'){
  lip(y+h*.28,h*.34,.37);
 }else if(construction==='flap-snap'){
  lip(y+h*.29,h*.35,.39);
  box(g,fold,front+.38,y+h*.07,z,.22,h*.17,.57);
 }else if(construction==='utility-buckle'){
  lip(y+h*.36,h*.21,.34);
  box(g,fold,front+.32,y+.12,z,.25,h*.25,.54);
 }else if(construction==='double-stack'){
  lip(y+h*.33,h*.23,.35);
  box(g,m,front+.17,y-h*.16,z,.30,h*.29,span-.20);
  lip(y-h*.04,.36,.29);
 }else if(construction==='diagonal'){
  lip(y+h*.39,.32,.24);
 }else{
  lip(y+h*.31,h*.34,.45,span+.28);
  box(g,fold,front+.39,y+.02,z,.23,h*.30,.58);
 }
};
/** One dark, thick magazine mouth per real physical pouch, NOT one
 * additional fake magazine. Existing actual-mag instances come from the
 * equipment ledger and sit just below/above these openings.
 * X is the outer pouch-front lip, Y its upper opening, Z lateral.
 */
export type RigMagazineMouth=readonly [number,number,number,number];
export const RIG_MAGAZINE_MOUTHS:Readonly<
 Record<string,readonly RigMagazineMouth[]>>={
 'no-rig':[],
 'chest-placard':[
  [9.48,-.28,-2.73,2.12],[9.48,-.28,0,2.12],[9.48,-.28,2.73,2.12]
 ],
 'micro-rig':[
  [9.15,-1.10,-1.65,2.36],[9.15,-1.10,1.65,2.36],
  [8.42,-1.57,-4.55,1.36],[8.42,-1.57,4.55,1.36]
 ],
 'light-rig':[-4.6,-1.5,1.5,4.6].map(z=>[9.20,.09,z,2.38] as const),
 'chicom-rig':[-3.12,0,3.12].map(z=>[9.37,.45,z,2.34] as const),
 'bandolier':[0,1,2,3].map(i=>
  [8.94,5.01-i*1.85,3.85-i*1.925,1.65] as const),
 'split-front':[-5.64,-2.92,2.92,5.64].map(z=>
  [9.43,-.19,z,1.93] as const),
 'full-chest':[-4.60,-1.5,1.5,4.60].map(z=>
  [9.30,-.92,z,2.18] as const),
 'lbv':[-1,1].flatMap(s=>[1.28,-2.56].map(y=>
  [8.87,y+1.51,s*4.20,2.75] as const)),
 'chicom-utility':[],
 'sadf-webbing':[-5.85,-3.25,3.25,5.85].map(z=>
  [8.66,.31,z,2.17] as const),
 'field-webbing':[],
 'belt-harness':[]
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
/** Explicit RIGHT-HAND local anchors on real authored front rig geometry.
 * Mirroring sign produces the matching left-hand point. These ends
 * penetrate the actual bib/wing backing instead of hovering at the flank.
 */
export const RIG_LOWER_FRONT_ANCHORS:Readonly<
 Record<string,readonly [number,number,number]>>={
 'micro-rig':[7.78,-2.90,4.55],
 'chest-placard':[8.16,-3.30,4.18],
 'light-rig':[8.41,-3.34,5.64],
 'chicom-rig':[8.02,-3.35,5.76],
 'split-front':[8.16,-3.58,6.40],
 'full-chest':[8.42,-3.70,5.85],
 'lbv':[7.95,-4.04,5.28],
 'sadf-webbing':[7.92,-5.12,6.95],
 'field-webbing':[6.40,-5.18,5.70],
 'belt-harness':[6.40,-5.18,5.70]
};
/** The front harness rises up the bib, then turns diagonally over the
 * shoulder before running across the shirt crown. A previous nearly
 * vertical front-to-crown step left an open air gap at the shoulder.
 * This path shares the REAL garment contact frame and deliberately
 * intersects the cloth a little; all segments are contiguous.
 */
export function rigShoulderRoute(top:string,frame:FittedRigFrame,
 front:readonly [number,number,number],
 back:readonly [number,number,number],sign:number):
 readonly (readonly [number,number,number])[]{
 const sy=frame.shoulderY-.10;
 const sh=Math.max(3.35,Math.min(5.15,frame.shoulderRight.z));
 const crownZ=sign*sh;
 const rearX=frame.back.x-frame.rigShiftX;
 const realFront=garmentContactAnchor(top,4.7).front+.10-frame.rigShiftX;
 // Every front join must slope inward even when the shirt is very thin:
 // avoid a small outward reversal that leaves a hovering kink at the crown.
 const entryX=Math.min(front[0]-.96,realFront);
 const diagonalZ=front[2]*.60+crownZ*.40;
 return [
  front,
  [front[0]-.18,sy-1.68,front[2]],
  [front[0]-.68,sy-.90,diagonalZ],
  [entryX,sy-.16,crownZ],
  [entryX-.35,sy,crownZ],
  [rearX+.48,sy,crownZ],
  [rearX,sy-.40,crownZ],
  back
 ];
}
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
 const budget=rigVisualBudget(rig);
 const fx=frame.front.x-frame.rigShiftX;
 // Keep the strap INSIDE face on the actual surface; width lies
 // tangent to the back, so it must never become a standoff value.
 const backDepth=.62;
 const bx=frame.back.x-frame.rigShiftX-backDepth*.5-.07;
 const sx=1.65-frame.rigShiftX;
 const rx=-1.65-frame.rigShiftX;
 const sy=frame.shoulderY-.10;
 const sh=Math.max(3.35,Math.min(5.15,frame.shoulderRight.z));
 const sideZ=(frame.sideContact??frame.sideRight.z-.50)+.40;
 const rearTieZ=Math.max(sh+.56,sideZ-.55);
 type Pt=readonly [number,number,number];
 const line=(points:readonly Pt[],width:number,depth=.44,
  face:'back'|'front'='back')=>{
  const normal:Pt=face==='front'?[1,0,0]:[-1,0,0];
  fittedFlatSurfaceBand(harness,material,points,
   points.map(()=>normal),Math.max(width,budget.web),
   Math.max(depth,.56));
 };
 const across=(x:number,y:number,halfZ:number,width=.75,depth=.38)=>
  line([[x,y,-halfZ],[x,y,halfZ]],width,depth);
 const shoulder=(sign:number,front:Pt,back:Pt,width:number)=>{
  const route=rigShoulderRoute(top,frame,front,back,sign);
  fittedShoulderBridge(harness,material,route,
    Math.max(width,budget.shoulder),.68,1);
  // Front strap ends sink physically into an authored panel reinforcement.
  // Do not add free-standing front blocks on belt suspension systems.
  if(rig!=='field-webbing'&&rig!=='belt-harness'){
   const landing=box(harness,material,front[0]-.04,front[1]-.38,
    front[2],.60,1.06,Math.max(1.10,width));
   landing.name='rig-front-reinforced-landing';
   landing.userData.keepSeparate=true;
  }
 };
 const sideTie=(sign:number,y:number,fromX:number,toX:number,width=.56)=>{
  // Wrap around real torso flank, then finish INSIDE the authored panel.
  const flank=rearTieZ;
  fittedSideWrap(harness,material,
   [[fromX,sign*flank],[fromX-.60,sign*sideZ],
    [toX+.60,sign*sideZ],[toX,sign*flank]],
   y,Math.max(width,budget.flank),.58,sign);
  const anchor=RIG_LOWER_FRONT_ANCHORS[rig];
  if(anchor){
   const [actualX,actualY,actualZ]=anchor;
   // Belt webbing lands on its existing lower front brace.
   const frontX=rig==='field-webbing'||rig==='belt-harness'?
    fromX:actualX+.22;
   const join=fittedFlatSurfaceBand(harness,material,[
    [fromX,y,sign*flank],
    [fromX+.12,y,sign*(sideZ+.30)],
    [frontX,actualY,sign*actualZ]
   ],[[1,0,0],[1,0,0],[1,0,0]],
    Math.max(width,budget.flank,.64),.60);
   join.name='rig-lower-front-return';
   // It must remain individually inspectable rather than being merged with
   // dozens of other same-material shoulder strips on every rebuild.
   join.userData.keepSeparate=true;
   join.userData.lowerFrontDestination=[frontX,actualY,sign*actualZ];
  }
 };

 if((rig==='chest-placard'||rig==='micro-rig')&&
    frame.mode==='carrier-placard'){
  // Modern removable chassis: short visible carrier attachment tabs,
  // absolutely no stand-alone shoulder/back harness on valid receivers.
  const micro=rig==='micro-rig';
  const panelX=micro?7.94:8.14;
  const panelTop=micro?-.74:.35;
  const tabZ=micro?2.86:3.30;
  for(const sign of [-1,1]){
   line([[panelX,panelTop,sign*tabZ],
    [panelX,1.22,sign*tabZ],
    [fx+.12,2.47,sign*tabZ]],.82,.42,'front');
   const clip=box(harness,material,fx+.10,2.38,
    sign*tabZ,.43,.70,1.10);
   clip.name='carrier-front-direct-clip';
   clip.userData.keepSeparate=true;
  }
 }else if(rig==='micro-rig'||rig==='chest-placard'){
  const micro=rig==='micro-rig';
  const x=micro?7.90:8.14,z=micro?2.85:3.30;
  const topY=micro?-.84:.35;
  for(const sign of [-1,1])
   shoulder(sign,[x,topY,sign*z],[bx,-.84,sign*3.75],
    micro?.82:.72);
  // Short upper H bridge plus one lower, narrow stabilizing back strap.
  across(bx,-.86,3.75,.78);
  across(bx,-3.20,rearTieZ,.50);
  for(const sign of [-1,1])
   sideTie(sign,-3.20,fx+.10,bx,micro?.66:.62);
 }else if(rig==='light-rig'||rig==='chicom-rig'){
  // Real crossed shoulder suspension: shoulders CONTINUE into opposing
  // lower rear attachment points instead of receiving a decorative X.
  const classic=rig==='light-rig',x=classic?8.38:7.95;
  const z=classic?4.42:4.13;
  for(const sign of [-1,1]){
   const topY=classic?.10:.62;
   shoulder(sign,[x,topY,sign*z],[bx,1.13,sign*3.78],
    classic?1.04:.77);
   line([[bx,1.13,sign*3.78],[bx,-3.35,-sign*rearTieZ]],
    classic?1.02:.74,.43);
   sideTie(-sign,-3.35,fx+.04,bx,classic?.62:.48);
  }
 }else if(rig==='bandolier'){
  // Unbroken front-right / rear-left diagonal with a shoulder turn and
  // lower flank connection; no second shoulder strap or rear H bridge.
  // Single continuous band with explicit outside normals on each face.
  fittedFlatSurfaceBand(harness,material,[
   [bx,-4.42,-4.52],[bx,1.12,4.02],
   [rx,sy,4.12],[sx,sy,4.12],
   [fx+.20,2.85,3.18],[fx+.20,-4.25,-4.16],
   [(fx+bx)*.5,-4.37,-sideZ],[bx,-4.42,-4.52]
  ],[
   [-1,0,0],[-1,0,0],[0,1,0],[0,1,0],
   [1,0,0],[1,0,0],[0,0,-1],[-1,0,0]
  ],Math.max(1.72,budget.web),.62);
 }else if(rig==='field-webbing'||rig==='belt-harness'){
  // Belt-first: twin front braces, one true rear Y and no chest slab.
  const wide=rig==='belt-harness';
  for(const sign of [-1,1]){
   line([[fx+.40,-5.18,sign*5.70],
    [fx+.40,.90,sign*4.67]],wide?1.22:1.02,.54,'front');
   shoulder(sign,[fx+.40,.90,sign*4.67],
    [bx,1.16,sign*3.65],wide?1.22:1.02);
   line([[bx,1.16,sign*3.65],[bx,-2.15,0]],
    wide?1.22:1.02,.54);
  }
  line([[bx,-2.15,0],[bx,-5.10,0]],wide?1.20:1.03,.53);
  across(bx,-5.10,rearTieZ,wide?.82:.72);
  for(const sign of [-1,1])
   sideTie(sign,-5.10,fx+.40,bx,wide?.72:.62);
 }else if(rig==='split-front'){
  // Independent wings joined by an H harness; no continuous back shell.
  for(const sign of [-1,1])
   shoulder(sign,[8.12,1.01,sign*4.75],
    [bx,-1.05,sign*4.55],1.08);
  across(bx,-1.05,4.55,1.02);
  across(bx,-3.58,rearTieZ,.62);
  for(const sign of [-1,1])sideTie(sign,-3.58,fx+.2,bx,.48);
 }else if(rig==='full-chest'){
  // A substantial patrol bib gets a strong rear support yoke, not the
  // split-front's narrow H and not the plate carrier's flat bag.
  for(const sign of [-1,1])
   shoulder(sign,[8.39,2.62,sign*4.65],
    [bx,.46,sign*4.82],1.28);
  box(harness,material,bx-.07,-.76,0,.47,2.05,9.82);
  across(bx,-3.70,rearTieZ,.69);
  for(const sign of [-1,1])
   sideTie(sign,-3.70,fx+.10,bx,.75);
 }else if(rig==='lbv'){
  // The rear of a real LBV carries a broad shoulder yoke, two descending
  // panels, and a waist support; the sternum remains open.
  for(const sign of [-1,1]){
   shoulder(sign,[7.82,3.05,sign*3.52],
    [bx,.76,sign*4.85],1.43);
   line([[bx,.76,sign*4.85],[bx,-3.86,sign*5.26],
    [bx,-4.04,sign*rearTieZ]],1.25,.49);
   sideTie(sign,-4.04,fx+.05,bx,.72);
  }
  box(harness,material,bx-.05,.32,0,.48,1.26,10.02);
  across(bx,-4.04,rearTieZ,.92);
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
  across(bx,.85,4.93,1.02);
  across(bx,-5.12,rearTieZ,.80);
  // Two independent, projecting back compartments with deliberately
  // staggered depth and contrasting closure flaps; NOT one dark slab.
  const rearCargo=(harness.userData.rearCargoMaterial as
   THREE.Material|undefined)??material;
  const rearTrim=(harness.userData.rearTrimMaterial as
   THREE.Material|undefined)??material;
  for(const [y,h,w,center,depth] of [
   [-1.96,2.08,8.44,bx-.94,1.50],
   [-4.34,1.92,9.28,bx-1.09,1.78]
  ] as const){
   box(harness,rearCargo,center,y,0,depth,h,w);
   box(harness,rearTrim,center-depth*.53-.09,y+h*.38,0,
    .23,.47,w+.10);
  }
 }
 consolidateVisualGroup(harness);
 harness.userData.fitKey=key;
}

export function createChestRigSilhouettes(chest:THREE.Group,
 fabric:THREE.Material,pocketFabric:THREE.Material,
 dark:THREE.Material,trim:THREE.Material,
 webbing:THREE.Material=fabric):ShapeGroups{
 const groups:ShapeGroups={};
 const make=(id:string)=>{
  const g=new THREE.Group();g.name='authored-rig-'+id;
  g.visible=false;chest.add(g);groups[id]=g;return g;
 };
 make('no-rig');
 {
  const g=make('chest-placard');
  box(g,fabric,8.18,-2.05,0,.78,5.05,9.10);
  for(const z of [-2.73,0,2.73])
   pouch(g,pocketFabric,pocketFabric,8.74,-2.20,z,3.85,2.45,1.08);
  for(const s of [-1,1])
   box(g,dark,7.95,1.2,s*3.65,.40,2.65,.90);
  // Keep the legacy mode marker for existing wardrobe/UI consumers,
  // but mount the REBUILT fitted harness directly to the rig. Otherwise
  // the placard's carrier tabs would disappear when standalone is hidden.
  const standalone=new THREE.Group();standalone.name='standalone-harness';
  g.add(standalone);
  shoulderHarness(g,webbing,4.0);
  // The fitted mesh chooses carrier tabs OR independent shoulder runs.
 }
 {
  const g=make('micro-rig');
  shoulderHarness(g,webbing,3.75);
  box(g,fabric,7.94,-2.65,0,.84,3.98,8.10);
  // Two substantial front cells and a small high organizer distinguish
  // the complete micro harness from the flat three-cell carrier placard.
  for(const z of [-1.65,1.65])
   pouch(g,pocketFabric,pocketFabric,8.54,-2.58,z,2.96,2.86,.91);
  box(g,webbing,8.35,-.70,0,.29,.68,5.20);
  for(const s of [-1,1])
   pouch(g,pocketFabric,pocketFabric,7.75,-2.62,s*4.55,2.10,1.62,.72);
 }
 {
  const g=make('light-rig');
  // Classic X-harness: crossed rear straps and 2+2 broad front pouch banks.
  shoulderHarness(g,webbing,4.7);
  // The rear X is regenerated at actual armor contact in the fitted harness.
  for(const z of [-4.6,-1.5,1.5,4.6]){
   pouch(g,pocketFabric,pocketFabric,8.38,-2.20,z,4.58,2.85,1.07);
   // Four independent closure flaps; never read as one continuous panel.
   box(g,pocketFabric,9.02,-.57,z,.23,.51,2.92);
  }
  box(g,dark,7.94,-4.65,0,.48,.70,13.25);
 }
 {
  const g=make('split-front');
  shoulderHarness(g,webbing,5.00);
  // Two independent banks with a large, entirely unobstructed center seam.
  for(const s of [-1,1]){
   box(g,fabric,8.12,-1.90,s*4.3,.75,5.85,5.45);
   for(const p of [2.92,5.64])
    pouch(g,pocketFabric,pocketFabric,8.77,-2.18,s*p,3.98,2.34,1.08);
   box(g,webbing,8.64,-1.95,s*1.35,.37,4.72,.44);
  }
  // Only two chunky closure tabs bridge toward the opening. The deep
  // vertical separation and independent banks remain the major silhouette.
  for(const y of [.15,-2.85])
   for(const s of [-1,1])
    box(g,dark,8.66,y,s*1.03,.26,.56,.62);
 }
 {
  const g=make('lbv');
  shoulderHarness(g,webbing,5.20);
  for(const s of [-1,1]){
   // Two real tapered load-bearing vest halves, not side-on slabs.
   // Open sternum stays readable; the broad hems carry the pockets.
   const half=new THREE.Group();half.position.z=s*3.25;g.add(half);
   fittedArmorBag(half,fabric,7.82,1,3.55,-5.80,4.02,.72,.72);
   for(const y of [1.28,-2.56,-5.35])
    pouch(g,pocketFabric,pocketFabric,8.12,y,s*4.20,3.02,3.38,.99);
   // Recognizable upper yoke joins the tapered vest panel, without
   // closing the open central sternum.
   box(g,webbing,7.86,2.76,s*3.98,.56,.76,3.18);
  }
 }
 {
  const g=make('full-chest');
  shoulderHarness(g,webbing,5.02);
  // One broad polygon with clipped high shoulders; avoids a square slab
  // intersecting raised protective collars on bulkier armor.
  fittedArmorBag(g,fabric,8.39,1,3.10,-6.55,12.25,1.30,.78);
  // A full-bib patrol platform: high admin shelf and lower four-cell
  // storage. The broken horizontal cargo hierarchy reads as fabric,
  // not another monolithic armor plate.
  box(g,webbing,8.56,1.22,0,.38,1.40,8.18);
  for(const z of [-4.60,-1.5,1.5,4.60])
   pouch(g,pocketFabric,pocketFabric,8.65,-3.05,z,4.25,2.65,1.07);
  for(const sign of [-1,1])
   box(g,pocketFabric,8.55,-.45,sign*5.10,.49,1.28,1.28);
 }
 {
  const g=make('field-webbing');
  const h=new THREE.Group();h.name='uniform-fitted-rig-harness';
  h.userData.fitMaterial=webbing;h.userData.spread=5.95;g.add(h);
  for(const sign of [-1,1]){
   strap(h,webbing,[6.40,-5.24,sign*5.95],
    [1.0,5.45,sign*4.60],1.10,.90);
   strap(h,webbing,[1.0,5.45,sign*4.60],
    [-5.5,-5.4,sign*5.95],1.10,.90);
   // The lower belt and magazine pockets now live on the hip.
  }
 }
 {
  const g=make('belt-harness');
  const h=new THREE.Group();h.name='uniform-fitted-rig-harness';
  h.userData.fitMaterial=webbing;h.userData.spread=6.3;g.add(h);
  for(const sign of [-1,1]){
   strap(h,webbing,[3.75,-5.05,sign*6.3],
    [.05,5.70,sign*5.20],1.45,1.04);
   strap(h,webbing,[.05,5.70,sign*5.20],
    [-5.10,-4.7,sign*6.3],1.36,1.04);
   pouch(g,pocketFabric,pocketFabric,3.1,-5.30,sign*7.65,5.30,3.40,1.49);
  }
  box(g,webbing,3.55,-5.7,0,1.35,1.45,14.15);
 }
 {
  const g=make('chicom-rig');
  shoulderHarness(g,webbing,4.55);
  box(g,fabric,7.99,-2.35,0,.68,6.48,12.15);
  // Chicom canvas reads by three TALL independent flap pouches and
  // two abbreviated flank pockets, not a modern flat MOLLE array.
  for(const z of [-3.12,0,3.12]){
   pouch(g,pocketFabric,pocketFabric,8.52,-2.32,z,5.54,2.84,.99);
   // Oversized Type 56 toggle closures are visually recognizable,
   // rather than three anonymous modern nylon zipper pouches.
   box(g,webbing,9.46,-.20,z,.36,.55,.64);
  }
  for(const s of [-1,1])
   pouch(g,pocketFabric,pocketFabric,8.42,-3.46,s*5.65,2.38,1.65,.75);
 }
 {
  const g=make('bandolier');
  const h=new THREE.Group();h.name='uniform-fitted-rig-harness';
  h.userData.fitMaterial=webbing;h.userData.spread=4.8;g.add(h);
  for(let i=0;i<5;i++){
   const t=i/4,z=3.85-t*7.7,y=3.6-t*7.4;
   // Four magazine positions plus a deliberate fifth utility cell.
   pouch(g,pocketFabric,pocketFabric,8.20,y,z,2.82,1.93,.96);
  }
 }
 {
  const g=make('sadf-webbing');
  shoulderHarness(g,webbing,5.35);
  const rearHarness=g.getObjectByName('uniform-fitted-rig-harness');
  if(rearHarness instanceof THREE.Group){
   rearHarness.userData.rearCargoMaterial=pocketFabric;
   rearHarness.userData.rearTrimMaterial=webbing;
  }
  for(const s of [-1,1]){
   for(const z of [3.25,6.05])
    pouch(g,pocketFabric,pocketFabric,7.78,-2.75,s*z,6.12,2.63,1.35);
   // Differentiate front and flank cargo from the Chicom three-cell
   // apron. Separate rear compartment shapes follow the fitted frame.
   box(g,webbing,7.97,.70,s*5.40,.52,1.42,2.34);
   // Broad P83 waist pockets and belt live on the hip.
  }
 }
 // Exposed, solid-dark mouth slits make magazine positions readable at
 // phone zoom. These are holes in the rig design language, not ammunition.
 for(const [style,mouths] of Object.entries(RIG_MAGAZINE_MOUTHS)){
  const g=groups[style];if(!g)continue;
  g.userData.magazineMouthCount=mouths.length;
  for(const [x,y,z,width] of mouths)
   box(g,dark,x,y,z,.20,.32,width);
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
 'micro-rig':[[-1.65,-2.58],[1.65,-2.58],
  [-4.55,-2.62],[4.55,-2.62]],
 'light-rig':[[-4.60,-2.20],[-1.50,-2.20],[1.50,-2.20],[4.60,-2.20]],
 'split-front':[[-5.64,-2.18],[-2.92,-2.18],[2.92,-2.18],[5.64,-2.18]],
 'chicom-rig':[[-3.12,-2.32],[0,-2.32],[3.12,-2.32]],
 'bandolier':[[3.85,3.6],[1.93,1.75],[0,-.1],[-1.93,-1.95]],
 'full-chest':[[-4.60,-2.75],[-1.50,-2.75],[1.50,-2.75],[4.60,-2.75]],
 'lbv':[[-4.20,1.28],[-4.20,-2.56],[4.20,1.28],[4.20,-2.56],
  [-4.52,.78],[-4.52,-3.06],[4.52,.78],[4.52,-3.06]],
 'field-webbing':[[-6.8,-5.40],[6.8,-5.40]],
 'belt-harness':[[-6.6,-5.3],[6.6,-5.3]],
 'sadf-webbing':[[-5.85,-2.75],[-3.25,-2.75],[3.25,-2.75],[5.85,-2.75],
  [-5.48,-3.25],[-2.88,-3.25],[3.62,-3.25],[6.22,-3.25]]
};
export function rigMagazineCellCount(style:string):number{
 return (RIG_CELLS[style]??[]).length;
}
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
