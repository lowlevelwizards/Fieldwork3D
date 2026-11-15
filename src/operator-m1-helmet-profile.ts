/** B1 M1: one deliberately faceted steel bowl and contour-derived textile.
 * Head-local coordinates: +Y up, -Z front, +X operator right.
 * This is a specialized M1 model, NOT a generic helmet generator.
 * All geometry is built once; nothing is sampled during gameplay frames.
 */
import * as THREE from 'three';
import {PIXEL_WORLD_SIZE} from './rendering/pixel-recipes.ts';

type Point=readonly [number,number,number];
type Level={name:string;y:number;side:number;front:number;rear:number};
export type M1SurfaceMode='steel'|'fitted'|'loose';
/** Clockwise around the bowl when viewed from above (front at -Z).
 * Deliberately broad cheek and corner facets, no subdivision/rounding.
 */
export const M1_OUTLINE:readonly (readonly [number,number])[]=[
 [0,-1],[.61,-.97],[.94,-.73],[1,-.23],[1,.38],
 [.84,.79],[.47,.99],[0,1.03],[-.47,.99],[-.84,.79],
 [-1,.38],[-1,-.23],[-.94,-.73],[-.61,-.97]
] as const;
/** Outside steel stages: one smaller roof, broad sloping shoulders,
 * continuous bowl wall, and one thin rolled perimeter. No box-stacks.
 */
export const M1_STEEL_LEVELS:readonly Level[]=[
 {name:'crown',y:8.74,side:3.77,front:3.80,rear:3.82},
 {name:'upper-shoulder',y:7.90,side:4.43,front:4.49,rear:4.45},
 {name:'lower-shoulder',y:6.75,side:5.03,front:5.16,rear:5.04},
 {name:'bowl-wall',y:5.00,side:5.16,front:5.27,rear:5.21},
 {name:'rolled-rim-top',y:4.72,side:5.55,front:5.79,rear:5.53},
 {name:'rolled-rim-bottom',y:4.53,side:5.55,front:5.79,rear:5.53},
 {name:'inward-edge',y:4.56,side:5.35,front:5.59,rear:5.33},
 {name:'underside',y:4.76,side:5.08,front:5.18,rear:5.10}
] as const;
export const M1_FIT_LANDMARKS=Object.freeze({
 roof:8.74,rimBottom:4.53,frontExtent:-5.79,rearExtent:5.69,
 sideExtent:5.55,
 chinstrapRight:[5.08,4.96,-.87] as const,
 chinstrapLeft:[-5.08,4.96,-.87] as const
});
const xyz=(level:Level,index:number):Point=>{
 const [fx,fz]=M1_OUTLINE[(index+M1_OUTLINE.length)%M1_OUTLINE.length];
 return [fx*level.side,level.y,
  fz*(fz<0?level.front:level.rear)];
};
export const m1SurfacePoint=(mode:M1SurfaceMode,ring:number,index:number):Point=>
 xyz(m1Levels(mode)[ring],index);
const cloth=(mode:'fitted'|'loose'):readonly Level[]=>{
 const slack=mode==='loose'?1:0;
 return [
  {name:'cloth-crown',y:8.88+slack*.13,side:3.94+slack*.12,
   front:3.98+slack*.12,rear:4.00+slack*.12},
  {name:'cloth-upper',y:8.00+slack*.09,side:4.63+slack*.16,
   front:4.69+slack*.17,rear:4.64+slack*.16},
  {name:'cloth-shoulder',y:6.79+slack*.07,side:5.23+slack*.18,
   front:5.38+slack*.18,rear:5.26+slack*.17},
  {name:'cloth-lower',y:5.21+slack*(-.08),side:5.34+slack*.19,
   front:5.48+slack*.18,rear:5.38+slack*.17},
  {name:'cloth-hem',y:5.03+slack*(-.13),side:5.34+slack*.21,
   front:5.49+slack*.20,rear:5.38+slack*.20},
  {name:'cloth-return',y:5.07+slack*(-.11),side:5.22+slack*.16,
   front:5.36+slack*.15,rear:5.25+slack*.15}
 ];
};
export function m1Levels(mode:M1SurfaceMode):readonly Level[]{
 return mode==='steel'?M1_STEEL_LEVELS:cloth(mode);
}
/** One indexed, flat-faceted model with UV, print UV, atlas regions, AO
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
 const n=M1_OUTLINE.length,roof=levels[0],center:[number,number,number]=[0,roof.y,0];
 for(let i=0;i<n;i++)
  face([center,xyz(roof,i),xyz(roof,(i+1)%n)],[0,1,0],3,1);
 for(let j=0;j<levels.length-1;j++){
  const top=levels[j],bottom=levels[j+1];
  const covered=mode!=='steel';
  const region:0|1|2|3=covered?j>=levels.length-2?1:0:
   j===3||j===4?2:j>=5?1:j===2?1:0;
  const tone=covered?j===0?.99:j>=levels.length-2?.91:.96:
   j===4?.83:j>=5?.78:j===3?.91:j===2?.94:.975;
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
 const low=Math.max(0,levels.findIndex(x=>x.y<=y));
 const high=low<=0?1:low;
 const upper=levels[high-1],lower=levels[high];
 const t=upper.y===lower.y?0:
  Math.max(0,Math.min(1,(upper.y-y)/(upper.y-lower.y)));
 const station:Level={name:'sample',y,
  side:upper.side+(lower.side-upper.side)*t,
  front:upper.front+(lower.front-upper.front)*t,
  rear:upper.rear+(lower.rear-upper.rear)*t};
 return M1_OUTLINE.map((_,i)=>xyz(station,i));
}
