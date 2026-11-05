/**
 * D2-R: six independently authored protective facewear silhouettes.
 * No runtime geometry rebuilds; all modes are preconstructed once.
 * Reference coordinate space: -Z forward, +X right, +Y up.
 */
import * as THREE from 'three';
import {sculptedShell,filterPod,compactHarness,fittedHood,fittedWindow,hangingFilter} from './operator-d2-mask-r10-geometry.ts';
import {
 type MaskMaterials,type MaskPoint,block,plate,extrudedProfile,
 eyePolygon,pairedEyes,lens,rim,strap,sideProfile,fittedHoodLoft,canister,outlet
} from './operator-d2-mask-geometry.ts';
export type D2MaskId=
 'half-mask'|'respirator-half'|'gas-gp5'|'gas-m17'|'gas-m40'|'gas-m50';
export type D2MaskMaterials=MaskMaterials;
type P=MaskPoint;
const poly=(points:readonly P[])=>points;
const pair=(cx:number,cy:number,rx:number,ry:number,sides=8):
 readonly [readonly P[],readonly P[]]=>[
 eyePolygon(-cx,cy,rx,ry,sides),eyePolygon(cx,cy,rx,ry,sides)
];
function rearHarness(g:THREE.Group,m:MaskMaterials,low=1.9){
 for(const sign of [-1,1] as const){
  strap(g,m.hardware,'head-harness-side',[
   [sign*3.72,low,-4.30],[sign*4.56,low+.05,-2.4],
   [sign*4.58,low+.10,1.4],[sign*3.45,low+.25,4.48]
  ],.42);
  block(g,m.filters,'harness-buckle',sign*4.40,low,-3.18,.68,.70,.60);
  strap(g,m.hardware,'head-harness-upper',[
   [sign*3.65,4.55,-3.75],[sign*4.55,5.00,-1.45],
   [sign*3.14,6.58,2.05],[sign*1.15,6.89,3.75]
  ],.36);
 }
 strap(g,m.hardware,'head-harness-back',[
  [-3.48,low+.26,4.47],[0,low+.28,4.56],[3.48,low+.26,4.47]
 ],.44);
}
/** R10: all three sides of the guard are one low-poly object. */
function tactical(g:THREE.Group,m:MaskMaterials,meshFront:boolean){
 sculptedShell(g,m.rubber,'rigid-half-mask-face',{
  outline:[
   [-1.00,3.18],[1.00,3.18],[1.82,2.65],
   [3.82,2.23],[4.17,1.48],[3.45,-.18],
   [2.00,-.70],[-2.00,-.70],[-3.45,-.18],
   [-4.17,1.48],[-3.82,2.23],[-1.82,2.65]
  ],
  front:-4.94,halfWidth:4.17,thickness:.42,
  nose:.62,sideReturn:.86,jawReturn:.14
 });
 // One inset is enough; the nose crest is part of the primary shell.
 const insert:readonly P[]=[
  [-2.58,1.91],[2.58,1.91],[2.70,.49],
  [1.82,-.26],[-1.82,-.26],[-2.70,.49]
 ];
 extrudedProfile(g,m.filters,meshFront?'wide-mesh-grille':'hard-nose-panel',
  insert,-5.34,.15,.15);
 if(meshFront){
  // Three broad reinforcement ridges, not a subpixel mesh texture.
  for(const x of [-1.25,0,1.25])
   block(g,m.hardware,'mesh-guard-rib',x,.89,-5.57,.21,1.18,.13);
 }
 for(const sign of [-1,1] as const){
  strap(g,m.hardware,'half-strap-side',[
   [sign*4.09,1.9,-3.86],[sign*4.42,1.9,-2.05],
   [sign*4.40,1.9,2.47],[sign*3.52,1.9,4.29]
  ],.37);
 }
 strap(g,m.hardware,'half-strap-back',[
  [-3.52,1.9,4.29],[0,1.9,4.44],[3.52,1.9,4.29]
 ],.37);
}
/** R10: tapered silicone facepiece + two *lateral* shallow pods. */
function industrial(g:THREE.Group,m:MaskMaterials,compact:boolean){
 sculptedShell(g,m.rubber,'respirator-triangular-seal',{
  outline:[
   [-.82,3.53],[.82,3.53],[1.48,3.04],
   [2.63,1.94],[3.08,.51],[2.12,-.43],
   [.92,-.85],[-.92,-.85],[-2.12,-.43],
   [-3.08,.51],[-2.63,1.94],[-1.48,3.04]
  ],front:-4.98,halfWidth:3.08,thickness:.49,
  nose:.87,cheek:.16,cheekAtY:1.7,
  sideReturn:.57,jawReturn:.26
 });
 outlet(g,m,'respirator-valve',0,-.1,-5.44,.77);
 if(compact){
  filterPod(g,m.filters,'compact-front-filter',
   [0,1.15,-6.02],[1.23,.86,.83],[0,0,-1]);
 }else for(const sign of [-1,1] as const){
  filterPod(g,m.filters,'dual-filter-canister',
   [sign*3.39,1.02,-5.65],[1.40,.96,.83],[sign*.78,0,-1]);
 }
 compactHarness(g,m,1.60,3.12);
}
/** R11: GP-5 / ShM-62: wrapped one-piece rubber helmet-mask.
 * No regular back straps, no scalp patch, no stacked cuboid crown.
 */
