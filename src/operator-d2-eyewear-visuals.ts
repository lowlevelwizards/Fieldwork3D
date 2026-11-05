/**
 * D2 EYE R1B: exaggerated, iconic low-poly eyewear for the 8-unit cube head.
 * Large 4-8-corner glass shapes, frame lines >= .38 world units and strong
 * side temples. One-time construction; every existing variant/ID preserved.
 * -Z forward, +X right, +Y up; frame and lens materials remain independent.
 */
import * as THREE from 'three';
import {mapBoxPixelUV} from './rendering/pixel-materials.ts';
export type D2GlassesId='glasses-standard'|'glasses-aviator'|'glasses-wrap'|'glasses-shield';
export type D2GlassesVariant='rectangular'|'round'|'heavy-square';
type XY=readonly [number,number];
const FRONT=-4.63;
function box(g:THREE.Group,m:THREE.Material,name:string,
 x:number,y:number,z:number,w:number,h:number,d:number){
 const mesh=new THREE.Mesh(mapBoxPixelUV(new THREE.BoxGeometry(w,h,d),w,h,d),m);
 mesh.name=name;mesh.position.set(x,y,z);
 mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);return mesh;
}
function edge(g:THREE.Group,m:THREE.Material,name:string,a:XY,b:XY,
 z=FRONT,thick=.42){
 const dx=b[0]-a[0],dy=b[1]-a[1];
 const seg=box(g,m,name,(a[0]+b[0])/2,(a[1]+b[1])/2,z,
  Math.hypot(dx,dy)+.13,thick,.42);
 seg.rotation.z=Math.atan2(dy,dx);return seg;
}
function pane(g:THREE.Group,frame:THREE.Material,lens:THREE.Material,
 name:string,points:readonly XY[],thick=.42){
 const shape=new THREE.Shape();
 points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));
 shape.closePath();
 const glass=new THREE.Mesh(new THREE.ShapeGeometry(shape),lens);
 glass.name=name+'-lens';glass.position.z=FRONT+.24;
 glass.castShadow=false;glass.receiveShadow=false;glass.renderOrder=2;
 g.add(glass);
 for(let i=0;i<points.length;i++)
  edge(g,frame,name+'-rim',points[i],points[(i+1)%points.length],FRONT,thick);
}
function arm(g:THREE.Group,frame:THREE.Material,
 y=3.72,thick=.48){
 for(const side of [-1,1]){
  const x=side*4.19;
  box(g,frame,'bold-temple',x,y,-.53,.55,thick,7.53);
  box(g,frame,'temple-ankle',x,y-.25,2.81,.66,.80,.82);
 }
}
const around=(cx:number,points:readonly XY[]):XY[] =>
 points.map(([x,y])=>[x+cx,y] as XY);
const rectangle:readonly XY[]=[
 [-1.65,4.55],[1.65,4.55],[1.65,2.79],[-1.65,2.79]
];
const chunkyRound:readonly XY[]=[
 [-1.66,4.07],[-1.10,4.59],[1.10,4.59],[1.66,4.07],
 [1.66,3.22],[1.10,2.75],[-1.10,2.75],[-1.66,3.22]
];
const heavySquare:readonly XY[]=[
 [-1.72,4.61],[1.72,4.61],[1.72,2.74],[-1.72,2.74]
];
function standardVariant(parent:THREE.Group,
 frame:THREE.Material,lens:THREE.Material,mode:D2GlassesVariant){
 const group=new THREE.Group();group.name='standard-'+mode;
 group.userData.d2EyeVariant=mode;
 const pts=mode==='rectangular'?rectangle:mode==='round'?chunkyRound:heavySquare;
 for(const side of [-1,1])
  pane(group,frame,lens,'standard-eye',around(side*2.01,pts),
   mode==='heavy-square'?.64:.43);
 edge(group,frame,'oversized-bridge',[-.55,3.80],[.55,3.80],FRONT,.54);
 box(group,frame,'heavy-brow-joint',0,4.12,FRONT,1.14,.44,.54);
 arm(group,frame,3.76,mode==='heavy-square'?.65:.49);
 group.visible=mode==='rectangular';
 parent.add(group);
}
function aviator(root:THREE.Group,frame:THREE.Material,lens:THREE.Material){
 // Iconic broad pilot lenses: five large planes, no wire-outline teardrops.
 const pts:readonly XY[]=[
  [-1.58,4.58],[1.58,4.58],[1.52,3.48],
  [.74,2.63],[-1.46,2.94]
 ];
 for(const side of [-1,1]){
  const transformed=pts.map(([x,y])=>[side===1?-x:x,y] as XY);
  pane(root,frame,lens,'aviator-eye',around(side*2.0,transformed),.44);
 }
 edge(root,frame,'single-pilot-bridge',[-.58,4.26],[.58,4.26],FRONT,.47);
 box(root,frame,'pilot-upper-brow',0,4.56,FRONT,1.29,.43,.49);
 arm(root,frame,3.86,.50);
}
function wrap(root:THREE.Group,frame:THREE.Material,lens:THREE.Material){
 // Two broad angular sports lenses, not a thin single eyeshield.
 const pts:readonly XY[]=[
  [-1.66,4.57],[1.62,4.57],[1.65,3.21],
  [.55,2.75],[-1.66,3.05]
 ];
 for(const side of [-1,1])
  pane(root,frame,lens,'sport-eye',around(side*2.02,
   pts.map(([x,y])=>[side===1?-x:x,y] as XY)),.49);
 edge(root,frame,'sport-brow',[-.64,4.54],[.64,4.54],FRONT,.55);
 for(const side of [-1,1])
  box(root,frame,'sport-wrap-wing',side*4.19,3.70,-3.33,
   .69,1.46,2.55);
 arm(root,frame,3.75,.63);
}
function shield(root:THREE.Group,frame:THREE.Material,lens:THREE.Material){
 // One dominant continuous lens with a thick, clearly single-lens brow.
 const shieldShape:readonly XY[]=[
  [-4.08,4.58],[4.08,4.58],[4.08,3.07],
  [2.57,2.71],[.70,2.91],[-.70,2.91],
  [-2.57,2.71],[-4.08,3.07]
 ];
 pane(root,frame,lens,'single-continuous-shield',shieldShape,.49);
 edge(root,frame,'massive-shield-brow',[-3.95,4.66],[3.95,4.66],FRONT,.62);
 for(const side of [-1,1]){
  box(root,frame,'shield-anchor',side*4.19,3.72,-4.14,.75,1.35,1.27);
  box(root,frame,'shield-temple',side*4.22,3.81,-.50,.54,.53,7.35);
  box(root,frame,'shield-rear-lock',side*4.22,3.53,2.84,.63,.78,.90);
 }
}
export function createD2Glasses(
 id:D2GlassesId,frame:THREE.Material,lens:THREE.Material
):THREE.Group{
 const root=new THREE.Group();root.name='d2-'+id;
 root.userData.modelAxes='-Z-forward,+X-right,+Y-up';
 if(id==='glasses-standard')
  for(const variant of ['rectangular','round','heavy-square'] as const)
   standardVariant(root,frame,lens,variant);
 else if(id==='glasses-aviator')aviator(root,frame,lens);
 else if(id==='glasses-wrap')wrap(root,frame,lens);
 else shield(root,frame,lens);
 return root;
}
