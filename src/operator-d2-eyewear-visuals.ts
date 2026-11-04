/**
 * D2-B1: four actual canonical -Z glasses silhouettes, not resized copies
 * of an opaque legacy visor. Lenses are one thin, low-opacity sheet behind
 * raised frame edges. All topology is built once, not in animation/pose.
 */
import * as THREE from 'three';
import {mapBoxPixelUV} from './rendering/pixel-materials.ts';
export type D2GlassesId='glasses-standard'|'glasses-aviator'|'glasses-wrap'|'glasses-shield';
export type D2GlassesVariant='rectangular'|'round'|'heavy-square';
type XY=readonly [number,number];
function box(g:THREE.Group,m:THREE.Material,name:string,
 x:number,y:number,z:number,w:number,h:number,d:number){
 const mesh=new THREE.Mesh(mapBoxPixelUV(new THREE.BoxGeometry(w,h,d),w,h,d),m);
 mesh.name=name;mesh.position.set(x,y,z);
 mesh.castShadow=true;mesh.receiveShadow=true;
 g.add(mesh);return mesh;
}
function edge(g:THREE.Group,m:THREE.Material,name:string,a:XY,b:XY,
 z=-4.52,thick=.20){
 const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);
 const seg=box(g,m,name,(a[0]+b[0])/2,(a[1]+b[1])/2,z,
  len,thick,.25);
 seg.rotation.z=Math.atan2(dy,dx);
 return seg;
}
function polygon(g:THREE.Group,frame:THREE.Material,lens:THREE.Material,
 name:string,points:readonly XY[],thick=.2){
 const shape=new THREE.Shape();
 for(let i=0;i<points.length;i++){
  const [x,y]=points[i];
  if(i===0)shape.moveTo(x,y);else shape.lineTo(x,y);
 }
 shape.closePath();
 const glass=new THREE.Mesh(new THREE.ShapeGeometry(shape),lens);
 glass.name=name+'-lens';glass.position.z=-4.34;
 glass.castShadow=false;glass.receiveShadow=false;
 glass.renderOrder=2;
 g.add(glass);
 for(let i=0;i<points.length;i++)edge(g,frame,name+'-rim',points[i],
  points[(i+1)%points.length],-4.52,thick);
}
function temples(g:THREE.Group,frame:THREE.Material,heavy=false){
 for(const side of [-1,1]){
  const x=side*(heavy?4.19:4.10);
  box(g,frame,'temple',x,3.58,-.68,heavy?.48:.28,
   heavy?.40:.24,6.9);
  box(g,frame,'temple-tip',x,3.38,2.70,heavy?.58:.38,.75,.72);
 }
}
function lensForSide(cx:number,points:readonly XY[]):XY[]{
 return points.map(([x,y])=>[cx+x,y] as const);
}
const rect:readonly XY[]=[
 [-1.47,4.22],[1.47,4.22],[1.40,3.04],[-1.40,3.04]
];
const round:readonly XY[]=[
 [-1.26,3.93],[-.74,4.34],[.74,4.34],[1.26,3.93],
 [1.26,3.30],[.74,2.94],[-.74,2.94],[-1.26,3.30]
];
const heavy:readonly XY[]=[
 [-1.56,4.28],[1.56,4.28],[1.50,2.99],[-1.50,2.99]
];
function standardVariant(parent:THREE.Group,
 frame:THREE.Material,lens:THREE.Material,
 mode:D2GlassesVariant){
 const v=new THREE.Group();v.name='standard-'+mode;v.userData.d2EyeVariant=mode;
 const pts=mode==='rectangular'?rect:mode==='round'?round:heavy;
 const thickness=mode==='heavy-square'?.37:.17;
 for(const side of [-1,1]){
  const cx=side*2.02;
  polygon(v,frame,lens,'standard-eye',lensForSide(cx,pts),thickness);
 }
 edge(v,frame,'bridge',[-.65,3.71],[.65,3.71],-4.55,.22);
 temples(v,frame,mode==='heavy-square');
 v.visible=mode==='rectangular';
 parent.add(v);
 return v;
}
function aviator(root:THREE.Group,frame:THREE.Material,lens:THREE.Material){
 const shape:readonly XY[]=[
  [-1.53,4.41],[.98,4.41],[1.45,4.01],[1.25,3.27],
  [.28,2.71],[-.68,2.86],[-1.43,3.51]
 ];
 for(const side of [-1,1])
  polygon(root,frame,lens,'aviator-eye',
   lensForSide(side*2.04,shape.map(([x,y])=>[x*(side===1?-1:1),y])),.14);
 edge(root,frame,'top-bridge',[-.67,4.18],[.67,4.18],-4.58,.16);
 edge(root,frame,'lower-bridge',[-.67,3.92],[.67,3.92],-4.58,.12);
 temples(root,frame);
}
function wrap(root:THREE.Group,frame:THREE.Material,lens:THREE.Material){
 // Split, angular sport lenses; not one seamless shield like glasses-shield.
 const half:readonly XY[]=[
  [-1.70,4.39],[1.47,4.32],[1.42,3.20],
  [.52,2.97],[-1.36,3.15]
 ];
 for(const side of [-1,1]){
  const cx=side*2.0;
  polygon(root,frame,lens,'wrap-eye',lensForSide(cx,
   half.map(([x,y])=>[side===1?-x:x,y])),.24);
 }
 edge(root,frame,'brow-bridge',[-.65,4.40],[.65,4.40],-4.57,.27);
 for(const side of [-1,1]){
  box(root,frame,'wrap-side-shield',side*4.16,3.69,-2.7,
   .46,1.16,3.15);
 }
 temples(root,frame,true);
}
function shield(root:THREE.Group,frame:THREE.Material,lens:THREE.Material){
 const continuous:readonly XY[]=[
  [-4.04,4.35],[-2.25,4.48],[0,4.38],[2.25,4.48],[4.04,4.35],
  [3.82,3.10],[2.42,2.98],[.90,3.10],[0,3.18],
  [-.90,3.10],[-2.42,2.98],[-3.82,3.10]
 ];
 polygon(root,frame,lens,'single-continuous-shield',continuous,.14);
 edge(root,frame,'full-brow',[-3.90,4.50],[3.90,4.50],-4.54,.20);
 for(const side of [-1,1]){
  box(root,frame,'minimal-shield-arm',side*4.04,3.77,-.90,.27,.23,6.70);
  box(root,frame,'nose-relief',side*.41,3.07,-4.57,.22,.25,.20);
 }
}
export function createD2Glasses(
 id:D2GlassesId,frame:THREE.Material,lens:THREE.Material
):THREE.Group{
 const root=new THREE.Group();root.name='d2-'+id;
 root.userData.modelAxes='-Z-forward,+X-right,+Y-up';
 if(id==='glasses-standard')
  for(const mode of ['rectangular','round','heavy-square'] as const)
   standardVariant(root,frame,lens,mode);
 else if(id==='glasses-aviator')aviator(root,frame,lens);
 else if(id==='glasses-wrap')wrap(root,frame,lens);
 else shield(root,frame,lens);
 return root;
}
