/** D2 R10-R15 minimal-shape toolkit.
 * A geometric form is authored as one faceted volume rather than an array
 * of parallel decorative boxes. All dimensions are canonical 8-unit head space.
 */
import * as THREE from 'three';
import type {MaskPoint,MaskMaterials} from './operator-d2-mask-geometry.ts';
import {attach,strap,lens,canister} from './operator-d2-mask-geometry.ts';
type P=MaskPoint;
export type ShellSpec={
 outline:readonly P[];
 holes?:readonly (readonly P[])[];
 front:number;
 thickness?:number;
 halfWidth:number;
 cheek?:number;
 cheekAtY?:number;
 cheekAtX?:number;
 nose?:number;
 jawReturn?:number;
 sideReturn?:number;
 foreheadReturn?:number;
};
/** One conformal shell with physically open eyepieces; sculpt its *surface*
 * in Z to provide cheek inflation, nasal projection and side wrap.
 */
export function sculptedShell(g:THREE.Group,m:THREE.Material,
 name:string,s:ShellSpec):THREE.Mesh{
 const outline=new THREE.Shape();
 s.outline.forEach(([x,y],i)=>i?outline.lineTo(x,y):outline.moveTo(x,y));
 outline.closePath();
 for(const points of s.holes??[]){
  const path=new THREE.Path();
  points.forEach(([x,y],i)=>i?path.lineTo(x,y):path.moveTo(x,y));
  path.closePath();outline.holes.push(path);
 }
 const geo=new THREE.ExtrudeGeometry(outline,{
  depth:s.thickness??.48,bevelEnabled:false,steps:1,curveSegments:1
 });
 const at=geo.getAttribute('position') as THREE.BufferAttribute;
 const cheekY=s.cheekAtY??1.35,cheekX=s.cheekAtX??2.7;
 for(let i=0;i<at.count;i++){
  const x=at.getX(i),y=at.getY(i),depth=at.getZ(i);
  const side=Math.min(1,Math.abs(x)/Math.max(1,s.halfWidth));
  const wrap=(s.sideReturn??.9)*Math.pow(side,2.8);
  const cheekShape=Math.max(0,1-Math.abs(Math.abs(x)-cheekX)/2.1)*
   Math.max(0,1-Math.abs(y-cheekY)/2.6);
  const nasalShape=Math.max(0,1-Math.abs(x)/1.58)*
   Math.max(0,1-Math.abs(y-2.55)/2.55);
  const chin=Math.max(0,Math.min(1,(-y+.25)/1.5));
  const forehead=Math.max(0,Math.min(1,(y-5.1)/2.6));
  at.setZ(i,s.front+depth+wrap-(s.cheek??0)*cheekShape-
   (s.nose??0)*nasalShape+(s.jawReturn??0)*chin+
   (s.foreheadReturn??0)*forehead);
 }
 geo.computeVertexNormals();
 const mesh=attach(g,name,geo,m);
 mesh.userData.d2SculptedShell=true;
 mesh.userData.eyeApertures=s.holes?.length??0;
 return mesh;
}
/** One chunky faceted annular frame, not eight disconnected line cuboids. */
export function frame(g:THREE.Group,m:THREE.Material,name:string,
 polygon:readonly P[],z:number,thick=.25,wrap=0):THREE.Mesh{
 const cx=polygon.reduce((a,b)=>a+b[0],0)/polygon.length;
 const cy=polygon.reduce((a,b)=>a+b[1],0)/polygon.length;
 const outer=polygon.map(([x,y])=>
  [cx+(x-cx)*1.12,cy+(y-cy)*1.12] as const);
 const sh=new THREE.Shape();
 outer.forEach(([x,y],i)=>i?sh.lineTo(x,y):sh.moveTo(x,y));
 sh.closePath();
 const hole=new THREE.Path();
 polygon.forEach(([x,y],i)=>i?hole.lineTo(x,y):hole.moveTo(x,y));
 hole.closePath();sh.holes.push(hole);
 const geo=new THREE.ExtrudeGeometry(sh,{
  depth:thick,steps:1,bevelEnabled:false,curveSegments:1
 });
 const p=geo.getAttribute('position') as THREE.BufferAttribute;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i);
  p.setZ(i,z+p.getZ(i)+wrap*Math.pow(Math.abs(x)/4.4,1.6));
 }
 geo.computeVertexNormals();
 return attach(g,name,geo,m);
}
export function fittedWindow(g:THREE.Group,m:MaskMaterials,
 name:string,outline:readonly P[],front:number,wrap=0){
 lens(g,m.lens,name+'-lens',outline,front,wrap);
 frame(g,m.hardware,name+'-rim',outline,front-.05,.23,wrap);
}
/** Low-profile faceted radial cartridge: a broad pancake, not a tube.
 * local Y is the attachment axis; vector is outward/forward.
 */
