/** Eyewear R4.2: three *different* protection construction fantasies.
 * Sport-close W seal, huge dust bunker, and leather-backed motor goggles.
 * Four fit states built once and switched by visibility in the wardrobe.
 */
import * as THREE from 'three';
import {sculptedHousing,frameRing,lensSurface,block,strapBand,octagon,
 type EyePolygon} from './operator-d2-eyewear-shell.ts';
export type D2GoggleId='goggles-low'|'goggles-field'|'goggles-retro';
export type D2GogglePlacement='eyes'|'forehead'|'helmet'|'neck';
function low(root:THREE.Group,frame:THREE.Material,
 lens:THREE.Material,elastic:THREE.Material):void{
 root.userData.d2EyeFitTop=4.80;
 root.userData.d2EyeDesign='R4-shallow-W-sport-seal';
 // Low-profile is an angular, two-lobed sports mask, NOT a miniature
 // rectangular field goggle. The deep center cut defines its own family.
 const outer:EyePolygon=[
  [-3.80,4.65],[-2.18,4.80],[0,4.60],
  [2.18,4.80],[3.80,4.65],[3.64,3.01],
  [2.24,2.57],[.68,3.40],[-.68,3.40],
  [-2.24,2.57],[-3.64,3.01]
 ];
 const inner:EyePolygon=[
  [-3.23,4.24],[-2.10,4.36],[0,4.17],
  [2.10,4.36],[3.23,4.24],[3.15,3.29],
  [2.24,3.02],[.65,3.77],[-.65,3.77],
  [-2.24,3.02],[-3.15,3.29]
 ];
 const rearOuter:EyePolygon=[
  [-3.64,4.53],[-2.14,4.65],[0,4.48],
  [2.14,4.65],[3.64,4.53],[3.52,3.10],
  [2.24,2.73],[.68,3.56],[-.68,3.56],
  [-2.24,2.73],[-3.52,3.10]
 ];
 const rearInner:EyePolygon=[
  [-3.03,4.10],[-2.06,4.18],[0,4.04],
  [2.06,4.18],[3.03,4.10],[2.97,3.39],
  [2.20,3.17],[.65,3.88],[-.65,3.88],
  [-2.20,3.17],[-2.97,3.39]
 ];
 sculptedHousing(root,frame,'single-mass-closefit-W',
  outer,inner,rearOuter,rearInner,-5.34,-4.17,
  'compact-seal','single-sealed');
 lensSurface(root,lens,'W-shaped-sport-pane',inner,-5.38);
 strapBand(root,elastic,3.95,3.67,.48);
}
function field(root:THREE.Group,frame:THREE.Material,
 lens:THREE.Material,elastic:THREE.Material):void{
 root.userData.d2EyeFitTop=5.07;
 root.userData.d2EyeDesign='R4-heavy-bunker-goggle';
 // Tall massive protective frame, broad cheek shoulders and a bold
 // separate center arch: completely different from compact W sport seal.
 const outer:EyePolygon=[
  [-4.42,4.97],[4.42,4.97],[4.45,4.18],
  [4.31,2.16],[2.98,1.86],[1.39,2.05],
  [.75,2.77],[-.75,2.77],[-1.39,2.05],
  [-2.98,1.86],[-4.31,2.16],[-4.45,4.18]
 ];
 const inner:EyePolygon=[
  [-3.74,4.40],[3.74,4.40],[3.76,4.06],
  [3.62,2.79],[2.75,2.52],[1.37,2.61],
  [.75,3.25],[-.75,3.25],[-1.37,2.61],
  [-2.75,2.52],[-3.62,2.79],[-3.76,4.06]
 ];
 const backOuter:EyePolygon=[
  [-4.10,4.69],[4.10,4.69],[4.11,4.14],
  [4.00,2.41],[2.91,2.15],[1.37,2.33],
  [.77,3.00],[-.77,3.00],[-1.37,2.33],
  [-2.91,2.15],[-4.00,2.41],[-4.11,4.14]
 ];
 const backInner:EyePolygon=[
  [-3.43,4.21],[3.43,4.21],[3.45,4.02],
  [3.32,2.98],[2.63,2.74],[1.35,2.84],
  [.75,3.43],[-.75,3.43],[-1.35,2.84],
  [-2.63,2.74],[-3.32,2.98],[-3.45,4.02]
 ];
 sculptedHousing(root,frame,'single-mass-deep-field-shell',
  outer,inner,backOuter,backInner,-6.39,-4.19,
  'field-seal','single-sealed');
 lensSurface(root,lens,'deep-dust-pane',inner,-6.43);
 // One continuous material gasket behind the outer polycarbonate housing.
 frameRing(root,elastic,'field-soft-rear-gasket',
  backOuter,[backInner],-4.17,.37,'field-seal');
 strapBand(root,elastic,4.42,3.74,.96);
}
function retro(root:THREE.Group,frame:THREE.Material,
 lens:THREE.Material,elastic:THREE.Material):void{
 root.userData.d2EyeFitTop=5.06;
 root.userData.d2EyeDesign='R4-faceted-vintage-motor-eyes';
 // Broad soft leather-like backing with two generously open circular
 // eyeholes: now it is protective motor wear, not detached metal binoculars.
 const leftCut=octagon(-1.90,3.68,1.18,1.14);
 const rightCut=octagon(1.90,3.68,1.18,1.14);
 const backing:EyePolygon=[
  [-4.11,4.93],[4.11,4.93],[4.14,2.65],
  [2.90,2.25],[0,2.39],[-2.90,2.25],[-4.14,2.65]
 ];
 frameRing(root,elastic,'connected-vintage-leather',
  backing,[leftCut,rightCut],-4.73,.43,'cups');
 for(const side of [-1,1] as const){
  const cx=side*1.90;
  const outer=octagon(cx,3.68,1.69,1.61);
  const inner=octagon(cx,3.68,1.22,1.15);
  const backOuter=octagon(cx,3.68,1.49,1.43);
  const backInner=octagon(cx,3.68,1.14,1.08);
  sculptedHousing(root,frame,'vintage-faceted-barrel',
   outer,inner,backOuter,backInner,-5.81,-4.30,
   'cups','twin-cups');
  lensSurface(root,lens,'vintage-round-pane',inner,-5.85);
 }
 block(root,elastic,'single-bold-vintage-bridge',0,3.78,-4.97,.85,.69,.64);
 strapBand(root,elastic,4.17,3.82,.70);
}
function createOne(id:D2GoggleId,frame:THREE.Material,
 lens:THREE.Material,elastic:THREE.Material):THREE.Group{
 const root=new THREE.Group();
 if(id==='goggles-low')low(root,frame,lens,elastic);
 else if(id==='goggles-field')field(root,frame,lens,elastic);
 else retro(root,frame,lens,elastic);
 return root;
}
export function createD2Goggles(
 id:D2GoggleId,frame:THREE.Material,
 lens:THREE.Material,elastic:THREE.Material
):THREE.Group{
 const root=new THREE.Group();root.name='d2-'+id;
 root.userData.modelAxes='-Z-forward,+X-right,+Y-up';
 root.userData.d2EyeFitTop=
  id==='goggles-low'?4.80:id==='goggles-field'?5.07:5.06;
 for(const placement of ['eyes','forehead','helmet','neck'] as const){
  const model=createOne(id,frame,lens,elastic);
  model.name=id+'-'+placement;
  model.userData.d2GogglePlacement=placement;
  model.userData.d2DefaultPosition=new THREE.Vector3();
  if(placement==='forehead')model.position.set(0,2.58,-.28);
  else if(placement==='helmet')model.position.set(0,3.26,-1.12);
  else if(placement==='neck'){
   model.position.set(0,-5.18,.91);
   model.scale.set(.89,.89,.89);
  }
  model.userData.d2DefaultPosition.copy(model.position);
  model.visible=placement==='eyes';
  root.add(model);
 }
 return root;
}
