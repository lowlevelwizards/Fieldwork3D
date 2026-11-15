/** B2 SSh-40: one purpose-built Soviet steel bell, not a scaled M1.
 * Head local: +Y up, -Z toward face, +X operator right.
 * Eight bold perimeter faces, a gently flared lower roll, and a hollow
 * visible interior. One prebuilt steel mesh, no runtime reconstruction.
 */
import * as THREE from 'three';
import {PIXEL_WORLD_SIZE} from './rendering/pixel-recipes.ts';

type Point=readonly [number,number,number];
type Level={name:string;y:number;side:number;front:number;rear:number;
 frontRise?:number;rearDrop?:number;};
export const SSH40_OUTLINE:readonly (readonly [number,number])[]=[
 [-.70,-1],[.70,-1],[1,-.70],[1,.70],
 [.70,1],[-.70,1],[-1,.70],[-1,-.70]
] as const;
/** Distinct from M1's high broad pot and strongly projecting rim:
 * Soviet shell has one smaller domed shoulder flowing into a long bell.
 * The last four rings are the inward rolled lip and deep interior.
 * Exterior dimensions match the established equipment-fit envelope.
 */
export const SSH40_STEEL_LEVELS:readonly Level[]=[
 {name:'shallow-crown',y:8.605,side:2.92,front:3.08,rear:3.12},
 {name:'round-shoulder',y:8.07,side:3.83,front:3.95,rear:4.00},
 {name:'deep-bell-upper',y:6.78,side:4.63,front:4.70,rear:4.75},
 {name:'deep-bell-wall',y:4.66,side:5.02,front:5.08,rear:5.10},
 {name:'subtle-rolled-edge-top',y:4.11,side:5.40,front:5.53,rear:5.53,
  frontRise:.35,rearDrop:.30},
 {name:'subtle-rolled-edge-bottom',y:3.70,side:5.40,front:5.53,rear:5.53,
  frontRise:.35,rearDrop:.30},
 {name:'inward-steel-return',y:3.76,side:5.06,front:5.16,rear:5.16,
  frontRise:.34,rearDrop:.29},
 {name:'inside-bell-wall',y:6.72,side:4.48,front:4.56,rear:4.58},
 {name:'recessed-interior-roof',y:7.71,side:3.18,front:3.30,rear:3.30}
] as const;
export const SSH40_FIT_LANDMARKS=Object.freeze({
 top:8.605,outerSide:5.40,frontExtent:-5.53,rearExtent:5.53,
 frontHem:4.05,sideHem:3.70,rearHem:3.40
});
const point=(l:Level,index:number):Point=>{
 const [x,z]=SSH40_OUTLINE[(index+SSH40_OUTLINE.length)%SSH40_OUTLINE.length];
 return [x*l.side,l.y+(z<0?(l.frontRise??0)*-z:-(l.rearDrop??0)*z),
  z*(z<0?l.front:l.rear)];
};
export function ssh40SurfacePoint(ring:number,index:number):Point{
 return point(SSH40_STEEL_LEVELS[ring],index);
}
export function createSsh40ProfileGeometry():THREE.BufferGeometry{
 const positions:number[]=[],uv:number[]=[],uv1:number[]=[],colors:number[]=[],
  indices:number[]=[];
 let quads=0;
 const add=(p:Point,region:0|1|2|3,tone:number,axis:0|1|2)=>{
  positions.push(...p);
  const u=axis===0?p[2]:p[0],v=axis===1?p[2]:p[1];
  uv.push(((region%2)*32+16+u/PIXEL_WORLD_SIZE)/64,
   (Math.floor(region/2)*32+16+v/PIXEL_WORLD_SIZE)/64);
  const safe=(n:number)=>Math.max(.005,Math.min(31.995,n));
  const span=5.5,per=axis===2?(p[2]<0?span+p[0]:5*span-p[0]):
   axis===0?(p[0]>0?3*span+p[2]:7*span-p[2]):16+p[0];
  const cu=axis===1?16+p[0]:per*32/(8*span),
   cv=axis===1?16+p[2]:16+p[1];
  uv1.push(((region%2)*64+2*safe(cu))/128,
   (Math.floor(region/2)*64+2*safe(cv))/128);
  colors.push(tone,tone,tone);
 };
 const face=(pts:readonly Point[],out:Point,region:0|1|2|3,tone:number)=>{
  const [a,b,c]=pts;
  const n=new THREE.Vector3(...b).sub(new THREE.Vector3(...a))
   .cross(new THREE.Vector3(...c).sub(new THREE.Vector3(...a)));
  const ordered=n.dot(new THREE.Vector3(...out))>=0?
   pts:[pts[0],...pts.slice(1).reverse()];
  const axis=([Math.abs(n.x),Math.abs(n.y),Math.abs(n.z)]
   .indexOf(Math.max(Math.abs(n.x),Math.abs(n.y),Math.abs(n.z)))) as 0|1|2;
  const start=positions.length/3;
  for(const p of ordered)add(p,region,tone,axis);
  indices.push(start,start+1,start+2);
  if(pts.length===4){
   indices.push(start,start+2,start+3);quads++;
  }
 };
 const n=SSH40_OUTLINE.length,roof=SSH40_STEEL_LEVELS[0];
 const center:Point=[0,roof.y,0];
 for(let i=0;i<n;i++)
  face([center,point(roof,i),point(roof,(i+1)%n)],[0,1,0],3,.99);
 for(let j=0;j<SSH40_STEEL_LEVELS.length-1;j++){
  const a=SSH40_STEEL_LEVELS[j],b=SSH40_STEEL_LEVELS[j+1];
  const region:0|1|2|3=j===3||j===4?2:j>=5?1:0;
  const tone=j===4?.83:j===5?.87:j===6?.81:j===7?.84:
   j===3?.91:j===2?.95:j===1?.97:.985;
  for(let i=0;i<n;i++){
   const k=(i+1)%n,p=point(a,i),q=point(a,k),
    r=point(b,k),s=point(b,i);
   const mx=(p[0]+q[0]+r[0]+s[0])/4,
    mz=(p[2]+q[2]+r[2]+s[2])/4;
   const facing:Point=j>=6?[-mx,0,-mz]:
    j===5?[0,-1,0]:[mx,j===0?.6:0,mz];
   face([p,q,r,s],facing,region,tone);
  }
 }
 const inner=SSH40_STEEL_LEVELS[SSH40_STEEL_LEVELS.length-1];
 const innerCenter:Point=[0,inner.y,0];
 for(let i=0;i<n;i++)
  face([innerCenter,point(inner,(i+1)%n),point(inner,i)],
   [0,-1,0],1,.82);
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 geometry.setAttribute('uv1',new THREE.Float32BufferAttribute(uv1,2));
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geometry.setIndex(indices);
 geometry.computeVertexNormals();geometry.computeBoundingBox();
 geometry.userData.ssh40FacetedSurface=true;
 geometry.userData.ssh40IdentityRevision=2;
 geometry.userData.ssh40VisibleInterior=true;
 geometry.userData.ssh40OutlineSegments=n;
 geometry.userData.ssh40ProfileStations=SSH40_STEEL_LEVELS.map(l=>l.name);
 geometry.userData.exteriorQuads=quads;
 geometry.userData.materialRegions=true;
 geometry.userData.pixelWorldSize=PIXEL_WORLD_SIZE;
 geometry.userData.materialAtlasPixels=64;
 geometry.userData.camoAtlasPixels=128;
 geometry.userData.camoUvLayout='planar-top/continuous-perimeter';
 return geometry;
}
