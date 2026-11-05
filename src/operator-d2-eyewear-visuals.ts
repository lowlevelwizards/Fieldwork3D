/** Eyewear R3-2: four individually authored glasses archetypes.
 * Bare icon, pilot teardrop, swept sports wedge, and borderless shield.
 * Only 3–5 major structural masses each, no generic lens decoration.
 */
import * as THREE from 'three';
import {frameRing,sweptFrame,lensSurface,templeArm,block,octagon,shifted,
 type EyePoint,type EyePolygon} from './operator-d2-eyewear-shell.ts';
export type D2GlassesId=
 'glasses-standard'|'glasses-aviator'|'glasses-wrap'|'glasses-shield';
export type D2GlassesVariant='rectangular'|'round'|'heavy-square';
const mirrored=(pts:EyePolygon):EyePoint[]=>
 pts.map(([x,y])=>[-x,y]);
function simpleTemples(group:THREE.Group,frame:THREE.Material,
 x:number,y:number,frontZ:number,
 startHeight:number,backHeight:number):void{
 for(const side of [-1,1] as const){
  templeArm(group,frame,'one-piece-temple',side,
   {x,y,z:frontZ,w:.56,h:startHeight},
   {x:4.02,y:y+.10,z:3.36,w:.48,h:backHeight});
 }
}
function standard(group:THREE.Group,frame:THREE.Material,
 lens:THREE.Material,variant:D2GlassesVariant):void{
 const model=new THREE.Group();
 model.name='standard-'+variant;
 model.userData.d2EyeVariant=variant;
 model.userData.d2EyeDesign='R3-acetate-square';
 model.userData.d2EyeFitTop=4.78;
 if(variant==='round'){
  for(const side of [-1,1] as const){
   const cx=side*1.81;
   const outer=octagon(cx,3.48,1.67,1.35);
   const hole=octagon(cx,3.48,1.14,.89);
   frameRing(model,frame,'retro-civilian-round-frame',outer,[hole],
    -4.86,.57,'open-frame');
   lensSurface(model,lens,'civilian-round',hole,-4.90);
  }
  block(model,frame,'rounded-acetate-bridge',0,3.78,-4.73,
   .92,.52,.75);
 }else{
  // A continuous silhouette: the bridge belongs to the acetate body.
  const heavy=variant==='heavy-square';
  const outer:EyePolygon=heavy?
   [[-3.84,4.78],[3.84,4.78],[3.84,2.05],[-3.84,2.05]]:
   [[-3.69,4.70],[3.69,4.70],[3.69,2.15],[-3.69,2.15]];
  const left:EyePolygon=heavy?
   [[-3.10,4.13],[-.67,4.13],[-.67,2.65],[-3.10,2.65]]:
   [[-3.13,4.22],[-.54,4.22],[-.54,2.60],[-3.13,2.60]];
  const right=mirrored(left);
  frameRing(model,frame,'single-acetate-front',outer,[left,right],
   -4.86,heavy?.69:.56,'open-frame');
  lensSurface(model,lens,'civilian-square-left',left,-4.90);
  lensSurface(model,lens,'civilian-square-right',right,-4.90);
 }
 simpleTemples(model,frame,3.67,3.76,-4.78,.74,.51);
 model.visible=variant==='rectangular';
 group.add(model);
}
function aviator(root:THREE.Group,frame:THREE.Material,lens:THREE.Material){
 root.userData.d2EyeFitTop=4.84;
 root.userData.d2EyeDesign='R3-faceted-pilot-teardrops';
 // Full cheek mass, bottom pulled IN towards nose, not dangling fangs.
 const outerLeft:EyePolygon=[
  [-1.62,4.81],[1.39,4.81],[1.44,3.75],
  [.99,2.55],[.25,2.20],[-.64,2.36],[-1.59,3.37]
 ];
 const holeLeft:EyePolygon=[
  [-1.20,4.43],[.99,4.43],[1.01,3.76],
  [.65,2.85],[.18,2.66],[-.48,2.78],[-1.14,3.47]
 ];
 for(const side of [-1,1] as const){
  const off=side*1.79;
  const outer=shifted(side===-1?outerLeft:mirrored(outerLeft),off);
  const hole=shifted(side===-1?holeLeft:mirrored(holeLeft),off);
  frameRing(root,frame,'pilot-lens-collar',outer,[hole],
   -4.83,.48,'pilot');
  lensSurface(root,lens,'aviator-teardrop',hole,-4.89);
 }
 // Two broad purposeful pilot bridges; neither becomes a giant dark brow.
 block(root,frame,'pilot-upper-bridge',0,4.69,-4.78,1.16,.36,.56);
 block(root,frame,'pilot-lower-bridge',0,4.05,-4.77,.82,.30,.54);
 for(const side of [-1,1] as const){
  templeArm(root,frame,'pilot-temple',side,
   {x:3.30,y:4.48,z:-4.74,w:.44,h:.46},
   {x:4.01,y:4.25,z:3.30,w:.41,h:.42});
 }
}
function wraparound(root:THREE.Group,
 frame:THREE.Material,lens:THREE.Material){
 root.userData.d2EyeFitTop=4.72;
 root.userData.d2EyeDesign='R3-continuous-swept-sport';
 // Front bar is one bent object, including the rearward-turning corners.
 const outer:EyePolygon=[
  [-3.85,4.78],[0,4.58],[3.85,4.78],[3.68,2.75],
  [0,2.53],[-3.68,2.75]
 ];
 const left:EyePolygon=[
  [-3.32,4.31],[-.55,4.18],[-.70,3.19],
  [-1.62,2.92],[-3.27,3.11]
 ];
 const right=mirrored(left);
 sweptFrame(root,frame,'integrated-swept-frame',outer,[left,right],
  -5.07,.52,.87);
 lensSurface(root,lens,'sport-wedge-left',left,-5.12,.87);
 lensSurface(root,lens,'sport-wedge-right',right,-5.12,.87);
 for(const side of [-1,1] as const){
  // The tapered arm begins at the swept frame's REAR-facing outside
  // corner, sharing both Y extent and Z depth; no separate triangular fin.
  templeArm(root,frame,'continuous-swept-temple',side,
   {x:3.72,y:3.86,z:-4.36,w:.63,h:.93},
   {x:4.01,y:3.89,z:3.30,w:.42,h:.43});
 }
}
function shield(root:THREE.Group,frame:THREE.Material,lens:THREE.Material){
 root.userData.d2EyeFitTop=4.80;
 root.userData.d2EyeDesign='R3-borderless-shield';
 const outline:EyePolygon=[
  [-4.26,4.73],[4.26,4.73],[4.15,2.26],
  [2.66,1.97],[1.03,2.17],[-1.03,2.17],
  [-2.66,1.97],[-4.15,2.26]
 ];
 // Lens is the large primary shape. NO enclosing lower perimeter frame.
 const pane=lensSurface(root,lens,'continuous-ballistic-shield',
  outline,-5.11,.28);
 pane.userData.d2EyeProfile={
  family:'shield',topology:'single-shield',width:8.52,height:2.76,
  frontZ:-5.11,housingDepth:.18,lenses:1,version:3
 };
 block(root,frame,'single-mass-visor-brow',0,4.77,-4.99,
  8.72,.55,.79);
 for(const side of [-1,1] as const){
  templeArm(root,frame,'shield-support-temple',side,
   {x:4.13,y:3.92,z:-4.75,w:.62,h:.83},
   {x:4.02,y:3.91,z:3.34,w:.47,h:.48});
 }
}
export function createD2Glasses(
 id:D2GlassesId,frame:THREE.Material,lens:THREE.Material
):THREE.Group{
 const root=new THREE.Group();root.name='d2-'+id;
 root.userData.modelAxes='-Z-forward,+X-right,+Y-up';
 if(id==='glasses-standard'){
  root.userData.d2EyeFitTop=4.78;
  for(const variant of ['rectangular','round','heavy-square'] as const)
   standard(root,frame,lens,variant);
 }else if(id==='glasses-aviator')aviator(root,frame,lens);
 else if(id==='glasses-wrap')wraparound(root,frame,lens);
 else shield(root,frame,lens);
 return root;
}
