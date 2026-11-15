/** B1 M1: one deliberately faceted steel bowl and contour-derived textile.
 * Head-local coordinates: +Y up, -Z front, +X operator right.
 * This is a specialized M1 model, NOT a generic helmet generator.
 * All geometry is built once; nothing is sampled during gameplay frames.
 */
import * as THREE from 'three';
import {PIXEL_WORLD_SIZE} from './rendering/pixel-recipes.ts';

type Point=readonly [number,number,number];
type Level={name:string;y:number;side:number;front:number;rear:number;
 /** +Z rear; positive pitch makes the rear naturally lower. */
 pitch?:number;
 /** crown moves rearward relative to the extended brow and nose peak. */
 shift?:number;};
export type M1SurfaceMode='steel'|'fitted'|'loose';
/** Eight intentionally broad perimeter faces: four long flats and four
 * large corners. The previous 14-point outline made the M1 look faceted
 * rather than boldly stylized like the approved ACH/MICH family.
 * +Y is up, -Z is front; do not add intermediate corner wedges.
 */
export const M1_OUTLINE:readonly (readonly [number,number])[]=[
 [-.70,-1],[.70,-1],[1,-.70],[1,.70],
 [.70,1],[-.70,1],[-1,.70],[-1,-.70]
] as const;
/** Seven restrained profile levels. Reference the M1's high bowl,
 * longer front-to-back footprint, projecting front peak and slightly lower
 * rear skirt, not the shallow symmetrical pot from the previous iteration.
 * Eight perimeter points remain unchanged: still Fieldwork, not a smooth dome.
 */
export const M1_STEEL_LEVELS:readonly Level[]=[
 {name:'crown',y:10.10,side:4.45,front:4.98,rear:5.35,pitch:.14,shift:.38},
 {name:'single-shoulder',y:8.62,side:5.35,front:5.65,rear:6.12,pitch:.26,shift:.29},
 {name:'long-pot-wall',y:5.20,side:5.48,front:5.86,rear:6.20,pitch:.30,shift:.08},
 {name:'rolled-rim-top',y:4.82,side:6.05,front:6.93,rear:6.55,pitch:.32},
 {name:'rolled-rim-bottom',y:4.45,side:6.05,front:6.93,rear:6.55,pitch:.34},
 {name:'inward-return',y:4.55,side:5.42,front:6.24,rear:6.00,pitch:.32},
 {name:'recessed-liner-edge',y:4.98,side:5.12,front:5.83,rear:5.70,pitch:.28}
] as const;
export const M1_FIT_LANDMARKS=Object.freeze({
 roof:10.24,rimBottom:4.11,frontExtent:-6.93,rearExtent:6.55,
 sideExtent:6.05,
 chinstrapRight:[5.34,5.05,-.87] as const,
 chinstrapLeft:[-5.34,5.05,-.87] as const
});
const xyz=(level:Level,index:number):Point=>{
 const [fx,fz]=M1_OUTLINE[(index+M1_OUTLINE.length)%M1_OUTLINE.length];
 return [fx*level.side,level.y-(level.pitch??0)*fz,
  fz*(fz<0?level.front:level.rear)+(level.shift??0)];
};
export const m1SurfacePoint=(mode:M1SurfaceMode,ring:number,index:number):Point=>
 xyz(m1Levels(mode)[ring],index);
/** The cloth drape is built from the same tilted, rearward-offset contours.
 * Its hem stays well above the M1 rolled edge, particularly at the rear.
 */
const cloth=(mode:'fitted'|'loose'):readonly Level[]=>{
 const slack=mode==='loose'?1:0;
 return [
  {name:'cloth-crown',y:10.24+slack*.12,side:4.61+slack*.11,
   front:5.16+slack*.13,rear:5.51+slack*.12,pitch:.14,shift:.38},
  {name:'cloth-shoulder',y:8.74+slack*.09,side:5.55+slack*.16,
   front:5.85+slack*.16,rear:6.32+slack*.16,pitch:.26,shift:.29},
  {name:'cloth-pot-wall',y:5.47-slack*.08,side:5.68+slack*.18,
   front:6.07+slack*.19,rear:6.40+slack*.18,pitch:.30,shift:.08},
  {name:'cloth-hem',y:5.19-slack*.12,side:5.71+slack*.20,
   front:6.11+slack*.20,rear:6.44+slack*.19,pitch:.31},
  {name:'cloth-return',y:5.25-slack*.10,side:5.51+slack*.15,
   front:5.91+slack*.15,rear:6.22+slack*.15,pitch:.29}
 ];
};
export function m1Levels(mode:M1SurfaceMode):readonly Level[]{
 return mode==='steel'?M1_STEEL_LEVELS:cloth(mode);
}
/** One indexed, bold-faceted model with UV, print UV, atlas regions, AO
 * vertex colors and correct normal orientation. Open underside, no faux cap.
 */
