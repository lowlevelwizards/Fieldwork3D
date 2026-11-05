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
 root.userData.d2EyeDesign='R11-faceted-acetate-and-outside-temples';
 root.userData.d2EyeFitTop=variant==='rectangular'?4.95:4.88;
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
  // R11: the default acetate frame has one sculpted outer contour with
  // bold rounded-square apertures, an integrated saddle bridge and a
  // readable nose opening. Heavy-square retains its approved proportions.
  const outer:EyePolygon=heavy?[
   [-4.32,4.91],[4.32,4.91],[4.32,2.27],[4.02,2.02],
   [-4.02,2.02],[-4.32,2.27]
  ]:[
   [-4.27,4.48],[-4.10,4.87],[-3.38,4.95],[-2.34,4.88],
   [-1.15,4.78],[-.60,4.65],[.60,4.65],[1.15,4.78],
   [2.34,4.88],[3.38,4.95],[4.10,4.87],[4.27,4.48],
   [4.20,2.77],[3.95,2.40],[3.34,2.18],[1.60,2.18],
   [.87,2.40],[.57,3.54],[-.57,3.54],[-.87,2.40],
   [-1.60,2.18],[-3.34,2.18],[-3.95,2.40],[-4.20,2.77]
  ];
  const left:EyePolygon=heavy?[
   [-3.70,4.24],[-.78,4.24],[-.78,2.73],[-3.47,2.73],[-3.70,2.90]
  ]:[
   [-3.66,4.23],[-3.25,4.39],[-2.26,4.38],[-1.23,4.22],
   [-.86,4.07],[-.83,3.75],[-1.02,3.15],[-1.37,2.78],
   [-3.13,2.73],[-3.52,2.98],[-3.70,3.39]
  ];
  const right=mirror(left);
  frameRing(root,frame,'single-acetate-front',outer,[left,right],
   -4.99,heavy?.71:.58,'open-frame');
  lensSurface(root,lens,'civilian-square-left',left,-5.04);
  lensSurface(root,lens,'civilian-square-right',right,-5.04);
 }
 outsideTemples(root,frame,'one-piece-temple',variant==='rectangular'?{
  frontX:4.17,frontY:4.42,frontZ:-4.91,
  shoulderX:4.40,shoulderY:4.19,shoulderZ:-4.28,
  rearX:4.32,rearY:3.82,rearZ:3.60,
  frontWidth:.75,shoulderWidth:.68,rearWidth:.50,
  frontHeight:.85,shoulderHeight:.68,rearHeight:.45
 }:{
  frontX:4.17,frontY:4.08,frontZ:-4.93,
  shoulderY:4.00,rearY:3.78,frontHeight:.86
 });
 root.visible=variant==='rectangular';
 parent.add(root);
}
function aviator(root:THREE.Group,frame:THREE.Material,lens:THREE.Material){
 root.userData.d2EyeFitTop=5.13;
 root.userData.d2EyeDesign='R10-close-set-rounded-pilot';
 // Classic pilot aviators: broad upper shoulder, full lower cheek and a
 // softly faceted teardrop rather than an outer bottom corner / spider eye.
 // R8's global 15-degree shear pulled every lower station outward, making
 // the lower outer return kink sharply. Author the profile directly instead.
 // Fifteen deliberate facets per ring; no new mesh parts or lens detailing.
 //
 // LEFT lens relative to the eye-center X: travel clockwise from the outer cheek,
 // across the broad top, down the inner nose edge, around the full foot.
 // The low shelf stays wide, while the outer cheek returns inward smoothly.
 const out:EyePolygon=[
  [-1.82,3.72],[-1.90,4.40],[-1.61,4.86],
  [-1.10,5.08],[-.28,5.12],[.48,5.00],
  [1.13,4.71],[1.46,4.31],[1.39,3.79],
  [1.03,3.27],[.38,2.64],[-.14,2.39],
  [-1.30,2.39],[-1.61,2.62],[-1.82,3.06]
 ];
 // Reauthored aperture follows the fuller contour with a bold even rim.
 // It remains strictly inside the outer silhouette on all fifteen facets.
 const hole:EyePolygon=[
  [-1.51,3.73],[-1.57,4.31],[-1.32,4.60],
  [-.98,4.79],[-.25,4.82],[.41,4.72],
  [.91,4.46],[1.10,4.17],[1.02,3.85],
  [.69,3.49],[.16,2.97],[-.37,2.75],
  [-1.05,2.75],[-1.30,2.87],[-1.50,3.19]
 ];
 for(const side of [-1,1] as const){
  // R10: move each complete lens ring and aperture 0.13 units toward
  // the nose, narrowing the pair by 0.26 overall. Preserve all of R9's
  // successful teardrop geometry, bridge masses and outside temple fit.
  const x=side*1.95;
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
 root.userData.d2EyeDesign='R8-single-clean-shooting-bow';
 // Approved R5 lens shape is unchanged: the single sweeping pane, open
 // underside and generous nasal relief define the shooting fantasy.
 const pane:EyePolygon=[
  [-4.18,4.52],[-4.42,4.15],[-3.92,3.16],
  [-2.89,2.61],[-1.04,2.66],[-.57,3.56],
  [.57,3.56],[1.04,2.66],[2.89,2.61],
  [3.92,3.16],[4.42,4.15],[4.18,4.52],
  [1.70,4.83],[-1.70,4.83]
 ];
 // The R6 front silhouette is preserved, while depth and sweep move the
 // central lens closer to the face without penetrating the 8-unit head.
 lensSurface(root,lens,'shooting-panoramic',pane,-4.94,.78);
 // One sculpted brow at the same sweep as the lens. The back of its
 // .22-deep band remains .09 ahead of the lens at every X, with no
 // second rear plate or small overlapping brow strips.
 const brow:EyePolygon=[
  [-4.30,4.38],[-4.16,4.79],[0,4.98],[4.16,4.79],
  [4.30,4.38],[3.90,4.51],[0,4.70],[-3.90,4.51]
 ];
 sweptFrame(root,frame,'integrated-swept-frame',brow,[],-5.25,.22,.78);
 // Roots now occupy the SAME volume as the outer swept brow.
 // They transition once toward the side of the head, not into a
 // parallel, floating horizontal headband.
 // R8: short rectangular root seated inside the raised outer brow;
 // one clean shoulder replaces two overlapping triangular wedges.
 outsideTemples(root,frame,'continuous-swept-temple',{
  frontX:4.20,frontY:4.49,frontZ:-4.30,
  shoulderX:4.34,shoulderY:4.46,shoulderZ:-3.80,
  rearX:4.31,rearY:4.20,rearZ:3.58,
  frontWidth:.54,shoulderWidth:.48,rearWidth:.43,
  frontHeight:.58,shoulderHeight:.54,rearHeight:.43
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
  root.userData.d2EyeFitTop=4.95;
  for(const variant of ['rectangular','round','heavy-square'] as const)
   standard(root,frame,lens,variant);
 }else if(id==='glasses-aviator')aviator(root,frame,lens);
 else if(id==='glasses-wrap')shooting(root,frame,lens);
 else shield(root,frame,lens);
 return root;
}
