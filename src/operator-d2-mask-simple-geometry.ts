/** D2 R16: authored low-poly, opaque protective mask construction.
 * Canonical cube head: X +/-4, Y -1..7, face -Z4. Intentionally
 * NO cutout triangulation, no moved extrusion vertices, no transparent panes.
 */
import * as THREE from 'three';
import type {MaskMaterials} from './operator-d2-mask-geometry.ts';
type V=readonly [number,number,number];
type P=readonly [number,number];
export type ShellRing={
 y:number;halfWidth:number;frontHalf:number;cheekHalf:number;
 frontZ:number;cheekZ:number;cornerZ:number;returnZ:number
};
const make=(g:THREE.Group,mat:THREE.Material,name:string,
 positions:number[],normals:number[]):THREE.Mesh=>{
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
 const mesh=new THREE.Mesh(geo,mat);
 mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=false;
 g.add(mesh);return mesh;
};
function emitQuad(vertices:V[],faces:number[],normals:number[],out:THREE.Vector3){
 const [a,b,,d]=vertices.map(x=>new THREE.Vector3(...x));
 // All six vertices share one deliberately chosen planar-looking normal.
 // This eliminates the giant diagonal normal discontinuities in warped
 // Three.js polygon-hole extrusions.
 let n=b.clone().sub(a).cross(d.clone().sub(a)).normalize();
 if(n.dot(out)<0)n.multiplyScalar(-1);
 const ordered=n.dot(b.clone().sub(a).cross(d.clone().sub(a)))>=0
  ?[vertices[0],vertices[1],vertices[2],vertices[0],vertices[2],vertices[3]]
  :[vertices[0],vertices[2],vertices[1],vertices[0],vertices[3],vertices[2]];
 for(const p of ordered){faces.push(...p);normals.push(n.x,n.y,n.z);}
}
function line(r:ShellRing):V[]{
 const {y,halfWidth:w,frontHalf:f,cheekHalf:c,frontZ:z,
 cheekZ:k,cornerZ:s,returnZ:b}=r;
 return [[-w,y,b],[-w,y,s],[-c,y,k],[-f,y,z],
   [f,y,z],[c,y,k],[w,y,s],[w,y,b]];
}
/** Seven broad vertical surfaces with explicit cheek/temple returns.
 * The hero shell is one object; all front panels stay flat by design.
 */
export function simpleShell(g:THREE.Group,mat:THREE.Material,
 name:string,rings:readonly ShellRing[]):THREE.Mesh{
 if(rings.length<2)throw new Error(name+': needs at least two rings');
 const pos:number[]=[],norm:number[]=[];
 const outward:THREE.Vector3[]=[
  new THREE.Vector3(-1,0,0),new THREE.Vector3(-.8,0,-.6),
  new THREE.Vector3(-.35,0,-1),new THREE.Vector3(0,0,-1),
  new THREE.Vector3(.35,0,-1),new THREE.Vector3(.8,0,-.6),
  new THREE.Vector3(1,0,0)
 ];
 for(let j=0;j<rings.length-1;j++){
  const bottom=line(rings[j]),top=line(rings[j+1]);
  for(let s=0;s<7;s++)
   emitQuad([bottom[s],bottom[s+1],top[s+1],top[s]],pos,norm,outward[s]);
 }
 const o=make(g,mat,name,pos,norm);
 o.userData.d2SimpleShell=true;
 o.userData.d2ShellRings=rings.length;
 o.userData.d2CutoutCount=0;
 return o;
}
/** Planar opaque polygon on the outside of a dark body. No holes. */
export function opaquePolygon(g:THREE.Group,mat:THREE.Material,
 name:string,poly:readonly P[],z:number):THREE.Mesh{
 const p:number[]=[],n:number[]=[];
 // Convex display-only polygons. A small, flat fan is safe because every
 // triangle is COPLANAR with the same outward normal.
 let cx=0,cy=0;
 for(const v of poly){cx+=v[0];cy+=v[1];}
 cx/=poly.length;cy/=poly.length;
 for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length];
  for(const v of [[cx,cy],b,a] as const){
   p.push(v[0],v[1],z);n.push(0,0,-1);
  }
 }
 return make(g,mat,name,p,n);
}
export function opaqueEye(g:THREE.Group,m:MaskMaterials,name:string,
 points:readonly P[],z:number,scale=1.16){
 const x=points.reduce((v,p)=>v+p[0],0)/points.length;
 const y=points.reduce((v,p)=>v+p[1],0)/points.length;
 const outside=points.map(([u,v])=>[x+(u-x)*scale,
  y+(v-y)*scale] as const);
 opaquePolygon(g,m.hardware,name+'-frame',outside,z+.07);
 opaquePolygon(g,m.lens,name+'-lens',points,z-.04);
}
export function eyeShape(cx:number,cy:number,rx:number,ry:number,
 shape:'round'|'angular'|'soft'='round'):P[]{
 if(shape==='angular')return [
  [cx-rx,cy+ry*.55],[cx-rx*.72,cy+ry],
  [cx+rx*.79,cy+ry],[cx+rx,cy+ry*.22],
  [cx+rx*.82,cy-ry],[cx-rx*.82,cy-ry]
 ];
 if(shape==='soft')return [
  [cx-rx*.75,cy+ry],[cx+rx*.75,cy+ry],
  [cx+rx,cy+ry*.45],[cx+rx*.90,cy-ry*.68],
  [cx+rx*.55,cy-ry],[cx-rx*.64,cy-ry],
  [cx-rx,cy-ry*.5],[cx-rx,cy+ry*.42]
 ];
 return Array.from({length:8},(_,i)=>{
  const a=Math.PI*(i+.5)/4;
  return [cx+rx*Math.cos(a),cy+ry*Math.sin(a)] as const;
 });
}
export function solidWedge(g:THREE.Group,mat:THREE.Material,name:string,
 points:readonly P[],zFront:number,zBack:number):THREE.Mesh{
 const pos:number[]=[],norm:number[]=[];
 let x=0,y=0;
 for(const p of points){x+=p[0];y+=p[1];}
 x/=points.length;y/=points.length;
 for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length];
  // One large flat front face plus thick cheek-side returns.
  for(const q of [[x,y,zFront],[b[0],b[1],zFront],
   [a[0],a[1],zFront]] as const){pos.push(...q);norm.push(0,0,-1);}
  const q1:V=[a[0],a[1],zFront],q2:V=[b[0],b[1],zFront],
   q3:V=[b[0],b[1],zBack],q4:V=[a[0],a[1],zBack];
  const out=new THREE.Vector3(
   (a[0]+b[0])*.5-x,(a[1]+b[1])*.5-y,0).normalize();
  emitQuad([q1,q2,q3,q4],pos,norm,out);
 }
 return make(g,mat,name,pos,norm);
}
export type HoodRing=readonly [number,number,number,number];
/** Whole-head shell (including forehead) with ten-sided profile and joined roof.
 * Intentionally no 2D faceplate cutouts or secondary cubic side plates.
 */
