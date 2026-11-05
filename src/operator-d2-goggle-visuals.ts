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
 root.userData.d2EyeFitTop=4.82;
 root.userData.d2EyeDesign='R7-bold-rim-compact-sport-goggles';
 // Sports-protective silhouette: a lightweight upper arch and ONE generous
 // wraparound pane, not a miniature of the tall bunker field goggles.
 // Increased vertical coverage comes principally from the cheek outline,
 // leaving the cap-adjacent upper edge tucked below the brim.
 const outer:EyePolygon=[
  [-3.80,4.38],[-2.73,4.70],[-1.11,4.82],
  [1.11,4.82],[2.73,4.70],[3.80,4.38],
  [3.75,3.19],[2.52,2.41],[.87,2.87],
  [-.87,2.87],[-2.52,2.41],[-3.75,3.19]
 ];
 const inner:EyePolygon=[
  [-3.43,4.05],[-2.52,4.32],[-1.04,4.36],
  [1.04,4.36],[2.52,4.32],[3.43,4.05],
  [3.37,3.40],[2.40,2.78],[.84,3.20],
  [-.84,3.20],[-2.40,2.78],[-3.37,3.40]
 ];
 const rearOuter:EyePolygon=[
  [-3.66,4.30],[-2.61,4.59],[-1.07,4.68],
  [1.07,4.68],[2.61,4.59],[3.66,4.30],
  [3.53,3.31],[2.47,2.57],[.81,3.01],
  [-.81,3.01],[-2.47,2.57],[-3.53,3.31]
 ];
 const rearInner:EyePolygon=[
  [-3.18,4.01],[-2.41,4.23],[-1.01,4.27],
  [1.01,4.27],[2.41,4.23],[3.18,4.01],
  [3.08,3.50],[2.31,2.94],[.78,3.32],
  [-.78,3.32],[-2.31,2.94],[-3.08,3.50]
 ];
 sculptedHousing(root,frame,'single-mass-sport-seal',
  outer,inner,rearOuter,rearInner,-5.04,-4.19,
  'compact-seal','single-sealed');
 lensSurface(root,lens,'sport-panoramic-pane',inner,-5.08);
 // Broad continuous flexible textile band; no boxes, vents or buckles.
 taperedGoggleStrap(root,elastic,'sport-strap',{
  frontX:3.87,frontY:3.81,frontZ:-4.28,
  shoulderX:4.37,shoulderY:3.80,shoulderZ:-3.73,
  rearX:4.30,rearY:3.79,rearZ:3.46,
  frontHeight:.79,shoulderHeight:.63,rearHeight:.51,
  frontWidth:.60,shoulderWidth:.55,rearWidth:.46
 },.54);
}
function field(root:THREE.Group,frame:THREE.Material,
 lens:THREE.Material,elastic:THREE.Material):void{
 root.userData.d2EyeFitTop=5.34;
 root.userData.d2EyeDesign='R6-sculpted-bunker-dust-goggles';
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
 sculptedHousing(root,frame,'single-mass-deep-field-shell',
  outer,inner,backOuter,backInner,-5.88,-4.22,
  'field-seal','single-sealed');
 lensSurface(root,lens,'deep-dust-pane',inner,-5.92);
 // One fitted, continuous rear cushion and one textile band; no vents
 // or boxes. The natural angled side wall now provides the shell character.
 frameRing(root,elastic,'field-soft-rear-gasket',
  backOuter,[backInner],-4.18,.33,'field-seal');
 taperedGoggleStrap(root,elastic,'field-tapered-strap',{
  frontX:4.09,frontY:3.82,frontZ:-4.36,
  shoulderX:4.48,shoulderY:3.79,shoulderZ:-3.76,
  rearX:4.33,rearY:3.79,rearZ:3.48,
  frontHeight:1.03,shoulderHeight:.85,rearHeight:.64,
  frontWidth:.58,shoulderWidth:.66,rearWidth:.51
 },.67);
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
  id==='goggles-low'?4.82:id==='goggles-field'?5.34:5.06;
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
