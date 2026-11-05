/** R21 mask mounts: surface-relative opaque details with no eye cutouts.
 * Coordinates remain in canonical 8-unit cube-head space; -Z faces forward.
 * This module deliberately avoids modifying the R20 shell generator.
 */
import * as THREE from 'three';
import type {MaskMaterials} from './operator-d2-mask-geometry.ts';
import type {ShellRing} from './operator-d2-mask-simple-geometry.ts';
import {filterPod} from './operator-d2-mask-r10-geometry.ts';

type P=readonly [number,number];
type V=readonly [number,number,number];
export type Mount={position:V;normal:V;overlap?:number};

function mesh(group:THREE.Group,mat:THREE.Material,name:string,
 coords:number[],normals:number[]):THREE.Mesh{
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(coords,3));
 geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
 const obj=new THREE.Mesh(geometry,mat);
 obj.name=name;obj.castShadow=true;obj.receiveShadow=false;
 group.add(obj);return obj;
}
function tri(coords:number[],normals:number[],a:V,b:V,c:V,normal:V){
 for(const p of [a,b,c]){coords.push(...p);normals.push(...normal);}
}
function quad(coords:number[],normals:number[],a:V,b:V,c:V,d:V,
 normal:V){
 tri(coords,normals,a,c,b,normal);tri(coords,normals,a,d,c,normal);
}
function between(a:number,b:number,t:number){return a+(b-a)*t;}
function sample(rings:readonly ShellRing[],y:number):ShellRing{
 let lo=rings[0],hi=rings[rings.length-1];
 for(let i=1;i<rings.length;i++){
  if(y<=rings[i].y){lo=rings[i-1];hi=rings[i];break;}
 }
 const t=Math.min(1,Math.max(0,(y-lo.y)/(hi.y-lo.y||1)));
 return {
  y,halfWidth:between(lo.halfWidth,hi.halfWidth,t),
  frontHalf:between(lo.frontHalf,hi.frontHalf,t),
  cheekHalf:between(lo.cheekHalf,hi.cheekHalf,t),
  frontZ:between(lo.frontZ,hi.frontZ,t),
  cheekZ:between(lo.cheekZ,hi.cheekZ,t),
  cornerZ:between(lo.cornerZ,hi.cornerZ,t),
  returnZ:between(lo.returnZ,hi.returnZ,t)
 };
}
/** Sample the same piecewise-linear surface used by simpleShell(). */
export function surfaceAt(rings:readonly ShellRing[],x:number,y:number):Mount{
 const s=sample(rings,y),u=Math.abs(x);
 let z=s.frontZ,slope=0;
 if(u>s.frontHalf&&u<=s.cheekHalf){
  const span=s.cheekHalf-s.frontHalf;
  slope=(s.cheekZ-s.frontZ)/span;
  z=s.frontZ+(u-s.frontHalf)*slope;
 }else if(u>s.cheekHalf&&u<=s.halfWidth){
  const span=s.halfWidth-s.cheekHalf;
  slope=(s.cornerZ-s.cheekZ)/span;
  z=s.cheekZ+(u-s.cheekHalf)*slope;
 }else if(u>s.halfWidth)z=s.cornerZ;
 const dx=slope*Math.sign(x);
 const nx=dx, nz=-1;
 const size=Math.hypot(nx,nz);
 return {position:[x,y,z],normal:[nx/size,0,nz/size]};
}
function opacityPanel(g:THREE.Group,mat:THREE.Material,name:string,
 polygon:readonly P[],rings:readonly ShellRing[],offset:number):THREE.Mesh{
 const coords:number[]=[],normals:number[]=[];
 let cx=0,cy=0;
 for(const [x,y] of polygon){cx+=x;cy+=y;}
 cx/=polygon.length;cy/=polygon.length;
 const c=surfaceAt(rings,cx,cy),center:V=[cx,cy,c.position[2]-offset];
 // All normals point forward; differences in vertex depth describe the wrap,
 // but must not generate the R15 accidental diagonal shading.
 const n:V=[0,0,-1];
 const clockwise=polygon.reduce((sum,a,i)=>{
  const b=polygon[(i+1)%polygon.length];
  return sum+a[0]*b[1]-b[0]*a[1];
 },0)<0;
 for(let i=0;i<polygon.length;i++){
  const a=polygon[i],b=polygon[(i+1)%polygon.length];
  const za=surfaceAt(rings,a[0],a[1]).position[2]-offset;
  const zb=surfaceAt(rings,b[0],b[1]).position[2]-offset;
  if(clockwise)
   tri(coords,normals,center,[a[0],a[1],za],[b[0],b[1],zb],n);
  else tri(coords,normals,center,[b[0],b[1],zb],[a[0],a[1],za],n);
 }
 return mesh(g,mat,name,coords,normals);
}
export function opaqueLensOnSurface(g:THREE.Group,m:MaskMaterials,
 name:string,poly:readonly P[],rings:readonly ShellRing[],
 offset=.22,frameScale=1.14):void{
 const cx=poly.reduce((s,p)=>s+p[0],0)/poly.length;
 const cy=poly.reduce((s,p)=>s+p[1],0)/poly.length;
 const border=poly.map(([x,y])=>[
  cx+(x-cx)*frameScale,cy+(y-cy)*frameScale
 ] as const);
 opacityPanel(g,m.hardware,name+'-frame',border,rings,offset-.06);
 opacityPanel(g,m.lens,name+'-lens',poly,rings,offset+.05);
}
export type VisorSample={x:number;top:number;bottom:number;z:number};
function visorMesh(g:THREE.Group,mat:THREE.Material,name:string,
 samples:readonly VisorSample[]):THREE.Mesh{
 const coords:number[]=[],normals:number[]=[];
 for(let i=0;i<samples.length-1;i++){
  const l=samples[i],r=samples[i+1];
  quad(coords,normals,
   [l.x,l.bottom,l.z],[r.x,r.bottom,r.z],
   [r.x,r.top,r.z],[l.x,l.top,l.z],[0,0,-1]);
 }
 return mesh(g,mat,name,coords,normals);
}
/** Restores R13's stepped upper edge and prominent lower-center nose notch.
 * The lens is one mesh, 7 simple broad strips and NO physical eye aperture.
 */
