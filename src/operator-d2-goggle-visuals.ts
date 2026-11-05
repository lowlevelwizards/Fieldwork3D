/** Eyewear R4.2: three *different* protection construction fantasies.
 * Sport-close W seal, huge dust bunker, and leather-backed motor goggles.
 * Four fit states built once and switched by visibility in the wardrobe.
 */
import * as THREE from 'three';
import {sculptedHousing,frameRing,lensSurface,block,strapBand,taperedGoggleStrap,octagon,
 type EyePolygon} from './operator-d2-eyewear-shell.ts';
export type D2GoggleId='goggles-low'|'goggles-field'|'goggles-retro';
export type D2GogglePlacement='eyes'|'forehead'|'helmet'|'neck';
function low(root:THREE.Group,frame:THREE.Material,
 lens:THREE.Material,elastic:THREE.Material):void{
 root.userData.d2EyeFitTop=4.75;
 root.userData.d2EyeDesign='R5-low-profile-panoramic-flex-seal';
 // Close-fitting Smith Boogie-like single lens. The top rises gently over
 // the outer eye; the nose saddle is a soft notch, not a tiny field-goggle V.
 // A broad pane fills the frame and the shell never becomes a deep box.
 const outer:EyePolygon=[
  [-3.82,4.36],[-2.62,4.73],[0,4.58],
  [2.62,4.73],[3.82,4.36],[3.76,3.31],
  [2.48,2.70],[.83,3.13],[-.83,3.13],
  [-2.48,2.70],[-3.76,3.31]
 ];
 const inner:EyePolygon=[
  [-3.45,4.13],[-2.45,4.43],[0,4.30],
  [2.45,4.43],[3.45,4.13],[3.35,3.47],
  [2.40,3.05],[.81,3.49],[-.81,3.49],
  [-2.40,3.05],[-3.35,3.47]
 ];
 const rearOuter:EyePolygon=[
  [-3.68,4.28],[-2.51,4.57],[0,4.44],
  [2.51,4.57],[3.68,4.28],[3.58,3.41],
  [2.43,2.84],[.81,3.30],[-.81,3.30],
  [-2.43,2.84],[-3.58,3.41]
 ];
 const rearInner:EyePolygon=[
  [-3.22,4.03],[-2.32,4.31],[0,4.18],
  [2.32,4.31],[3.22,4.03],[3.11,3.56],
  [2.31,3.18],[.77,3.58],[-.77,3.58],
  [-2.31,3.18],[-3.11,3.56]
 ];
 sculptedHousing(root,frame,'single-mass-sport-seal',
  outer,inner,rearOuter,rearInner,-5.04,-4.19,
  'compact-seal','single-sealed');
 lensSurface(root,lens,'sport-panoramic-pane',inner,-5.08);
 // Flexible tapered fabric is a materially different construction from
 // the deep bunker gasket. No long rectangular strap-side boxes.
 taperedGoggleStrap(root,elastic,'sport-strap',{
  frontX:3.87,frontY:3.81,frontZ:-4.28,
  shoulderX:4.37,shoulderY:3.80,shoulderZ:-3.73,
  rearX:4.30,rearY:3.79,rearZ:3.46,
  frontHeight:.70,shoulderHeight:.61,rearHeight:.51,
  frontWidth:.58,shoulderWidth:.55,rearWidth:.46
 },.54);
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
 strapBand(root,elastic,4.55,3.74,.96);
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
 strapBand(root,elastic,4.41,3.82,.70);
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
  id==='goggles-low'?4.75:id==='goggles-field'?5.07:5.06;
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
