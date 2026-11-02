/** Stage 1A: shape-language prototypes authored in the *canonical* operator
 * frame: -Z forward, +X right, +Y up.
 *
 * No rails, straps, decals, z-fighting overlay boxes or shared "helmet(size)"
 * function. Four distinct authored shell cross-section profiles; neutral
 * materials only. Models must pass a silhouette review before construction.
 */
import * as THREE from 'three';

export type HeadSilhouetteId='patrol-cap'|'ach'|'high-cut';
export type HeadSilhouetteMetrics={
 id:HeadSilhouetteId;frontExtent:number;rearExtent:number;top:number;
 earEdge:number;foreheadEdge:number;billLength:number;
};
// Source-of-truth measurements in the existing 8x8x8 head's units:
// skull top = y7, face front = z-4, ears centered at x+/-4.
export const HEAD_SILHOUETTE_METRICS:Readonly<Record<HeadSilhouetteId,HeadSilhouetteMetrics>>={
 'patrol-cap':{id:'patrol-cap',frontExtent:-9.5,rearExtent:4.50,
  top:8.72,earEdge:5.10,foreheadEdge:5.02,billLength:4.85},
 'ach':{id:'ach',frontExtent:-5.23,rearExtent:5.35,
  top:10.40,earEdge:2.80,foreheadEdge:4.58,billLength:0},
 'high-cut':{id:'high-cut',frontExtent:-5.08,rearExtent:4.96,
  top:9.86,earEdge:6.08,foreheadEdge:4.82,billLength:0}
};
type Ring={
 y:number;radiusX:number;front:number;rear:number;
 centerX?:number;centerZ?:number;
 superellipse?:number;
 /** Worn edge heights at forehead / side (ear) / nape. */
 edge?:{front:number;side:number;rear:number};
};
/** Circular with optional near-squared cap profile, finite and flat-shaded. */
function perimeter(r:Ring,i:number,n:number):THREE.Vector3{
 const angle=i*Math.PI*2/n;
 const sx=Math.sin(angle),cz=Math.cos(angle);
 const exp=r.superellipse??2;
 const warp=(v:number)=>Math.sign(v)*Math.pow(Math.abs(v),2/exp);
 const x=(r.centerX??0)+r.radiusX*warp(sx);
 const z=(r.centerZ??0)-(cz>=0?r.front:r.rear)*warp(cz);
 let y=r.y;
 if(r.edge){
  const f=Math.pow(Math.max(0,cz),4);
  const b=Math.pow(Math.max(0,-cz),4);
  const s=Math.max(0,1-f-b);
  y=r.edge.front*f+r.edge.rear*b+r.edge.side*s;
 }
 return new THREE.Vector3(x,y,z);
}
/** Single joined shell, no nearly-coplanar nested crown or separate rim. */
export function buildFacetedHeadShell(rings:readonly Ring[],segments=16):THREE.BufferGeometry{
 if(rings.length<2||segments<8||segments>32)
  throw new Error('Head shell requires at least two rings and 8–32 facets');
 const positions:number[]=[],uv:number[]=[],indices:number[]=[];
 for(const r of rings){
  for(let i=0;i<segments;i++){
   const p=perimeter(r,i,segments);
   positions.push(p.x,p.y,p.z);
   uv.push(i/segments,r.y/12);
  }
 }
 for(let j=0;j<rings.length-1;j++)for(let i=0;i<segments;i++){
  const next=(i+1)%segments,lo=j*segments,hi=(j+1)*segments;
  // With theta=0 at front, top-up then circumferential tangent faces out.
  indices.push(lo+i,hi+i,lo+next,lo+next,hi+i,hi+next);
 }
 const top=rings[rings.length-1],start=positions.length/3;
 const capY=top.y+.02;
 positions.push(top.centerX??0,capY,top.centerZ??0);
 uv.push(.5,.5);
 const row=(rings.length-1)*segments;
 for(let i=0;i<segments;i++)
  indices.push(start,row+(i+1)%segments,row+i);
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 geometry.setIndex(indices);
 geometry.computeVertexNormals();geometry.computeBoundingBox();
 return geometry;
}
/** One continuous, finite-thickness bill: front vertices converge toward
 * a gently bowed lip. No rectangular part penetrating the cap's crown.
 */
