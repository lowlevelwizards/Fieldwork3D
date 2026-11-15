/** S1-A1E: silhouette-first DDR M56 steel shell, with two major masses.
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
 frontRise?:number;rearDrop?:number};
export const M56_PERIMETER:readonly (readonly [number,number])[]=[
 // Eight coarse corners. The upper shell stays straight; only the lower
 // two rings shape the shallow side-ear relief and descending rear skirt.
 [-.72,-1],[.72,-1],[1,-.72],[1,-.05],
 [.72,1],[-.72,1],[-1,-.05],[-1,-.72]
] as const;
/** Six profile rings (96 triangles) including the hidden underside.
 * Two exterior shell masses only: a broad nearly upright bell and ONE
 * strongly flared stamped skirt. The shallow ear relief exists ONLY in
 * the hem and steel return; no separate earpiece mesh or upper-shell ring.
 * Fit maximum extents and color/wardrobe identity remain unchanged.
 */
export const M56_SHELL_RINGS:readonly Ring[]=[
 {name:'broad-square-crown',y:8.775,side:4.80,front:5.05,rear:5.30},
 {name:'single-upright-bell',y:6.02,side:5.73,front:5.82,rear:6.43},
 {name:'distinct-swept-skirt-hem',y:4.53,side:6.87,front:6.80,rear:8.10,
  frontRise:.70,rearDrop:1.00},
 {name:'thin-inward-steel-return',y:4.63,side:6.46,front:6.39,rear:7.66,
  frontRise:.68,rearDrop:.98},
 {name:'recessed-inner-wall',y:7.40,side:5.50,front:5.58,rear:5.94},
 {name:'recessed-interior-ceiling',y:7.75,side:4.90,front:5.00,rear:5.20}
] as const;
export const M56_SHELL_FIT=Object.freeze({
 top:8.775,outerSide:6.87,frontExtent:-6.80,rearExtent:8.10,
 frontHem:5.23,sideHem:4.995,rearHem:3.53
});
/** Ear transition is localized to the two low steel rings, not the cap.
 * - The temple falls from the forehead to expose the face.
 * - The side rim rises gently over the ear, then drops to the long nape.
 * A purposeful shallow notch rather than a separate PASGT-shaped panel.
 */
const sample=(ring:Ring,index:number):Point=>{
 const n=M56_PERIMETER.length,idx=(index+n)%n;
 const [fx,fz]=M56_PERIMETER[idx];
 const edge=ring===M56_SHELL_RINGS[2]||ring===M56_SHELL_RINGS[3];
 const temple=edge&&(idx===2||idx===7)?-.47:0;
 const ear=edge&&(idx===3||idx===6)?.43:0;
 const along=fz<0?(ring.frontRise??0)*-fz:-(ring.rearDrop??0)*fz;
 return [fx*ring.side,ring.y+along+temple+ear,
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
  // One painted exterior tone across BOTH substantial surfaces; shadow
  // coloring starts only on the turned-under edge and hollow interior.
  const region:0|1|2|3=j>=2?1:0;
  const tone=j<2?.97:j===2?.88:j===3?.83:.85;
  for(let i=0;i<N;i++){
   const k=(i+1)%N,p=sample(a,i),q=sample(a,k),
    r=sample(b,k),s=sample(b,i);
   const mx=(p[0]+q[0]+r[0]+s[0])/4,
    mz=(p[2]+q[2]+r[2]+s[2])/4;
   const toward:Point=j>=3?[-mx,0,-mz]:
    j===2?[0,-1,0]:[mx,0,mz];
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
 geo.userData.m56ProfileRevision='S1-A1E';
 geo.userData.m56TriangleBudget=96;
 geo.userData.m56LocalEarRelief=true;
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
