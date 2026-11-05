/**
 * D2-R: six independently authored protective facewear silhouettes.
 * No runtime geometry rebuilds; all modes are preconstructed once.
 * Reference coordinate space: -Z forward, +X right, +Y up.
 */
import * as THREE from 'three';
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
function tactical(g:THREE.Group,m:MaskMaterials,meshFront:boolean){
 const outline=poly([
  [-1.14,3.11],[1.14,3.11],[2.15,2.73],[3.87,2.35],
  [3.88,.67],[2.89,-.37],[1.9,-.72],[-1.9,-.72],
  [-2.89,-.37],[-3.88,.67],[-3.87,2.35],[-2.15,2.73]
 ]);
 plate(g,m.rubber,'rigid-half-mask-face',{
  outline,front:-4.95,depth:.56,edgeReturn:.38,nose:.54
 });
 extrudedProfile(g,m.rubber,'half-nasal-ridge',[
  [-.88,3.08],[.88,3.08],[1.28,2.42],[-1.28,2.42]
 ],-5.47,.33);
 // Side cheeks turn toward the temple; they are not parallel front blocks.
 for(const sign of [-1,1] as const){
  const cheek=poly([
   [sign*3.0,2.48],[sign*4.24,2.25],
   [sign*4.28,.84],[sign*3.37,-.24],[sign*2.93,.03]
  ]);
  extrudedProfile(g,m.rubber,'half-shell-cheek',cheek,-4.70,.52,.38);
  sideProfile(g,m.rubber,'half-mask-cheek-return',sign,[
   [-4.64,2.50],[-3.00,2.25],[-2.04,1.73],
   [-2.08,.44],[-3.10,-.40],[-4.71,-.53]
  ],4.04,.48);
  strap(g,m.hardware,'half-strap-side',[
   [sign*4.05,2.12,-4.05],[sign*4.50,2.12,-1.5],
   [sign*4.47,2.10,2.35],[sign*3.45,2.1,4.45]
  ],.42);
  block(g,m.hardware,'half-strap-buckle',
   sign*4.36,2.09,-3.07,.61,.70,.57);
 }
 strap(g,m.hardware,'half-strap-back',[
  [-3.46,2.10,4.43],[0,2.10,4.50],[3.46,2.10,4.43]
 ],.45);
 if(meshFront){
  const grille=poly([
   [-2.65,2.12],[2.65,2.12],[2.82,.28],
   [1.71,-.32],[-1.71,-.32],[-2.82,.28]
  ]);
  extrudedProfile(g,m.filters,'wide-mesh-grille',grille,-5.62,.13,.15);
  // Four legible broad gaps, not hundreds of aliased holes.
  for(let i=-2;i<=2;i++)
   block(g,m.hardware,'mesh-reinforcement',i*1.0,1.05,-5.79,.19,1.38,.12);
 }else{
  extrudedProfile(g,m.filters,'hard-nose-panel',[
   [-2.13,1.95],[2.13,1.95],[2.17,.41],[-2.17,.41]
  ],-5.61,.14,.15);
  block(g,m.hardware,'low-air-intake',0,.13,-5.77,3.64,.38,.18);
 }
}
function industrial(g:THREE.Group,m:MaskMaterials,compact:boolean){
 const seal=poly([
  [-.88,3.51],[.88,3.51],[1.69,2.92],[2.82,1.98],
  [2.98,.42],[1.93,-.50],[.90,-.84],[-.90,-.84],
  [-1.93,-.50],[-2.98,.42],[-2.82,1.98],[-1.69,2.92]
 ]);
 plate(g,m.rubber,'respirator-triangular-seal',{
  outline:seal,front:-4.87,depth:.68,edgeReturn:.45,nose:.76
 });
 extrudedProfile(g,m.rubber,'respirator-nose-peak',[
  [-.88,3.45],[.88,3.45],[1.36,2.68],[-1.36,2.68]
 ],-5.43,.41);
 outlet(g,m,'respirator-valve',0,.10,-5.78,.84);
 if(compact){
  canister(g,m.hardware,'compact-filter-seat',0,1.23,-5.92,1.20,.47);
  canister(g,m.filters,'compact-front-filter',0,1.24,-6.61,1.33,1.30);
 }else for(const sign of [-1,1] as const){
  canister(g,m.hardware,'dual-filter-port',
   sign*2.82,1.24,-5.40,.91,.50,sign*.25);
  canister(g,m.filters,'dual-filter-canister',
   sign*3.33,1.22,-6.24,1.27,1.58,sign*.38);
 }
 for(const sign of [-1,1] as const)
  sideProfile(g,m.rubber,'respirator-cheek-seal',sign,[
   [-4.61,3.20],[-3.05,2.73],[-2.28,1.84],
   [-2.34,.02],[-3.53,-.64],[-4.66,-.71]
  ],4.02,.48);
 rearHarness(g,m,1.92);
}
function hood(g:THREE.Group,m:MaskMaterials){
 const leftRight=pair(1.94,3.76,1.34,1.37);
 // Crown and rear wrap around the 8-unit skull; no regular head harness.
 fittedHoodLoft(g,m.rubber);
 for(const sign of [-1,1] as const){
  extrudedProfile(g,m.rubber,'hood-neck-side',[
   [sign*3.30,-.88],[sign*4.03,-.88],
   [sign*3.82,-2.31],[sign*3.10,-2.31]
  ],-4.1,.44);
 }
 const front=poly([
  [-4.33,7.21],[4.33,7.21],[4.46,4.72],
  [4.12,1.13],[3.37,-.85],[3.49,-2.24],
  [-3.49,-2.24],[-3.37,-.85],[-4.12,1.13],[-4.46,4.72]
 ]);
 plate(g,m.rubber,'gp5-hood-front',{
  outline:front,holes:leftRight,front:-4.48,
  depth:.40,edgeReturn:.22,nose:.78
 });
 pairedEyes(g,m,'gp5-round-eye',leftRight,-4.75,.36,.12);
 extrudedProfile(g,m.rubber,'gp5-conical-mouth',[
  [-2.63,2.12],[2.63,2.12],[2.01,.22],
  [1.44,-.71],[-1.44,-.71],[-2.01,.22]
 ],-5.20,.47,.20);
 canister(g,m.hardware,'gp5-front-port',0,.15,-5.73,1.39,.68,0,-.30);
 canister(g,m.filters,'gp5-central-canister',
  0,-1.38,-5.84,1.39,2.55,0,-4.0);
 canister(g,m.hardware,'gp5-filter-base',
  0,-2.19,-6.07,1.46,.32,0,-4.0);
 block(g,m.rubber,'hood-neck-collar',0,-2.19,.20,7.35,.38,7.50);
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
