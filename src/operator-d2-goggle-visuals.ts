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
 root.userData.d2EyeFitTop=4.88;
 root.userData.d2EyeDesign='R11-contoured-compact-protection';
 // R11: distinct from the deep field bunker AND from open shooting lenses.
 // A continuous shallow shell uses a large W-shaped nose clearance and
 // two full cheek bays. Keep this one sealed mesh, not assembled blocks.
 const outer:EyePolygon=[
  [-3.85,4.10],[-3.62,4.60],[-2.75,4.84],[-1.25,4.88],
  [1.25,4.88],[2.75,4.84],[3.62,4.60],[3.85,4.10],
  [3.70,3.12],[2.85,2.48],[1.90,2.37],[1.32,2.57],
  [.66,3.48],[-.66,3.48],[-1.32,2.57],[-1.90,2.37],
  [-2.85,2.48],[-3.70,3.12]
 ];
 // Upper aperture is intentionally lower than the rim (> .42 unit roof)
 // for a protective seal, instead of reading like open shooting glasses.
 const inner:EyePolygon=[
  [-3.47,4.04],[-3.29,4.28],[-2.53,4.38],[-1.24,4.40],
  [1.24,4.40],[2.53,4.38],[3.29,4.28],[3.47,4.04],
  [3.34,3.32],[2.67,2.86],[1.97,2.80],[1.66,3.03],
  [.65,3.98],[-.65,3.98],[-1.66,3.03],[-1.97,2.80],
  [-2.67,2.86],[-3.34,3.32]
 ];
 const rearOuter:EyePolygon=[
  [-3.64,4.04],[-3.40,4.48],[-2.62,4.71],[-1.22,4.75],
  [1.22,4.75],[2.62,4.71],[3.40,4.48],[3.64,4.04],
  [3.52,3.20],[2.71,2.61],[1.83,2.54],[1.28,2.68],
  [.65,3.55],[-.65,3.55],[-1.28,2.68],[-1.83,2.54],
  [-2.71,2.61],[-3.52,3.20]
 ];
 const rearInner:EyePolygon=[
  [-3.28,3.99],[-3.08,4.20],[-2.42,4.34],[-1.22,4.36],
  [1.22,4.36],[2.42,4.34],[3.08,4.20],[3.28,3.99],
  [3.14,3.39],[2.55,2.97],[1.91,2.90],[1.70,3.12],
  [.67,4.00],[-.67,4.00],[-1.70,3.12],[-1.91,2.90],
  [-2.55,2.97],[-3.14,3.39]
 ];
 sculptedHousing(root,frame,'single-mass-sport-seal',
  outer,inner,rearOuter,rearInner,-5.04,-4.22,
  'compact-seal','single-sealed');
 lensSurface(root,lens,'sport-panoramic-pane',inner,-5.08);
 // Broad joined textile strap wraps around the entire 8-unit head.
 // The fitted three-station sides visibly intersect the housing and
 // rear block, without adding any hinges, vents or micro-details.
 taperedGoggleStrap(root,elastic,'sport-strap',{
  frontX:3.84,frontY:3.72,frontZ:-4.48,
  shoulderX:4.44,shoulderY:3.72,shoulderZ:-3.76,
  rearX:4.35,rearY:3.72,rearZ:4.12,
  frontHeight:1.25,shoulderHeight:1.03,rearHeight:.91,
  frontWidth:.80,shoulderWidth:.69,rearWidth:.58
 },.98);
}
function field(root:THREE.Group,frame:THREE.Material,
 lens:THREE.Material,elastic:THREE.Material):void{
 root.userData.d2EyeFitTop=5.34;
 root.userData.d2EyeDesign='R8-connected-field-strap';
 // A heavy field protection silhouette with broad elevated brow shoulders.
 // The two top angles and deep cheek stops replace the R5 brick-flat roof.
 // The rear flange tapers deliberately inward toward a fitted face gasket.
 const outer:EyePolygon=[
  [-4.28,5.13],[-3.10,5.34],[3.10,5.34],[4.28,5.13],
  [4.46,4.50],[4.26,2.24],[3.00,1.92],[1.44,2.06],
  [.74,2.84],[-.74,2.84],[-1.44,2.06],[-3.00,1.92],
  [-4.26,2.24],[-4.46,4.50]
 ];
 const inner:EyePolygon=[
  [-3.73,4.64],[-2.82,4.83],[2.82,4.83],[3.73,4.64],
  [3.88,4.25],[3.59,2.84],[2.76,2.61],[1.39,2.66],
  [.73,3.23],[-.73,3.23],[-1.39,2.66],[-2.76,2.61],
  [-3.59,2.84],[-3.88,4.25]
 ];
 const backOuter:EyePolygon=[
  [-3.79,4.93],[-2.92,5.07],[2.92,5.07],[3.79,4.93],
  [4.04,4.32],[3.78,2.53],[2.84,2.30],[1.37,2.40],
  [.70,2.99],[-.70,2.99],[-1.37,2.40],[-2.84,2.30],
  [-3.78,2.53],[-4.04,4.32]
 ];
 const backInner:EyePolygon=[
  [-3.25,4.48],[-2.72,4.58],[2.72,4.58],[3.25,4.48],
  [3.44,4.07],[3.21,3.06],[2.59,2.83],[1.34,2.90],
  [.67,3.38],[-.67,3.38],[-1.34,2.90],[-2.59,2.83],
  [-3.21,3.06],[-3.44,4.07]
 ];
 // One intermediate contour creates a deliberate shoulder-to-gasket
 // taper without extra housing objects or fine decorative geometry.
 const midOuter:EyePolygon=[
  [-4.08,5.02],[-3.00,5.22],[3.00,5.22],[4.08,5.02],
  [4.24,4.42],[4.01,2.37],[2.90,2.10],[1.41,2.25],
  [.72,2.93],[-.72,2.93],[-1.41,2.25],[-2.90,2.10],
  [-4.01,2.37],[-4.24,4.42]
 ];
 const midInner:EyePolygon=[
  [-3.55,4.56],[-2.79,4.72],[2.79,4.72],[3.55,4.56],
  [3.66,4.18],[3.43,2.91],[2.68,2.73],[1.38,2.78],
  [.71,3.29],[-.71,3.29],[-1.38,2.78],[-2.68,2.73],
  [-3.43,2.91],[-3.66,4.18]
 ];
 sculptedHousing(root,frame,'single-mass-deep-field-shell',
  outer,inner,backOuter,backInner,-5.88,-4.22,
  'field-seal','single-sealed',
  {outer:midOuter,inner:midInner,z:-4.77});
 lensSurface(root,lens,'deep-dust-pane',inner,-5.92);
 // One fitted, continuous rear cushion and one textile band; no vents
 // or boxes. The natural angled side wall now provides the shell character.
 frameRing(root,elastic,'field-soft-rear-gasket',
  backOuter,[backInner],-4.18,.33,'field-seal');
 taperedGoggleStrap(root,elastic,'field-tapered-strap',{
  frontX:4.17,frontY:3.86,frontZ:-4.66,
  shoulderX:4.49,shoulderY:3.81,shoulderZ:-3.79,
  rearX:4.33,rearY:3.79,rearZ:4.12,
  frontHeight:1.48,shoulderHeight:1.20,rearHeight:1.04,
  frontWidth:.80,shoulderWidth:.73,rearWidth:.58
 },1.10);
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
  id==='goggles-low'?4.88:id==='goggles-field'?5.34:5.06;
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