export function filterPod(g:THREE.Group,m:THREE.Material,name:string,
 pos:readonly [number,number,number],size:readonly [number,number,number],
 axis:readonly [number,number,number]):THREE.Mesh{
 const [radius,thickness,verticalScale]=size;
 const geo=new THREE.CylinderGeometry(radius*.97,radius,thickness,8,1);
 const o=attach(g,name,geo,m);
 o.position.set(...pos);
 o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),
  new THREE.Vector3(...axis).normalize());
 o.scale.x=1.02;o.scale.z=verticalScale;
 o.userData.d2FilterPod=true;return o;
}
/** Simple connected harness paths hugging the four sides of the skull.
 * Attachment ends at X +/−4, Z about −4; no triangular horns above scalp.
 */
export function compactHarness(g:THREE.Group,m:MaskMaterials,low=1.9,upper=4.76){
 for(const sign of [-1,1] as const){
  strap(g,m.hardware,'head-harness-side',[
   [sign*3.92,low,-4.12],
   [sign*4.43,low,-2.3],
   [sign*4.42,low,2.5],
   [sign*3.58,low,4.32]
  ],.36);
  strap(g,m.hardware,'head-harness-upper',[
   [sign*3.82,upper,-3.99],
   [sign*4.42,upper,-1.5],
   [sign*4.40,upper-.12,2.7],
   [sign*3.48,upper-.18,4.31]
  ],.31);
 }
 strap(g,m.hardware,'head-harness-back',[
  [-3.58,low,4.32],[0,low,4.43],[3.58,low,4.32]
 ],.38);
}
/** Unified GP-5 rear/top/side hood from seven silhouette stations.
 * Open only at the front, where the separate perforated front shell meets it.
 * A cap at Y>skullTop hides the entire upper surface of the cube head.
 */
export type HoodStation=readonly [number,number,number,number];
export function fittedHood(g:THREE.Group,m:THREE.Material,
 stations:readonly HoodStation[]):THREE.Group{
 const group=new THREE.Group();group.name='gp5-one-piece-rubber-hood';g.add(group);
 type V=readonly [number,number,number];
 const ring=([y,w,front,rear]:HoodStation):V[]=>[
  [-w*.88,y,front],[-w,y,front+.42],[-w,y,.2],
  [-w,y,rear-.42],[-w*.70,y,rear],[0,y,rear+.16],
  [w*.70,y,rear],[w,y,rear-.42],[w,y,.2],
  [w,y,front+.42],[w*.88,y,front]
 ];
 const faces:V[][][]=[[],[],[]]; // sides, back, crown
 const push=(bucket:number,quad:V[])=>faces[bucket].push(quad);
 for(let i=0;i<stations.length-1;i++){
  const bottom=ring(stations[i]),top=ring(stations[i+1]);
  for(let k=0;k<bottom.length-1;k++)
   push(k<3||k>6?0:1,[bottom[k],bottom[k+1],top[k+1],top[k]]);
 }
 const top=ring(stations[stations.length-1]);
 for(let k=0;k<top.length-1;k++)
  push(2,[top[k],top[k+1],[0,stations[stations.length-1][0],0],
    [0,stations[stations.length-1][0],0]]);
 const groups=['hood-temple','hood-back','hood-crown'] as const;
 for(let j=0;j<3;j++){
  const coords:number[]=[];
  for(const q of faces[j]){
   // Ensure outward-facing triangles on each face.
   const a=new THREE.Vector3(...q[0]),b=new THREE.Vector3(...q[1]),
    c=new THREE.Vector3(...q[2]),d=new THREE.Vector3(...q[3]);
   const normal=b.clone().sub(a).cross(c.clone().sub(a));
   const center=a.clone().add(b).add(c).add(d).multiplyScalar(.25);
   const outward=new THREE.Vector3(center.x,j===2?1:0,center.z);
   if(normal.dot(outward)<0){
    for(const v of [q[0],q[2],q[1],q[0],q[3],q[2]])coords.push(...v);
   }else for(const v of [q[0],q[1],q[2],q[0],q[2],q[3]])coords.push(...v);
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(coords,3));
  geo.computeVertexNormals();
  attach(group,groups[j],geo,m);
 }
 return group;
}
/** Canister held below the GP-5 mouth: one big visual shape and short collar. */
export function hangingFilter(g:THREE.Group,m:MaskMaterials){
 const neck=canister(g,m.hardware,'gp5-front-port',0,-.35,-5.72,1.20,.60,0,-2.6);
 neck.userData.d2Purpose='threaded collar';
 canister(g,m.filters,'gp5-central-canister',0,-1.65,-5.95,1.43,2.15,0,-3.8);
}