export function buildPatrolBill():THREE.BufferGeometry{
 // Width of bill is slightly greater than crown; it extends forward
 // without becoming the same width as a slab.
 const widths=[3.92,4.42,3.45,1.8];
 const depths=[-4.18,-5.55,-8.18,-9.5];
 const heights=[5.20,5.12,4.97,5.02];
 const positions:number[]=[],uv:number[]=[],indices:number[]=[];
 const sections=7;
 for(let face=0;face<2;face++)
  for(let j=0;j<depths.length;j++)
   for(let i=0;i<sections;i++){
    const u=i/(sections-1),x=(2*u-1)*widths[j];
    const y=heights[j]+.13*Math.pow(Math.abs(2*u-1),2)
      +(face===0?.12:-.12);
    positions.push(x,y,depths[j]);
    uv.push(u,j/(depths.length-1));
   }
 const offset=sections*depths.length;
 for(let face=0;face<2;face++)for(let j=0;j<depths.length-1;j++)
  for(let i=0;i<sections-1;i++){
   const a=face*offset+j*sections+i,b=a+1,c=a+sections,d=c+1;
   if(face===0)indices.push(a,b,c,b,d,c);
   else indices.push(a,c,b,b,c,d);
  }
 // Close the profile at its two sides and the outer lip.
 for(const side of [0,sections-1])for(let j=0;j<depths.length-1;j++){
  const a=j*sections+side,b=(j+1)*sections+side;
  indices.push(a,b,a+offset,b,b+offset,a+offset);
 }
 for(let i=0;i<sections-1;i++){
  const a=(depths.length-1)*sections+i,b=a+1;
  indices.push(a,b,a+offset,b,b+offset,a+offset);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingBox();
 return geometry;
}
const CAP_RINGS:readonly Ring[]=[
 {y:5.20,radiusX:4.39,front:4.42,rear:4.50,superellipse:3.3},
 {y:6.05,radiusX:4.44,front:4.40,rear:4.48,superellipse:3.4},
 {y:7.82,radiusX:4.12,front:4.05,rear:4.04,centerZ:.14,superellipse:3.45},
 {y:8.70,radiusX:2.85,front:2.82,rear:2.9,centerZ:.20,superellipse:4.0}
];
const ACH_RINGS:readonly Ring[]=[
 {y:4.0,radiusX:5.04,front:5.23,rear:5.35,
  edge:{front:4.58,side:2.80,rear:3.70}},
 {y:5.45,radiusX:5.40,front:5.30,rear:5.37},
 {y:7.62,radiusX:5.12,front:5.12,rear:5.10,centerZ:.12},
 {y:9.36,radiusX:3.65,front:3.77,rear:3.80,centerZ:.05},
 {y:10.38,radiusX:1.40,front:1.47,rear:1.50}
];
const HIGH_CUT_RINGS:readonly Ring[]=[
 {y:5.3,radiusX:4.73,front:5.08,rear:4.96,
  edge:{front:4.82,side:6.08,rear:4.70}},
 {y:6.44,radiusX:5.00,front:5.11,rear:4.99},
 {y:8.20,radiusX:4.51,front:4.69,rear:4.54,centerZ:.08},
 {y:9.30,radiusX:3.17,front:3.31,rear:3.20},
 {y:9.84,radiusX:1.24,front:1.28,rear:1.26}
];
export function createHeadwearSilhouette(
 id:HeadSilhouetteId,material:THREE.Material
):THREE.Group{
 const group=new THREE.Group();
 group.name='silhouette-'+id+'-minus-Z-forward';
 const rings=id==='patrol-cap'?CAP_RINGS:
  id==='ach'?ACH_RINGS:HIGH_CUT_RINGS;
 const shell=new THREE.Mesh(buildFacetedHeadShell(rings,id==='patrol-cap'?12:16),material);
 shell.name=id+'-continuous-crown';
 shell.castShadow=true;shell.receiveShadow=true;group.add(shell);
 if(id==='patrol-cap'){
  const bill=new THREE.Mesh(buildPatrolBill(),material);
  bill.name='patrol-cap-formed-bill';
  bill.castShadow=true;bill.receiveShadow=true;group.add(bill);
 }
 group.userData.stage='1A';
 group.userData.modelAxes='-Z-forward,+X-right,+Y-up';
 group.userData.silhouette=id;
 return group;
}
