/**
 * D2-R: six independently authored protective facewear silhouettes.
 * No runtime geometry rebuilds; all modes are preconstructed once.
 * Reference coordinate space: -Z forward, +X right, +Y up.
 */
import * as THREE from 'three';
import {sculptedShell,filterPod,compactHarness,fittedHood,fittedWindow,hangingFilter} from './operator-d2-mask-r10-geometry.ts';
import {
 type MaskMaterials,type MaskPoint,block,extrudedProfile,
 eyePolygon,strap,outlet
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
/** R12: M17's internal cheek filters exist as subtle cheek air intakes;
 * the large bulbous cheek volumes are authored INSIDE the one-piece shell.
 */
function cheekFilter(g:THREE.Group,m:MaskMaterials,sign:-1|1){
 extrudedProfile(g,m.filters,'m17-integrated-cheek-filter',[
  [sign*2.80,1.34],[sign*3.33,1.27],
  [sign*3.38,.69],[sign*2.87,.59]
 ],-5.54,.12,.06);
}
function m17(g:THREE.Group,m:MaskMaterials){
 const eyes=pair(1.88,3.87,1.30,1.22);
 sculptedShell(g,m.rubber,'m17-full-facepiece',{
  outline:[
   [-3.42,5.70],[3.42,5.70],[4.00,5.10],
   [4.32,3.30],[4.42,1.38],[3.52,-.28],
   [2.22,-1.07],[-2.22,-1.07],
   [-3.52,-.28],[-4.42,1.38],[-4.32,3.30],
   [-4.00,5.10]
  ],holes:eyes,front:-4.82,halfWidth:4.42,
  thickness:.51,sideReturn:.71,
  cheek:1.02,cheekAtY:1.33,cheekAtX:2.73,
  nose:.22,jawReturn:.20
 });
 for(const eye of eyes)
  fittedWindow(g,m,'m17-round-eyepiece',eye,-5.19,.12);
 cheekFilter(g,m,-1);cheekFilter(g,m,1);
 outlet(g,m,'m17-center-exhale-speech',0,.33,-5.69,1.02);
 compactHarness(g,m,2.13,5.06);
}
/** R12: harder angular M40 shell, one cheek-mounted external filter. */
function m40(g:THREE.Group,m:MaskMaterials){
 const left=poly([
  [-3.44,4.96],[-1.13,5.00],[-.69,4.16],
  [-1.13,2.98],[-3.21,3.03],[-3.58,3.88]
 ]);
 const right=left.map(([x,y])=>[-x,y] as const).reverse();
 const eyes:readonly [readonly P[],readonly P[]]=[left,right];
 sculptedShell(g,m.rubber,'m40-full-facepiece',{
  outline:[
   [-3.68,5.70],[3.68,5.70],[4.19,4.96],
   [4.14,1.14],[2.90,-.71],[1.88,-1.06],
   [-1.88,-1.06],[-2.90,-.71],[-4.14,1.14],
   [-4.19,4.96]
  ],holes:eyes,front:-4.93,halfWidth:4.19,
  thickness:.51,sideReturn:.77,
  nose:.66,cheek:.15,cheekAtY:1.62,jawReturn:.25
 });
 for(const eye of eyes)
  fittedWindow(g,m,'m40-angular-eyepiece',eye,-5.30,.13);
 outlet(g,m,'m40-exhalation-front',0,.24,-5.77,1.02);
 filterPod(g,m.hardware,'m40-single-side-port',
  [3.12,1.05,-5.43],[1.14,.40,.98],[.63,0,-1]);
 filterPod(g,m.filters,'m40-projecting-side-canister',
  [3.97,.97,-6.15],[1.52,1.39,.99],[.72,-.08,-1]);
 compactHarness(g,m,2.12,5.08);
}
/** R13: one panoramic wraparound pane, carved nose and two jaw-hugging
 * conformal filters. No separate rectangular side guards or visor rails.
 */
function m50(g:THREE.Group,m:MaskMaterials){
 const visor:readonly P[]=[
  [-3.70,5.24],[-2.72,5.36],[2.72,5.36],[3.70,5.24],
  [3.66,2.44],[1.34,2.43],[.45,2.93],
  [-.45,2.93],[-1.34,2.43],[-3.66,2.44]
 ];
 sculptedShell(g,m.rubber,'m50-facepiece-rim-and-chin',{
  outline:[
   [-3.78,5.71],[3.78,5.71],[4.22,5.03],
   [4.20,1.20],[3.22,-.65],[2.05,-1.05],
   [-2.05,-1.05],[-3.22,-.65],[-4.20,1.20],[-4.22,5.03]
  ],holes:[visor],front:-4.89,halfWidth:4.22,
  thickness:.46,sideReturn:.88,
  nose:.56,cheek:.12,cheekAtY:1.4,
  jawReturn:.22
 });
 // The same polygon is both the shell's cutout and the wide single visor.
 fittedWindow(g,m,'m50-one-piece-panoramic-visor',visor,-5.34,.93);
 // Two inlaid filters share the primary shell's cheek contour.
 for(const sign of [-1,1] as const){
  sculptedShell(g,m.filters,'m50-twin-low-cheek-filter',{
   outline:[
    [sign*2.25,2.07],[sign*3.65,2.09],
    [sign*4.00,1.26],[sign*3.57,-.30],
    [sign*2.48,-.54],[sign*1.92,.45]
   ],front:-5.41,halfWidth:4.10,thickness:.24,
   sideReturn:.52,cheek:.12,cheekAtY:1.0,cheekAtX:3.0
  });
 }
 // A single dramatic nose ridge bridges the visor into the low exhale valve.
 extrudedProfile(g,m.rubber,'m50-raised-nasal-bridge',[
  [-.52,2.96],[.52,2.96],[1.31,1.40],
  [.85,.37],[-.85,.37],[-1.31,1.40]
 ],-5.52,.35,.10);
 outlet(g,m,'m50-low-exhale-module',0,-.08,-5.83,.96);
 compactHarness(g,m,2.10,5.04);
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
