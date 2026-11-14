/** H21: one continuous, anatomically segmented ear/nape shell per side.
 * The same six silhouette stations used by H17 now emphasize the distinct
 * ear lobe (full vs mid) and slope into the nape without adding polygons.
 * One faceted roof, two planar sides, one brow/nape; one draw call.
 */
import * as THREE from 'three';
import {PIXEL_WORLD_SIZE} from './rendering/pixel-recipes.ts';
export type UnifiedCut='ach'|'mich-2002'|'mich-2001';
export type ShellPoint=readonly [number,number,number]; // x, y, z
export const UNIFIED_HELMET_HEMS:Readonly<Record<UnifiedCut,readonly ShellPoint[]>>={
 ach:[
  [5.075,4.40,-5.535],
  [5.075,4.40,-3.12],
  [5.075,2.04,-2.42],
  [5.075,2.04,1.45],
  [5.075,2.72,3.00],
  [5.075,2.72,5.60]
 ],
 'mich-2002':[
  [5.03,4.55,-5.70],
  [5.03,4.55,-3.10],
  [5.03,3.06,-2.18],
  [5.03,3.06,1.38],
  [5.03,2.92,2.85],
  [5.03,2.92,5.75]
 ],
 // H20: MICH TC-2001 is a full ear cutout, not the TC-2002 partial cut.
 // Raise ONLY the ear arch while seating the rear lower on the head.
 // H21 leaves the ear arch at Y5.30, dropping just the rear protection.
 // Relative proportions are stylized; NOT millimeter conversions. Six
 // stations, no new faces or per-frame work.
 'mich-2001':[
  [5.015,4.55,-5.71],
  [5.015,4.55,-3.45],
  [5.015,5.30,-2.15],
  [5.015,5.30,1.75],
  [5.015,3.12,3.05],
  [5.015,3.12,5.66]
 ]
};
type V=readonly [number,number,number];
const v=(x:number,y:number,z:number):V=>[x,y,z];
/** Closed, simple outer bowl with a narrow underside edge. */
export function createUnifiedHelmetShellGeometry(cut:UnifiedCut,roofY:number,
 topInset:number,bevelHeight:number):THREE.BufferGeometry{
 const hem=UNIFIED_HELMET_HEMS[cut],s=hem[0][0],
  front=hem[0][2],rear=hem.at(-1)![2];
 const shoulderY=roofY-bevelHeight,inner=s-.48,topX=s-topInset;
 const topF=front+topInset,topR=rear-topInset;
 const positions:number[]=[],uv:number[]=[],uv1:number[]=[],colors:number[]=[];
 let quads=0;
 const add=(p:V,axis:0|1|2,region:0|1|2|3,tone:number)=>{
  positions.push(...p);
  const pu=axis===0?p[2]:p[0],pv=axis===1?p[2]:p[1];
  uv.push(((region%2)*32+16+pu/PIXEL_WORLD_SIZE)/64,
   (Math.floor(region/2)*32+16+pv/PIXEL_WORLD_SIZE)/64);
  // Same static 128x128 print atlas contract as the other shell geometry.
  const half=5.5;
  const per=axis===2?(p[2]<0?half+p[0]:5*half-p[0]):
   axis===0?(p[0]>0?3*half+p[2]:7*half-p[2]):16+p[0];
  const cu=axis===1?16+p[0]:per*32/(8*half),cv=axis===1?16+p[2]:16+p[1];
  const safe=(n:number)=>Math.max(.005,Math.min(31.995,n));
  uv1.push(((region%2)*64+2*safe(cu))/128,
   (Math.floor(region/2)*64+2*safe(cv))/128);
  colors.push(tone,tone,tone);
 };
 const quad=(a:V,b:V,c:V,d:V,out:V,
  axis:0|1|2,region:0|1|2|3,tone:number)=>{
  // Orient every face consistently; no double-sided or coplanar overlays.
  const ab=new THREE.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]),
   ac=new THREE.Vector3(c[0]-a[0],c[1]-a[1],c[2]-a[2]);
  const normal=ab.cross(ac);
  const points=normal.dot(new THREE.Vector3(...out))>=0?
   [a,b,c,d]:[a,d,c,b];
  for(const i of [0,1,2,0,2,3])add(points[i],axis,region,tone);
  quads++;
 };
 // The existing roof height and single chunky top chamfer are preserved.
 quad(v(-topX,roofY,topF),v(-topX,roofY,topR),
  v(topX,roofY,topR),v(topX,roofY,topF),v(0,1,0),1,3,1);
 for(const sign of [-1,1] as const){
  const x=sign*s,tx=sign*topX;
  quad(v(tx,roofY,topF),v(tx,roofY,topR),
   v(x,shoulderY,rear),v(x,shoulderY,front),v(sign,1,0),0,0,.97);
  for(let i=1;i<hem.length;i++){
   const a=hem[i-1],b=hem[i];
   quad(v(x,shoulderY,a[2]),v(x,shoulderY,b[2]),
    v(x,b[1],b[2]),v(x,a[1],a[2]),v(sign,0,0),0,1,
    cut==='ach'?.90:.91);
   // A narrow underside fold is part of the SAME shell, not a second rim.
   quad(v(x,a[1],a[2]),v(x,b[1],b[2]),
    v(sign*inner,b[1],b[2]),v(sign*inner,a[1],a[2]),
    v(0,-1,0),1,1,.87);
  }
 }
 quad(v(-topX,roofY,topF),v(topX,roofY,topF),
  v(s,shoulderY,front),v(-s,shoulderY,front),
  v(0,0,-1),2,0,.96);
 quad(v(-topX,roofY,topR),v(topX,roofY,topR),
  v(s,shoulderY,rear),v(-s,shoulderY,rear),
  v(0,0,1),2,0,.96);
 quad(v(-s,shoulderY,front),v(s,shoulderY,front),
  v(s,hem[0][1],front),v(-s,hem[0][1],front),
  v(0,0,-1),2,2,.92);
 quad(v(-s,shoulderY,rear),v(s,shoulderY,rear),
  v(s,hem.at(-1)![1],rear),v(-s,hem.at(-1)![1],rear),
  v(0,0,1),2,1,.90);
 for(const [z,y,dir] of [[front,hem[0][1],-1],[rear,hem.at(-1)![1],1]]){
  quad(v(-s,y,z),v(s,y,z),v(inner,y,z-dir*.48),
   v(-inner,y,z-dir*.48),v(0,-1,0),1,1,.87);
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 g.setAttribute('uv1',new THREE.Float32BufferAttribute(uv1,2));
 g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 g.setIndex(Array.from({length:positions.length/3},(_,i)=>i));
 g.computeVertexNormals();g.computeBoundingBox();
 g.userData.h17UnifiedContour=true;
 g.userData.exteriorQuads=quads;
 g.userData.camoUvLayout='planar-top/continuous-perimeter';
 g.userData.achMichCrownInset=topInset;
 g.userData.achMichBevelHeight=bevelHeight;
 g.userData.materialRegions=true;
 g.userData.pixelWorldSize=PIXEL_WORLD_SIZE;
 g.userData.materialAtlasPixels=64;
 g.userData.camoAtlasPixels=128;
 return g;
}