export function contouredPanorama(g:THREE.Group,m:MaskMaterials,
 name='m50-one-piece-panoramic-visor'){
 const xs=[-3.70,-2.72,-1.34,-.45,.45,1.34,2.72,3.70];
 const tops=[5.24,5.36,5.36,5.36,5.36,5.36,5.36,5.24];
 const bottoms=[2.44,2.43,2.43,2.93,2.93,2.43,2.43,2.44];
 const depth=(x:number)=>-5.50+
  Math.max(0,Math.abs(x)-2.45)/1.25*.62;
 const samples=xs.map((x,i)=>({x,top:tops[i],bottom:bottoms[i],
  z:depth(x)}));
 const frame=samples.map(p=>({
  x:p.x+(p.x<0?-.15:.15),
  top:p.top+.16,bottom:p.bottom-.17,z:p.z+.10
 }));
 visorMesh(g,m.hardware,'m50-panoramic-frame',frame);
 const lens=visorMesh(g,m.lens,name+'-lens',samples);
 lens.userData.d2ContouredPanorama=true;
 lens.userData.d2NoseNotchRise=.50;
 return lens;
}
export function mountedFilter(g:THREE.Group,m:MaskMaterials,name:string,
 socket:V,cartridge:V,axis:V,
 radius=1.2,thickness=.78):THREE.Mesh{
 // Socket is concealed by BOTH parent facepiece and cartridge.
 const mount:V=[
  between(socket[0],cartridge[0],.32),
  between(socket[1],cartridge[1],.32),
  between(socket[2],cartridge[2],.32)
 ];
 filterPod(g,m.hardware,name+'-socket',mount,
  [radius*.70,.56,.88],axis);
 const pod=filterPod(g,m.filters,name,cartridge,
  [radius,thickness,.90],axis);
 pod.userData.d2MountPosition=socket;
 pod.userData.d2Anchored=true;
 return pod;
}
/** Finite bands that begin at the actual shell and then hug the cubic head. */
export function fittedHarness(g:THREE.Group,mat:THREE.Material,name:string,
 anchors:readonly Mount[]):void{
 for(let lane=0;lane<anchors.length;lane++){
  const a=anchors[lane],height=a.position[1],width=.35;
  const pos:number[]=[],normal:number[]=[];
  for(const sign of [-1,1] as const){
   const x=Math.abs(a.position[0]);
   const path:V[]=[
    [sign*x,height,a.position[2]-.03],
    [sign*4.15,height,-3.72],
    [sign*4.15,height,2.78],
    [sign*4.01,height,4.12]
   ];
   for(let k=0;k<path.length-1;k++){
    const p=path[k],q=path[k+1];
    quad(pos,normal,
     [p[0],p[1]-width*.5,p[2]],
     [q[0],q[1]-width*.5,q[2]],
     [q[0],q[1]+width*.5,q[2]],
     [p[0],p[1]+width*.5,p[2]],[sign,0,0]);
   }
  }
  quad(pos,normal,[-4.01,height-width*.5,4.13],
   [4.01,height-width*.5,4.13],
   [4.01,height+width*.5,4.13],
   [-4.01,height+width*.5,4.13],[0,0,1]);
  mesh(g,mat,name+'-'+lane,pos,normal);
 }
}
