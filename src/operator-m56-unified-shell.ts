/** S1-A1D: deliberately low-poly, angular DDR M56 stamped steel shell.
 * Boxy Fieldwork interpretation of the real M56's shallow crown,
 * diagonal bell and striking long swept rear flare.
 * NO stacked cuboids, extra ridge bands or M1-style rolled brim.
 * One low-poly mesh owns both exterior and visible recessed underside.
 * Head frame: +Y up, -Z face, +X operator right.
 */
import * as THREE from 'three';
import {PIXEL_WORLD_SIZE} from './rendering/pixel-recipes.ts';

type Point=readonly [number,number,number];
type Ring={name:string;y:number;side:number;front:number;rear:number;
 frontRise?:number;rearDrop?:number;earDip?:number};
export const M56_PERIMETER:readonly (readonly [number,number])[]=[
 // Eight purposeful corners: front visor, front-side, behind-ear hinge,
 // and projecting rear nape. Two side slope changes, NO ear notch.
 [-.72,-1],[.72,-1],[1,-.62],[1,.20],
 [.72,1],[-.72,1],[-1,.20],[-1,-.62]
] as const;
/** Exactly seven profile rings and eight perimeter corners produce
 * 112 triangles including crown and recessed interior, down from 192.
 * One large nearly vertical upper bell meets ONE unmistakably angled
 * lower protective skirt. No decorative intermediate terraces.
 * Hem is a continuous descending visor / ear / rear contour; not an
 * M1 brim, PASGT ear cut, or a protruding polygon ear guard.
 * Exterior X/Z maxima, cap top and square-head clearance are retained.
 */
export const M56_SHELL_RINGS:readonly Ring[]=[
 {name:'square-faceted-crown',y:8.775,side:3.08,front:3.48,rear:3.72},
 {name:'broad-upper-shoulder',y:7.87,side:5.58,front:5.70,rear:6.00},
 {name:'lower-bell-angular-break',y:5.95,side:5.79,front:5.93,rear:6.75,
  frontRise:.12,rearDrop:.12},
 // Strong lower outward sweep: front up, ear protected, nape deep.
 {name:'swept-stamped-edge',y:4.47,side:6.87,front:6.80,rear:8.10,
  frontRise:.83,rearDrop:1.12,earDip:.12},
 // Inward rolled steel return, NOT another visible painted skirt tier.
 {name:'inset-steel-return',y:4.55,side:6.47,front:6.40,rear:7.65,
  frontRise:.80,rearDrop:1.09,earDip:.10},
 {name:'recessed-inner-wall',y:7.40,side:5.50,front:5.58,rear:5.94},
 {name:'recessed-interior-ceiling',y:7.75,side:4.90,front:5.00,rear:5.20}
] as const;
export const M56_SHELL_FIT=Object.freeze({
 top:8.775,outerSide:6.87,frontExtent:-6.80,rearExtent:8.10,
 frontHem:5.30,sideHem:4.126,rearHem:3.35
});
// A single contour function drives the outer steel and inset return.
// The single behind-ear corner defines the clear change of slope;
 // no smooth interpolated staircase or independently attached panel.
export const m56EarTransition=(fz:number):number=>
 Math.max(0,1-Math.abs(fz-.20)/.65);
const sample=(ring:Ring,index:number):Point=>{
 const [fx,fz]=M56_PERIMETER[(index+M56_PERIMETER.length)%M56_PERIMETER.length];
 const along=fz<0?(ring.frontRise??0)*-fz:-(ring.rearDrop??0)*fz;
 const sideWeight=Math.max(0,(Math.abs(fx)-.72)/.28);
 const earDip=(ring.earDip??0)*sideWeight*m56EarTransition(fz);
 return [fx*ring.side,ring.y+along-earDip,
  fz*(fz<0?ring.front:ring.rear)];
};
export const m56SurfacePoint=(ring:number,index:number):Point=>
 sample(M56_SHELL_RINGS[ring],index);