export function simpleHood(g:THREE.Group,mat:THREE.Material,
 name:string,levels:readonly HoodRing[]):THREE.Group{
 const root=new THREE.Group();root.name=name;g.add(root);
 const pts=([y,w,front,rear]:HoodRing):V[]=>[
  // Full width starts before the square skull's front and continues
  // past its rear corners. Earlier chamfers crossed *inside* the skull,
  // exposing two conspicuous vertical strips of skin on both sides.
  [0,y,front],[-w*.96,y,front+.10],[-w,y,-4.10],
  [-w,y,4.13],[-w*.96,y,rear-.06],[0,y,rear+.13],
  [w*.96,y,rear-.06],[w,y,4.13],[w,y,-4.10],
  [w*.96,y,front+.10]
 ];
 const pos:number[]=[],norm:number[]=[];
 for(let i=0;i<levels.length-1;i++){
  const a=pts(levels[i]),b=pts(levels[i+1]);
  for(let k=0;k<a.length;k++){
   const t=(k+1)%a.length;
   const x=(a[k][0]+a[t][0])*.5,z=(a[k][2]+a[t][2])*.5;
   const out=new THREE.Vector3(x*.3,0,z).normalize();
   emitQuad([a[k],a[t],b[t],b[k]],pos,norm,out);
  }
 }
 const top=pts(levels[levels.length-1]);
 const cy=levels[levels.length-1][0];
 for(let i=0;i<top.length;i++){
  const q=top[i],next=top[(i+1)%top.length];
  // Fully planar flat top: no triangular shading.
  for(const p of [[0,cy,0],q,next] as V[]){
   pos.push(...p);norm.push(0,1,0);
  }
 }
 make(root,mat,'hood-crown',pos,norm);
 return root;
}
/** Single piece of opaque panoramic glass with two sloped side returns.
 * One mesh, deliberately identical normals on each large planar region.
 */
export function panorama(g:THREE.Group,mat:THREE.Material,name:string,
 top:number,bottom:number,centerW:number,outerW:number,
 front:number,side:number):THREE.Mesh{
 const pos:number[]=[],norm:number[]=[];
 const strip=(a:number,b:number,za:number,zb:number)=>{
  const v:V[]=[[a,bottom,za],[b,bottom,zb],
   [b,top,zb],[a,top,za]];
  emitQuad(v,pos,norm,new THREE.Vector3(0,0,-1));
 };
 strip(-outerW,-centerW,side,front);
 strip(-centerW,centerW,front,front);
 strip(centerW,outerW,front,side);
 return make(g,mat,name,pos,norm);
}
/** Wide fabric harness with surfaces closely riding the cube head.
 * Two bands total, not individual floating bars every 0.5 units.
 */
export function simpleHarness(g:THREE.Group,mat:THREE.Material,
 name:string,heights:readonly number[]):void{
 for(let lane=0;lane<heights.length;lane++){
  const y=heights[lane],pos:number[]=[],norm:number[]=[];
  for(const sign of [-1,1] as const){
   const points:V[]=[
    [sign*4.14,y,-3.50],[sign*4.15,y,-2.5],
    [sign*4.14,y,2.55],[sign*4.02,y,4.10]
   ];
   for(let i=0;i<points.length-1;i++){
    const a=points[i],b=points[i+1],t=.19;
    emitQuad([
     [a[0],a[1]-t,a[2]],[b[0],b[1]-t,b[2]],
     [b[0],b[1]+t,b[2]],[a[0],a[1]+t,a[2]]
    ],pos,norm,new THREE.Vector3(sign,0,0));
   }
  }
  // Connect both side strips at the back, on Z=+4.12.
  emitQuad([[-4.03,y-.19,4.12],[4.03,y-.19,4.12],
   [4.03,y+.19,4.12],[-4.03,y+.19,4.12]],
   pos,norm,new THREE.Vector3(0,0,1));
  make(g,mat,name+'-'+lane,pos,norm);
 }
}
