/** D2 eyewear R2: four independent, exaggerated silhouette archetypes.
 * Standard: upright square windows. Aviator: tall pilot drops and twin bridges.
 * Wrap: two swept wedges with visible YZ wings. Shield: one massive visor.
 * Geometry is built once; ID, variant and material references are unchanged.
 */
import * as THREE from 'three';
import {solidFrame,solidBlock,sideFin,offsetPolygon,octagon,
 type EyePolygon,type EyePoint} from './operator-d2-eyewear-shell.ts';
export type D2GlassesId='glasses-standard'|'glasses-aviator'|'glasses-wrap'|'glasses-shield';
export type D2GlassesVariant='rectangular'|'round'|'heavy-square';
const reflect=(points:EyePolygon):EyePoint[]=>points.map(([x,y])=>[-x,y]);
function plainArms(root:THREE.Group,frame:THREE.Material,
 x:number,y:number,height:number,width:number){
 for(const side of [-1,1]){
  solidBlock(root,frame,'strong-temple',side*x,y,-.28,width,height,7.86);
  solidBlock(root,frame,'temple-front-block',side*(x-.19),y,-4.31,
   width+.23,height+.15,.82);
 }
}
function standardVariant(root:THREE.Group,frame:THREE.Material,
 lens:THREE.Material,mode:D2GlassesVariant){
 const group=new THREE.Group();group.name='standard-'+mode;
 group.userData.d2EyeVariant=mode;
 const rectangular:EyePolygon=[
  [-1.55,4.95],[1.55,4.95],[1.55,2.10],[-1.55,2.10]
 ];
 const rectangularHole:EyePolygon=[
  [-1.04,4.47],[1.04,4.47],[1.04,2.58],[-1.04,2.58]
 ];
 const square:EyePolygon=[
  [-1.62,5.05],[1.62,5.05],[1.62,2.04],[-1.62,2.04]
 ];
 const squareHole:EyePolygon=[
  [-.95,4.43],[.95,4.43],[.95,2.69],[-.95,2.69]
 ];
 for(const side of [-1,1]){
  const cx=side*1.83;
  let outer:EyePolygon=rectangular,opening:EyePolygon=rectangularHole;
  if(mode==='round'){
   outer=octagon(0,3.54,1.59,1.53);
   opening=octagon(0,3.54,1.04,.99);
  }else if(mode==='heavy-square'){
   outer=square;opening=squareHole;
  }
  solidFrame(group,frame,lens,'square-civilian-eye',
   offsetPolygon(outer,cx),[offsetPolygon(opening,cx)],
   -4.94,mode==='heavy-square'?.80:.67,'open-frame');
 }
 solidBlock(group,frame,'square-block-bridge',0,3.68,-4.75,
  .94,.84,.72);
 // The square family gets plain, unbroken temples, not a tapered sport wing.
 plainArms(group,frame,3.79,3.83,
  mode==='heavy-square'?.86:.70,mode==='heavy-square'?.66:.51);
 group.visible=mode==='rectangular';root.add(group);
}
function aviator(root:THREE.Group,frame:THREE.Material,lens:THREE.Material){
 const outer:EyePolygon=[
  [-1.58,5.18],[1.48,5.18],[1.43,3.61],
  [.80,1.62],[-.10,1.73],[-1.50,2.85]
 ];
 const opening:EyePolygon=[
  [-1.07,4.61],[.98,4.61],[.93,3.58],
  [.44,2.30],[-.09,2.36],[-1.04,3.04]
 ];
 for(const side of [-1,1]){
  const cx=side*1.83;
  const transform=side===-1?((p:EyePolygon)=>p):reflect;
  solidFrame(root,frame,lens,'drooping-pilot-eye',
   offsetPolygon(transform(outer),cx),[offsetPolygon(transform(opening),cx)],
   -4.86,.64,'pilot');
 }
 // Two huge graphic bars, not hair-thin authentic aviator wiring.
 solidBlock(root,frame,'pilot-high-bridge',0,5.05,-4.80,
  1.14,.43,.65);
 solidBlock(root,frame,'pilot-low-bridge',0,4.15,-4.78,
  1.01,.52,.70);
 for(const side of [-1,1]){
  solidBlock(root,frame,'pilot-temple',side*3.75,4.49,-.26,
   .49,.50,7.84);
  solidBlock(root,frame,'pilot-outer-corner',side*3.48,4.78,-4.46,
   .70,.57,.75);
 }
}
function wrap(root:THREE.Group,frame:THREE.Material,lens:THREE.Material){
 // Twin directional wedges. Taller, steeper lateral sweep and a narrow
 // central bridge ensure it cannot be mistaken for the continuous shield.
 const outer:EyePolygon=[
  [-1.95,5.11],[1.28,4.60],[1.25,3.29],
  [.35,2.18],[-1.91,2.69]
 ];
 const opening:EyePolygon=[
  [-1.36,4.52],[.79,4.20],[.77,3.38],
  [.19,2.83],[-1.36,3.18]
 ];
 for(const side of [-1,1]){
  const mirror=side===-1?((p:EyePolygon)=>p):reflect;
  solidFrame(root,frame,lens,'swept-tactical-wedge',
   offsetPolygon(mirror(outer),side*1.85),
   [offsetPolygon(mirror(opening),side*1.85)],-5.04,.73,'wedge');
  // Distinct side profile: one coarse swept fin rather than plain temples.
  sideFin(root,frame,'swept-back-tactical-wing',side as -1|1,
   4.08,.83,[
    [5.19,4.91],[3.87,4.80],[1.81,4.31],[-3.50,4.21],
    [-3.50,3.47],[1.80,3.51],[4.27,2.85],[5.19,3.22]
   ]);
 }
 solidBlock(root,frame,'angular-center-bridge',0,4.11,-4.86,
  1.04,.69,.82);
}
function shield(root:THREE.Group,frame:THREE.Material,lens:THREE.Material){
 const outer:EyePolygon=[
  [-4.23,5.24],[4.23,5.24],[4.23,2.19],[2.37,1.70],
  [.87,1.96],[-.87,1.96],[-2.37,1.70],[-4.23,2.19]
 ];
 const hole:EyePolygon=[
  [-3.56,4.62],[3.56,4.62],[3.56,2.68],
  [2.27,2.36],[.87,2.62],[-.87,2.62],
  [-2.27,2.36],[-3.56,2.68]
 ];
 solidFrame(root,frame,lens,'one-piece-ballistic-visor',outer,
  [hole],-5.33,.84,'shield');
 solidBlock(root,frame,'giant-visor-brow',0,5.22,-5.03,
  8.43,.76,1.25);
 for(const side of [-1,1]){
  solidBlock(root,frame,'large-visor-hinge',side*4.23,3.66,-4.65,
   .98,1.62,2.09);
  sideFin(root,frame,'visor-support-rail',side as -1|1,
   4.27,.78,[
    [4.95,4.51],[2.90,4.24],[-3.60,4.17],
    [-3.60,3.43],[3.02,3.39],[4.95,3.20]
   ]);
 }
}
export function createD2Glasses(
 id:D2GlassesId,frame:THREE.Material,lens:THREE.Material
):THREE.Group{
 const root=new THREE.Group();root.name='d2-'+id;
 root.userData.modelAxes='-Z-forward,+X-right,+Y-up';
 if(id==='glasses-standard'){
  for(const variant of ['rectangular','round','heavy-square'] as const)
   standardVariant(root,frame,lens,variant);
 }else if(id==='glasses-aviator')aviator(root,frame,lens);
 else if(id==='glasses-wrap')wrap(root,frame,lens);
 else shield(root,frame,lens);
 return root;
}
