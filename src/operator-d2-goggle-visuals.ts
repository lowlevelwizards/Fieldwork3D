/** Eyewear R3-3: three distinct authored sealed-eye assemblies.
 * Compact close-fitting seal / deep tapered dust shell / twin retro barrels.
 * Every housing has different front AND rear loops, never a flat extrusion.
 * Construct four wearable positions once; swap visibility without rebuilding.
 */
import * as THREE from 'three';
import {sculptedHousing,lensSurface,block,strapBand,octagon,
 type EyePolygon} from './operator-d2-eyewear-shell.ts';
export type D2GoggleId='goggles-low'|'goggles-field'|'goggles-retro';
export type D2GogglePlacement='eyes'|'forehead'|'helmet'|'neck';
function low(root:THREE.Group,
 frame:THREE.Material,lens:THREE.Material,elastic:THREE.Material):void{
 root.userData.d2EyeFitTop=4.73;
 root.userData.d2EyeDesign='R3-compact-eye-seal';
 // The bridge has a shallow nasal relief, not a theatrical raised V.
 const outer:EyePolygon=[
  [-3.49,4.70],[3.49,4.70],[3.49,2.52],
  [2.05,2.26],[.73,2.78],[-.73,2.78],
  [-2.05,2.26],[-3.49,2.52]
 ];
 const inner:EyePolygon=[
  [-2.91,4.20],[2.91,4.20],[2.91,2.94],
  [2.02,2.82],[.73,3.18],[-.73,3.18],
  [-2.02,2.82],[-2.91,2.94]
 ];
 const rearOuter:EyePolygon=[
  [-3.23,4.48],[3.23,4.48],[3.23,2.59],
  [2.01,2.45],[.73,2.95],[-.73,2.95],
  [-2.01,2.45],[-3.23,2.59]
 ];
 const rearInner:EyePolygon=[
  [-2.66,4.04],[2.66,4.04],[2.66,3.01],
  [1.96,2.91],[.73,3.28],[-.73,3.28],
  [-1.96,2.91],[-2.66,3.01]
 ];
 sculptedHousing(root,frame,'one-piece-compact-seal',
  outer,inner,rearOuter,rearInner,-5.29,-4.15,
  'compact-seal','single-sealed');
 lensSurface(root,lens,'compact-protective-pane',inner,-5.33);
 strapBand(root,elastic,3.53,3.57,.64);
}
function field(root:THREE.Group,
 frame:THREE.Material,lens:THREE.Material,elastic:THREE.Material):void{
 root.userData.d2EyeFitTop=5.03;
 root.userData.d2EyeDesign='R3-deep-dust-bunker';
 const outer:EyePolygon=[
  [-4.22,4.98],[4.22,4.98],[4.22,2.14],
  [2.78,1.78],[.83,2.23],[-.83,2.23],
  [-2.78,1.78],[-4.22,2.14]
 ];
 const inner:EyePolygon=[
  [-3.48,4.42],[3.48,4.42],[3.48,2.61],
  [2.60,2.43],[.83,2.81],[-.83,2.81],
  [-2.60,2.43],[-3.48,2.61]
 ];
 const backOuter:EyePolygon=[
  [-3.91,4.69],[3.91,4.69],[3.91,2.34],
  [2.72,2.07],[.82,2.49],[-.82,2.49],
  [-2.72,2.07],[-3.91,2.34]
 ];
 const backInner:EyePolygon=[
  [-3.29,4.21],[3.29,4.21],[3.29,2.79],
  [2.55,2.62],[.82,2.97],[-.82,2.97],
  [-2.55,2.62],[-3.29,2.79]
 ];
 sculptedHousing(root,frame,'single-mass-deep-field-shell',
  outer,inner,backOuter,backInner,-6.21,-4.15,
  'field-seal','single-sealed');
 lensSurface(root,lens,'deep-dust-pane',inner,-6.25);
 strapBand(root,elastic,4.26,3.68,.94);
}
function retro(root:THREE.Group,
 frame:THREE.Material,lens:THREE.Material,elastic:THREE.Material):void{
 root.userData.d2EyeFitTop=5.15;
 root.userData.d2EyeDesign='R3-twin-faceted-barrels';
 // Each octagonal port is a full tapered barrel with its own rear loop.
 for(const side of [-1,1] as const){
  const cx=side*1.92;
  const outer=octagon(cx,3.68,1.78,1.80);
  const inner=octagon(cx,3.68,1.16,1.17);
  const backOuter=octagon(cx,3.68,1.50,1.55);
  const backInner=octagon(cx,3.68,1.03,1.10);
  sculptedHousing(root,frame,'vintage-faceted-barrel',
   outer,inner,backOuter,backInner,-6.40,-4.18,
   'cups','twin-cups');
  lensSurface(root,lens,'vintage-round-pane',inner,-6.44);
 }
 block(root,frame,'single-bold-vintage-bridge',
  0,3.72,-5.16,.96,.65,1.78);
 strapBand(root,elastic,4.12,3.70,.76);
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
  id==='goggles-low'?4.70:id==='goggles-field'?4.98:5.15;
 for(const placement of ['eyes','forehead','helmet','neck'] as const){
  const model=createOne(id,frame,lens,elastic);
  model.name=id+'-'+placement;
  model.userData.d2GogglePlacement=placement;
  model.userData.d2DefaultPosition=new THREE.Vector3();
  if(placement==='forehead'){
   model.position.set(0,2.58,-.28);
  }else if(placement==='helmet'){
   // Raised assembly rests on helmet brow; no uniform scale-up.
   model.position.set(0,3.26,-1.12);
  }else if(placement==='neck'){
   model.position.set(0,-5.18,.91);
   model.scale.set(.89,.89,.89);
  }
  model.userData.d2DefaultPosition.copy(model.position);
  model.visible=placement==='eyes';
  root.add(model);
 }
 return root;
}
