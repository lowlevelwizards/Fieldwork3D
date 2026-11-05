/** Eyewear R4.1: seven-family character pass, spectacles and shooting eyewear.
 * All dimensions authored for the 8-unit cubic head, looking down -Z.
 * Distinct silhouette first, no per-frame construction and no micro-geometries.
 */
import * as THREE from 'three';
import {frameRing,sweptFrame,lensSurface,block,octagon,shifted,
 fittedTempleArm,type EyewearTempleFit,
 type EyePoint,type EyePolygon} from './operator-d2-eyewear-shell.ts';
export type D2GlassesId=
 'glasses-standard'|'glasses-aviator'|'glasses-wrap'|'glasses-shield';
export type D2GlassesVariant='rectangular'|'round'|'heavy-square';
const mirror=(pts:EyePolygon):EyePoint[]=>
 pts.map(([x,y])=>[-x,y]);
function outsideTemples(parent:THREE.Group,frame:THREE.Material,
 name:string,partial:Partial<EyewearTempleFit>={}):void{
 const fit:EyewearTempleFit={
  frontX:4.14,frontY:3.84,frontZ:-4.92,
  shoulderX:4.37,shoulderY:3.82,shoulderZ:-4.36,
  rearX:4.32,rearY:3.80,rearZ:3.38,
  frontHeight:.76,shoulderHeight:.72,rearHeight:.45,
  frontWidth:.58,shoulderWidth:.66,rearWidth:.45,...partial
 };
 for(const side of [-1,1] as const)
  fittedTempleArm(parent,frame,name,side,fit);
}
function standard(parent:THREE.Group,frame:THREE.Material,
 lens:THREE.Material,variant:D2GlassesVariant){
 const root=new THREE.Group();root.name='standard-'+variant;
 root.userData.d2EyeVariant=variant;
 root.userData.d2EyeDesign='R4-oversized-acetate-with-outside-temples';
 root.userData.d2EyeFitTop=4.88;
 if(variant==='round'){
  // The round subvariant is still a casual civilian frame, not motor goggles.
  for(const sign of [-1,1] as const){
   const cx=sign*2.05;
   const outer=octagon(cx,3.53,1.72,1.39);
   const inner=octagon(cx,3.53,1.19,.92);
   frameRing(root,frame,'bold-civilian-round',outer,[inner],-4.98,.62,'open-frame');
   lensSurface(root,lens,'civilian-round',inner,-5.03);
  }
  block(root,frame,'thick-acetate-bridge',0,3.93,-4.80,.98,.55,.72);
 }else{
  const heavy=variant==='heavy-square';
  // Extend slightly OUTSIDE the skull; slightly chamfered lower corners
  // distinguish an acetate frame from a rectangular protective goggle.
  const outer:EyePolygon=heavy?[
   [-4.32,4.91],[4.32,4.91],[4.32,2.27],[4.02,2.02],
   [-4.02,2.02],[-4.32,2.27]
  ]:[
   [-4.23,4.82],[4.23,4.82],[4.23,2.34],[3.98,2.12],
   [-3.98,2.12],[-4.23,2.34]
  ];
  const left:EyePolygon=heavy?[
   [-3.70,4.24],[-.78,4.24],[-.78,2.73],[-3.47,2.73],[-3.70,2.90]
  ]:[
   [-3.66,4.25],[-.84,4.25],[-.84,2.69],[-3.42,2.69],[-3.66,2.87]
  ];
  const right=mirror(left);
  frameRing(root,frame,'single-acetate-front',outer,[left,right],
   -4.99,heavy?.71:.58,'open-frame');
  lensSurface(root,lens,'civilian-square-left',left,-5.04);
  lensSurface(root,lens,'civilian-square-right',right,-5.04);
 }
 outsideTemples(root,frame,'one-piece-temple',{
  frontX:4.17,frontY:4.08,frontZ:-4.93,
  shoulderY:4.00,rearY:3.78,frontHeight:.86
 });
 root.visible=variant==='rectangular';
 parent.add(root);
}
function aviator(root:THREE.Group,frame:THREE.Material,lens:THREE.Material){
 root.userData.d2EyeFitTop=5.13;
 root.userData.d2EyeDesign='R7-connected-pilot-double-bridge';
 // Each left-lens polygon is intentionally fuller toward -X (the outside).
 // The mirrored right lens reverses that bias. Broad flat foot rather than
 // pointed fangs, with the topmost shoulder over the outer cheek.
 // Deliberately retain thirteen meaningful facets per eye.
 // Outboard cheeks have broad flat-bottom fullness; the inner edge
 // tapers gently into the dual pilot bridge instead of ending in a fang.
 const out:EyePolygon=[
  [-1.83,3.72],[-1.90,4.48],[-1.56,4.96],
  [-.96,5.12],[-.10,5.12],[.75,4.89],
  [1.38,4.48],[1.53,4.04],[1.22,3.40],
  [.28,2.71],[-.30,2.39],[-1.33,2.39],[-1.74,2.84]
 ];
 const hole:EyePolygon=[
  [-1.43,3.72],[-1.49,4.32],[-1.24,4.65],
  [-.82,4.82],[-.12,4.82],[.58,4.61],
  [1.03,4.27],[1.14,4.03],[.86,3.52],
  [.08,2.98],[-.42,2.78],[-1.13,2.78],[-1.37,3.00]
 ];
 for(const side of [-1,1] as const){
  const x=side*2.08;
  const outline=shifted(side===-1?out:mirror(out),x);
  const aperture=shifted(side===-1?hole:mirror(hole),x);
  frameRing(root,frame,'pilot-lens-collar',outline,[aperture],
   -5.01,.38,'pilot');
  lensSurface(root,lens,'pilot-full-teardrop',aperture,-5.06);
 }
 // Both bridges are deliberate solid extrusions, not floating bars.
 // Their broad ends intersect the INNER rims at the heights where they meet
 // the lens collars. The high bridge has a subtle arch; the lower connector
 // forms a short saddle while preserving the open nose gap.
 const upperBridge:EyePolygon=[
  [-1.34,4.84],[-.62,5.00],[.62,5.00],[1.34,4.84],
  [1.34,4.57],[.60,4.70],[-.60,4.70],[-1.34,4.57]
 ];
 const lowerBridge:EyePolygon=[
  [-.88,4.20],[-.43,4.28],[.43,4.28],[.88,4.20],
  [.78,3.85],[.35,3.90],[-.35,3.90],[-.78,3.85]
 ];
 frameRing(root,frame,'pilot-upper-bridge',upperBridge,[],-5.05,.42,'pilot');
 frameRing(root,frame,'pilot-lower-bridge',lowerBridge,[],-5.04,.41,'pilot');
 outsideTemples(root,frame,'pilot-exterior-temple',{
  frontX:3.80,frontY:4.51,frontZ:-4.94,
  shoulderY:4.34,rearY:4.04,frontHeight:.56,
  shoulderHeight:.55,rearHeight:.38,
  frontWidth:.56,shoulderWidth:.54,rearWidth:.39
 });
}
function shooting(root:THREE.Group,frame:THREE.Material,lens:THREE.Material){
 root.userData.d2EyeFitTop=4.94;
 root.userData.d2EyeDesign='R6-clean-panoramic-shooting-glasses';
 // Approved R5 lens shape is unchanged: the single sweeping pane, open
 // underside and generous nasal relief define the shooting fantasy.
 const pane:EyePolygon=[
  [-4.18,4.52],[-4.42,4.15],[-3.92,3.16],
  [-2.89,2.61],[-1.04,2.66],[-.57,3.56],
  [.57,3.56],[1.04,2.66],[2.89,2.61],
  [3.92,3.16],[4.42,4.15],[4.18,4.52],
  [1.70,4.83],[-1.70,4.83]
 ];
 lensSurface(root,lens,'shooting-panoramic',pane,-5.18,1.02);
 // ONE eight-corner sculpted brow, no separate thin line or rear plate.
 // The rear of the .22-deep strip remains .10 ahead of the front of the
 // swept lens at every X: the previous deep band pierced the lens itself,
 // causing double black lines and unintended transparent overlaps.
 const brow:EyePolygon=[
  [-4.42,4.26],[-4.19,4.81],[0,4.98],[4.19,4.81],
  [4.42,4.26],[3.86,4.48],[0,4.70],[-3.86,4.48]
 ];
 sweptFrame(root,frame,'integrated-swept-frame',brow,[],-5.50,.22,1.02);
 // Two existing heavy, uninterrupted arms terminate into this brow.
 outsideTemples(root,frame,'continuous-swept-temple',{
  frontX:4.24,frontY:4.55,frontZ:-4.39,
  shoulderX:4.42,shoulderY:4.35,shoulderZ:-4.10,
  rearX:4.36,rearY:3.92,rearZ:3.37,
  frontHeight:.93,shoulderHeight:.79,rearHeight:.41
 });
}
function shield(root:THREE.Group,frame:THREE.Material,lens:THREE.Material){
 root.userData.d2EyeFitTop=4.80;
 root.userData.d2EyeDesign='R6-clean-contoured-eyeshield';
 const outline:EyePolygon=[
  [-4.26,4.73],[4.26,4.73],[4.15,2.26],
  [2.66,1.97],[1.03,2.17],[-1.03,2.17],
  [-2.66,1.97],[-4.15,2.26]
 ];
 const pane=lensSurface(root,lens,'continuous-ballistic-shield',outline,-5.11,.34);
 pane.userData.d2EyeProfile={
  family:'shield',topology:'single-shield',width:8.52,height:2.76,
  frontZ:-5.11,housingDepth:.18,lenses:1,version:3
 };
 block(root,frame,'single-mass-visor-brow',0,4.76,-4.99,8.70,.58,.79);
 outsideTemples(root,frame,'shield-support-temple',{
  frontX:4.15,frontY:4.26,frontZ:-4.93,
  shoulderY:4.11,rearY:3.91,frontHeight:.81,
  shoulderHeight:.76,rearHeight:.42
 });
}
export function createD2Glasses(
 id:D2GlassesId,frame:THREE.Material,lens:THREE.Material
):THREE.Group{
 const root=new THREE.Group();root.name='d2-'+id;
 root.userData.modelAxes='-Z-forward,+X-right,+Y-up';
 if(id==='glasses-standard'){
  root.userData.d2EyeFitTop=4.91;
  for(const variant of ['rectangular','round','heavy-square'] as const)
   standard(root,frame,lens,variant);
 }else if(id==='glasses-aviator')aviator(root,frame,lens);
 else if(id==='glasses-wrap')shooting(root,frame,lens);
 else shield(root,frame,lens);
 return root;
}