function hood(g:THREE.Group,m:MaskMaterials){
 const eyeHoles=pair(1.91,3.75,1.32,1.34);
 fittedHood(g,m.rubber,[
  [-2.35,3.35,-4.05,3.58],
  [-.62,3.80,-4.36,4.07],
  [2.18,4.45,-4.46,4.48],
  [5.59,4.48,-4.46,4.50],
  [7.02,4.25,-4.29,4.31],
  [7.63,3.34,-3.92,3.73]
 ]);
 sculptedShell(g,m.rubber,'gp5-hood-front',{
  outline:[
   [-3.34,7.63],[3.34,7.63],
   [4.25,7.02],[4.48,5.59],
   [4.45,2.18],[3.80,-.62],[3.35,-2.35],
   [-3.35,-2.35],[-3.80,-.62],
   [-4.45,2.18],[-4.48,5.59],[-4.25,7.02]
  ],holes:eyeHoles,
  front:-4.48,halfWidth:4.48,thickness:.37,
  nose:.22,cheek:.14,cheekAtY:1.3,
  sideReturn:.27,foreheadReturn:.38,jawReturn:.22
 });
 for(const eye of eyeHoles)
  fittedWindow(g,m,'gp5-round-eye',eye,-4.85,.09);
 // Just one shaped rubber mouth taper, no stacked nose boxes.
 extrudedProfile(g,m.rubber,'gp5-conical-mouth',[
  [-2.42,2.05],[2.42,2.05],
  [1.72,.20],[1.18,-.71],
  [-1.18,-.71],[-1.72,.20]
 ],-5.24,.34,.18);
 hangingFilter(g,m);
}
function cheekFilter(g:THREE.Group,m:MaskMaterials,sign:-1|1){
 // Three deliberately connected wedge changes form one integrated M17 cheek.
 extrudedProfile(g,m.rubber,'m17-integrated-cheek-filter',[
  [sign*1.24,2.54],[sign*3.56,2.45],
  [sign*4.15,1.65],[sign*3.83,.08],
  [sign*2.78,-.62],[sign*1.53,-.22]
 ],-5.33,.64,.22);
 extrudedProfile(g,m.hardware,'m17-cheek-filter-frame',[
  [sign*2.65,.89],[sign*3.65,1.04],
  [sign*3.63,.38],[sign*2.68,.20]
 ],-5.73,.19,.14);
}
function m17(g:THREE.Group,m:MaskMaterials){
 const eyes=pair(1.93,3.81,1.25,1.27);
 plate(g,m.rubber,'m17-full-facepiece',{
  outline:[
   [-3.75,5.50],[3.75,5.50],[4.30,4.81],
   [4.26,1.26],[3.41,-.61],[2.26,-1.00],
   [-2.26,-1.00],[-3.41,-.61],[-4.26,1.26],[-4.30,4.81]
  ],holes:eyes,front:-4.78,depth:.60,edgeReturn:.40,nose:.46
 });
 pairedEyes(g,m,'m17-round-eyepiece',eyes,-5.15,.40,.25);
 cheekFilter(g,m,-1);cheekFilter(g,m,1);
 outlet(g,m,'m17-center-exhale-speech',0,.45,-5.65,.91);
 for(const sign of [-1,1] as const)
  sideProfile(g,m.rubber,'m17-wraparound-cheek',sign,[
   [-4.66,5.32],[-2.60,5.31],[-1.21,4.47],
   [-1.23,1.33],[-2.55,-.51],[-4.71,-1.01]
  ],4.02,.57);
 rearHarness(g,m,2.30);
}
function m40(g:THREE.Group,m:MaskMaterials){
 const left=poly([
  [-3.38,4.88],[-1.27,4.91],[-.68,4.19],
  [-.93,3.05],[-3.23,3.05],[-3.55,3.81]
 ]);
 const right=left.map(([x,y])=>[-x,y] as const).reverse();
 const eyes:readonly [readonly P[],readonly P[]]=[left,right];
 plate(g,m.rubber,'m40-full-facepiece',{
  outline:[
   [-3.71,5.64],[3.71,5.64],[4.16,4.83],
   [4.12,1.06],[3.00,-.78],[1.88,-1.03],
   [-1.88,-1.03],[-3.00,-.78],[-4.12,1.06],[-4.16,4.83]
  ],holes:eyes,front:-4.87,depth:.55,edgeReturn:.45,nose:.67
 });
 pairedEyes(g,m,'m40-angular-eyepiece',eyes,-5.19,.40,.26);
 extrudedProfile(g,m.rubber,'m40-prominent-nose',[
  [-.90,3.49],[.90,3.49],[1.31,1.62],
  [-1.31,1.62]
 ],-5.40,.34);
 outlet(g,m,'m40-exhalation-front',0,.33,-5.80,1.03);
 canister(g,m.hardware,'m40-single-side-port',
  3.30,1.28,-5.49,1.16,.61,.35);
 canister(g,m.filters,'m40-projecting-side-canister',
  3.66,1.20,-6.89,1.55,2.0,.40);
 canister(g,m.hardware,'m40-filter-cap',
  3.92,1.20,-7.76,1.51,.25,.40);
 for(const sign of [-1,1] as const)
  sideProfile(g,m.rubber,'m40-side-seal',sign,[
   [-4.72,5.34],[-2.66,5.36],[-1.22,4.54],
   [-1.15,1.25],[-2.52,-.40],[-4.75,-.85]
  ],4.02,.49);
 rearHarness(g,m,2.34);
}
function m50(g:THREE.Group,m:MaskMaterials){
 const visor=poly([
  [-3.73,5.20],[-2.39,5.29],[2.39,5.29],[3.73,5.20],
  [3.66,2.58],[1.31,2.47],[.51,2.85],[-.51,2.85],
  [-1.31,2.47],[-3.66,2.58]
 ]);
 plate(g,m.rubber,'m50-facepiece-rim-and-chin',{
  outline:[
   [-3.82,5.63],[3.82,5.63],[4.26,4.91],
   [4.29,1.02],[3.33,-.75],[2.23,-1.06],
   [-2.23,-1.06],[-3.33,-.75],[-4.29,1.02],[-4.26,4.91]
  ],holes:[visor],front:-4.89,depth:.53,edgeReturn:.46,nose:.52
 });
 lens(g,m.lens,'m50-one-piece-panoramic-visor-lens',visor,-5.38,.42);
 rim(g,m.hardware,'m50-one-piece-panoramic-visor-rim',visor,-5.44,.38,.42);
 extrudedProfile(g,m.rubber,'m50-raised-nasal-bridge',[
  [-.48,2.92],[.48,2.92],[1.32,1.25],
  [.86,.50],[-.86,.50],[-1.32,1.25]
 ],-5.49,.35);
 for(const sign of [-1,1] as const){
  extrudedProfile(g,m.filters,'m50-twin-low-cheek-filter',[
   [sign*2.20,2.16],[sign*3.80,2.08],
   [sign*4.04,1.35],[sign*3.65,-.38],
   [sign*2.58,-.53],[sign*1.96,.45]
  ],-5.49,.51,.28);
  extrudedProfile(g,m.hardware,'m50-conformal-cheek-port',[
   [sign*2.39,.21],[sign*3.54,.21],
   [sign*3.54,-.28],[sign*2.45,-.32]
  ],-5.68,.18);
 }
 outlet(g,m,'m50-low-exhale-module',0,-.05,-5.82,.98);
 for(const sign of [-1,1] as const)
  sideProfile(g,m.rubber,'m50-streamlined-temple-seal',sign,[
   [-4.67,5.37],[-2.30,5.25],[-1.12,4.41],
   [-1.39,1.60],[-2.89,-.42],[-4.79,-.92]
  ],4.03,.47);
 rearHarness(g,m,2.15);
}
export function createD2Mask(id:D2MaskId,m:D2MaskMaterials):THREE.Group{
 const root=new THREE.Group();root.name='d2-'+id;
 root.userData.modelAxes='-Z-forward,+X-right,+Y-up';
 root.userData.rebuild='D2-R';
 if(id==='half-mask'||id==='respirator-half'){
  const states=id==='half-mask'?['solid','mesh']:['twin-filter','compact-filter'];
  for(const mode of states){
   const sub=new THREE.Group();sub.name=id+'-'+mode;
   sub.userData.d2MaskMode=mode;sub.visible=mode===states[0];
   if(id==='half-mask')tactical(sub,m,mode==='mesh');
   else industrial(sub,m,mode==='compact-filter');
   root.add(sub);
  }
 }else if(id==='gas-gp5')hood(root,m);
 else if(id==='gas-m17')m17(root,m);
 else if(id==='gas-m40')m40(root,m);
 else m50(root,m);
 return root;
}