export function createM1ProfileGeometry(mode:M1SurfaceMode):THREE.BufferGeometry{
 const levels=m1Levels(mode),positions:number[]=[],uv:number[]=[],
  uv1:number[]=[],colors:number[]=[],indices:number[]=[];
 let quads=0;
 const add=(p:Point,region:0|1|2|3,tone:number,axis:0|1|2)=>{
  positions.push(...p);
  const pu=axis===0?p[2]:p[0],pv=axis===1?p[2]:p[1];
  uv.push(((region%2)*32+16+pu/PIXEL_WORLD_SIZE)/64,
   (Math.floor(region/2)*32+16+pv/PIXEL_WORLD_SIZE)/64);
  // The same print-atlas contract used by the other authored headwear.
  const half=5.5,safe=(n:number)=>Math.max(.005,Math.min(31.995,n));
  const per=axis===2?(p[2]<0?half+p[0]:5*half-p[0]):
   axis===0?(p[0]>0?3*half+p[2]:7*half-p[2]):16+p[0];
  const cu=axis===1?16+p[0]:per*32/(8*half),cv=axis===1?16+p[2]:16+p[1];
  uv1.push(((region%2)*64+2*safe(cu))/128,
   (Math.floor(region/2)*64+2*safe(cv))/128);
  colors.push(tone,tone,tone);
 };
 const face=(pts:readonly Point[],out:Point,region:0|1|2|3,tone:number)=>{
  if(pts.length!==3&&pts.length!==4)throw Error('M1 face size');
  const [a,b,c]=pts,va=new THREE.Vector3(...a),
   vb=new THREE.Vector3(...b),vc=new THREE.Vector3(...c);
  const n=vb.sub(va).cross(vc.sub(va));
  const ordered=n.dot(new THREE.Vector3(...out))>=0?
   pts:[pts[0],...pts.slice(1).reverse()];
  // Material-region mapping chooses dominant planar axis per face.
  const abs=[Math.abs(n.x),Math.abs(n.y),Math.abs(n.z)];
  const axis=abs.indexOf(Math.max(...abs)) as 0|1|2;
  const offset=positions.length/3;
  for(const p of ordered)add(p,region,tone,axis);
  if(pts.length===4)indices.push(offset,offset+1,offset+2,
   offset,offset+2,offset+3);
  else indices.push(offset,offset+1,offset+2);
  quads+=pts.length===4?1:0;
 };
 // Flat roof is a triangulated single planar face, not a floating box cap.
 const n=M1_OUTLINE.length,roof=levels[0],center:[number,number,number]=[
  0,roof.y,roof.shift??0];
 for(let i=0;i<n;i++)
  face([center,xyz(roof,i),xyz(roof,(i+1)%n)],[0,1,0],3,1);
 for(let j=0;j<levels.length-1;j++){
  const top=levels[j],bottom=levels[j+1];
  const covered=mode!=='steel';
  const region:0|1|2|3=covered?j>=levels.length-2?1:0:
   j===2||j===3?2:j>=4?1:0;
  const tone=covered?j===0?.99:j>=levels.length-2?.91:.96:
   j===3?.81:j===4?.67:j===5?.53:j===2?.91:j===1?.94:.975;
  for(let i=0;i<n;i++){
   const k=(i+1)%n,a=xyz(top,i),b=xyz(top,k),
    c=xyz(bottom,k),d=xyz(bottom,i);
   const midpoint:[number,number,number]=[
    (a[0]+b[0]+c[0]+d[0])/4,0,
    (a[2]+b[2]+c[2]+d[2])/4];
   const facing:Point=j>=levels.length-2?
    [0,-1,0]:[midpoint[0],j===0?.5:0,midpoint[2]];
   face([a,b,c,d],facing,region,tone);
  }
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 g.setAttribute('uv1',new THREE.Float32BufferAttribute(uv1,2));
 g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 g.setIndex(indices);g.computeVertexNormals();g.computeBoundingBox();
 g.userData.m1FacetedSurface=true;
 g.userData.m1BoldSilhouetteRevision=3;
 g.userData.m1ProfileHistoricSweep=true;
 g.userData.m1OutlineSegments=M1_OUTLINE.length;
 g.userData.m1ProfileMode=mode;
 g.userData.m1ProfileStations=levels.map(x=>x.name);
 g.userData.exteriorQuads=quads;
 g.userData.materialRegions=true;
 g.userData.pixelWorldSize=PIXEL_WORLD_SIZE;
 g.userData.materialAtlasPixels=64;
 g.userData.camoAtlasPixels=128;
 g.userData.camoUvLayout='planar-top/continuous-perimeter';
 return g;
}
/** Anchored perimeter for band/net/retention, sharing the same true contour. */
export function m1PerimeterAt(y:number,mode:M1SurfaceMode):readonly Point[]{
 const levels=m1Levels(mode);
 // Interpolate the real pitched contour points, NOT a new flat Y ring.
 // This keeps band/net anchors on the swept rear shell and taller front lip.
 // The last one/two return stations go back upward into the helmet;
 // sample only the *outer* wall when placing bands, scrim and net borders.
 const exteriorLast=3;
 let lower=levels.slice(1,exteriorLast+1).findIndex(x=>x.y<=y)+1;
 if(lower<=0)lower=exteriorLast;
 const upper=levels[lower-1],below=levels[lower];
 const t=upper.y===below.y?0:
  Math.max(0,Math.min(1,(upper.y-y)/(upper.y-below.y)));
 return M1_OUTLINE.map((_,i)=>{
  const a=xyz(upper,i),b=xyz(below,i);
  return [a[0]+(b[0]-a[0])*t,
   a[1]+(b[1]-a[1])*t,
   a[2]+(b[2]-a[2])*t] as const;
 });
}
