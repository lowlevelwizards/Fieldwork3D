/** B2 SSh-40: one purpose-built Soviet steel bell, not a scaled M1.
 * Head local: +Y up, -Z toward face, +X operator right.
 * Eight bold perimeter faces, a shallow rolled hem, and a hollow
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
/** B2-A2: LARGE, simple Soviet bell; three exterior masses rather than
 * four successively bevelled bands. The narrow roll is integrated into the
 * lower bell, not a projecting M1-style shelf. The high crown gives the
 * cube skull room without repeating the M1's broad rectangular pot.
 * Exterior wall is continuous from the shoulder to the swept lower skirt.
 */
export const SSH40_STEEL_LEVELS:readonly Level[]=[
 {name:'crown-top',y:9.65,side:3.45,front:3.70,rear:3.82},
 {name:'dome-to-bell-shoulder',y:8.80,side:4.56,front:4.67,rear:4.79},
 {name:'single-continuous-bell-wall',y:4.72,side:5.72,front:5.84,rear:6.02,
  frontRise:.20,rearDrop:.38},
 {name:'integrated-rolled-edge-top',y:4.18,side:5.86,front:5.92,rear:6.08,
  frontRise:.20,rearDrop:.40},
 {name:'integrated-rolled-edge-bottom',y:3.78,side:5.86,front:5.92,rear:6.08,
  frontRise:.20,rearDrop:.40},
 {name:'inward-return',y:3.86,side:5.42,front:5.48,rear:5.64,
  frontRise:.18,rearDrop:.36},
 {name:'inside-bell-wall',y:7.08,side:4.98,front:5.10,rear:5.24},
 {name:'recessed-interior-roof',y:8.74,side:3.62,front:3.82,rear:3.92}
] as const;
/** The named fit landmarks are real outer steel bounds; lower hem values
 * are at the canonical front, mid-side, and back, respectively.
 * The coarse old cuboids are only wardrobe/fit proxies, never geometry.
 */
export const SSH40_FIT_LANDMARKS=Object.freeze({
 top:9.65,outerSide:5.86,frontExtent:-5.92,rearExtent:6.08,
 frontHem:3.98,sideHem:3.78,rearHem:3.38
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
  const region:0|1|2|3=j===2||j===3?2:j>=4?1:0;
  const tone=j===3?.90:j===4?.88:j===5?.84:j===6?.86:
   j===2?.93:j===1?.955:.985;
  for(let i=0;i<n;i++){
   const k=(i+1)%n,p=point(a,i),q=point(a,k),
    r=point(b,k),s=point(b,i);
   const mx=(p[0]+q[0]+r[0]+s[0])/4,
    mz=(p[2]+q[2]+r[2]+s[2])/4;
   const facing:Point=j>=5?[-mx,0,-mz]:
    j===4?[0,-1,0]:[mx,j===0?.6:0,mz];
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
 geometry.userData.ssh40IdentityRevision=3;
 geometry.userData.ssh40VisibleInterior=true;
 geometry.userData.ssh40OutlineSegments=n;
 geometry.userData.ssh40ProfileStations=SSH40_STEEL_LEVELS.map(l=>l.name);
 geometry.userData.exteriorQuads=quads;
 geometry.userData.ssh40BroadBellRevision='B2-A2';
 geometry.userData.materialRegions=true;
 geometry.userData.pixelWorldSize=PIXEL_WORLD_SIZE;
 geometry.userData.materialAtlasPixels=64;
 geometry.userData.camoAtlasPixels=128;
 geometry.userData.camoUvLayout='planar-top/continuous-perimeter';
 return geometry;
}