export function createM56UnifiedShellGeometry():THREE.BufferGeometry{
 const positions:number[]=[],uv:number[]=[],uv1:number[]=[],colors:number[]=[],
  normals:number[]=[],index:number[]=[];
 let quads=0;
 const put=(p:Point,region:0|1|2|3,tone:number,axis:0|1|2,normal:THREE.Vector3)=>{
  positions.push(...p);
  const u=axis===0?p[2]:p[0],v=axis===1?p[2]:p[1];
  uv.push(((region%2)*32+16+u/PIXEL_WORLD_SIZE)/64,
   (Math.floor(region/2)*32+16+v/PIXEL_WORLD_SIZE)/64);
  const clamp=(n:number)=>Math.max(.005,Math.min(31.995,n));
  const span=8.2,per=axis===2?(p[2]<0?span+p[0]:5*span-p[0]):
   axis===0?(p[0]>0?3*span+p[2]:7*span-p[2]):16+p[0];
  const cu=axis===1?16+p[0]:per*32/(8*span),
   cv=axis===1?16+p[2]:16+p[1];
  uv1.push(((region%2)*64+2*clamp(cu))/128,
   (Math.floor(region/2)*64+2*clamp(cv))/128);
  colors.push(tone,tone,tone);
  normals.push(normal.x,normal.y,normal.z);
 };
 const face=(points:readonly Point[],outward:Point,
  region:0|1|2|3,tone:number)=>{
  const [a,b,c]=points;
  const normal=new THREE.Vector3(...b).sub(new THREE.Vector3(...a))
   .cross(new THREE.Vector3(...c).sub(new THREE.Vector3(...a)));
  const ordered=normal.dot(new THREE.Vector3(...outward))>=0?
   points:[points[0],...points.slice(1).reverse()];
  const abs=[Math.abs(normal.x),Math.abs(normal.y),Math.abs(normal.z)];
  const axis=abs.indexOf(Math.max(...abs)) as 0|1|2;
  // Non-coplanar stamped panels used to shade one triangle noticeably
  // darker than the other. Use one area-weighted NORMAL per authored quad,
  // preserving its wide planar Fieldwork read without adding polygons.
  const vertex=(p:Point)=>new THREE.Vector3(...p);
  const v0=vertex(ordered[0]),v1=vertex(ordered[1]),v2=vertex(ordered[2]);
  const faceNormal=new THREE.Vector3().crossVectors(
   new THREE.Vector3().subVectors(v1,v0),
   new THREE.Vector3().subVectors(v2,v0));
  if(ordered.length===4){
   const v3=vertex(ordered[3]);
   faceNormal.add(new THREE.Vector3().crossVectors(
    new THREE.Vector3().subVectors(v2,v0),
    new THREE.Vector3().subVectors(v3,v0)));
  }
  faceNormal.normalize();
  const start=positions.length/3;
  for(const point of ordered)put(point,region,tone,axis,faceNormal);
  index.push(start,start+1,start+2);
  if(ordered.length===4){index.push(start,start+2,start+3);quads++;}
 };
 const N=M56_PERIMETER.length,top=M56_SHELL_RINGS[0];
 for(let i=0;i<N;i++)
  face([[0,top.y,0],sample(top,i),sample(top,(i+1)%N)],
   [0,1,0],3,1);
 for(let j=0;j<M56_SHELL_RINGS.length-1;j++){
  const a=M56_SHELL_RINGS[j],b=M56_SHELL_RINGS[j+1];
  // Only the three large OUTER surfaces share painted steel. The narrow
  // inward return and recessed lining use the shadow atlas.
  const region:0|1|2|3=j>=3?1:0;
  const tone=j===0?.985:j===1?.965:j===2?.965:
   j===3?.87:j===4?.83:.85;
  for(let i=0;i<N;i++){
   const k=(i+1)%N,p=sample(a,i),q=sample(a,k),
    r=sample(b,k),s=sample(b,i);
   const mx=(p[0]+q[0]+r[0]+s[0])/4,
    mz=(p[2]+q[2]+r[2]+s[2])/4;
   const toward:Point=j>=4?[-mx,0,-mz]:
    j===3?[0,-1,0]:[mx,j===0?.35:0,mz];
   face([p,q,r,s],toward,region,tone);
  }
 }
 const inner=M56_SHELL_RINGS[M56_SHELL_RINGS.length-1];
 for(let i=0;i<N;i++)
  face([[0,inner.y,0],sample(inner,(i+1)%N),sample(inner,i)],
   [0,-1,0],1,.84);
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 geo.setAttribute('uv1',new THREE.Float32BufferAttribute(uv1,2));
 geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
 geo.setIndex(index);
 geo.computeBoundingBox();
 geo.userData.m56UnifiedStampedShell=true;
 geo.userData.m56ProfileRevision='S1-A1D';
 geo.userData.m56TriangleBudget=112;
 geo.userData.m56SingleLowerAngularBreak=true;
 geo.userData.m56EarToNapeContour=true;
 geo.userData.m56ConsistentQuadNormals=true;
 geo.userData.m56SkirtSwept=true;
 geo.userData.m56VisibleRecessedInterior=true;
 geo.userData.m56ContinuousFlare=true;
 geo.userData.m56ProfileStations=M56_SHELL_RINGS.map(r=>r.name);
 geo.userData.m56PerimeterFacets=N;
 geo.userData.exteriorQuads=quads;
 geo.userData.materialRegions=true;
 geo.userData.pixelWorldSize=PIXEL_WORLD_SIZE;
 geo.userData.materialAtlasPixels=64;
 geo.userData.camoAtlasPixels=128;
 geo.userData.camoUvLayout='planar-top/continuous-perimeter';
 return geo;
}
