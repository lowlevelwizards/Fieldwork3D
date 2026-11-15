/** S1-A1B: refined one-piece stamped DDR M56 steel shell.
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
 [-.72,-1],[.72,-1],[1,-.72],[1,.72],
 [.72,1],[-.72,1],[-1,.72],[-1,-.72]
] as const;
/** Three meaningful external masses: a short square top, one main
 * tapering bowl, and the continuous *integral* outward lower flare.
 * The bottom 0.35 is the stamped sheet edge, not a separate visor.
 * The larger upper shoulder and inset inner wall surround every actual
 * 8x8 skull corner: no exposed tan triangles at Studio zoom.
 * Preserve the historical and existing code's front and rear maxima.
 */
export const M56_SHELL_RINGS:readonly Ring[]=[
 {name:'reduced-angular-crown',y:8.775,side:3.08,front:3.48,rear:3.72},
 {name:'single-upper-shoulder',y:8.07,side:5.60,front:5.70,rear:6.00},
 // Begin the profile flare *above* the edge instead of making a shelf.
 // The two larger lower bands are continuous steel faces, not attached trim.
 {name:'flowing-upper-skirt',y:6.35,side:6.03,front:6.15,rear:7.12,
  frontRise:.08,rearDrop:.15},
 {name:'integral-flared-edge-top',y:4.73,side:6.74,front:6.75,rear:8.04,
  frontRise:.23,rearDrop:.37},
 {name:'thin-steel-edge-bottom',y:4.43,side:6.87,front:6.80,rear:8.10,
  frontRise:.31,rearDrop:.46},
 {name:'inward-stamped-return',y:4.51,side:6.38,front:6.34,rear:7.58,
  frontRise:.25,rearDrop:.40},
 {name:'recessed-inner-wall',y:7.40,side:5.50,front:5.58,rear:5.94},
 {name:'recessed-interior-ceiling',y:7.75,side:4.90,front:5.00,rear:5.20}
] as const;
export const M56_SHELL_FIT=Object.freeze({
 top:8.775,outerSide:6.87,frontExtent:-6.80,rearExtent:8.10,
 frontHem:4.74,sideHem:4.43,rearHem:3.97
});
const sample=(ring:Ring,index:number):Point=>{
 const [fx,fz]=M56_PERIMETER[(index+8)%8];
 return [fx*ring.side,
  ring.y+(fz<0?(ring.frontRise??0)*-fz:-(ring.rearDrop??0)*fz),
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
  const region:0|1|2|3=j===3?2:j>=4?1:0;
  const tone=j===0?.985:j===1?.97:j===2?.96:j===3?.92:
   j===4?.88:j===5?.83:.85;
  for(let i=0;i<N;i++){
   const k=(i+1)%N,p=sample(a,i),q=sample(a,k),
    r=sample(b,k),s=sample(b,i);
   const mx=(p[0]+q[0]+r[0]+s[0])/4,
    mz=(p[2]+q[2]+r[2]+s[2])/4;
   const toward:Point=j>=5?[-mx,0,-mz]:
    j===4?[0,-1,0]:[mx,j===0?.35:0,mz];
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
 geo.userData.m56ProfileRevision='S1-A1B';
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
