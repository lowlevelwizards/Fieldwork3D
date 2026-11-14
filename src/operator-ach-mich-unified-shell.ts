/** H24: per-station mirrored lateral ear mass and continuous low-poly hems.
 * The same six silhouette stations used by H17 emphasize the distinct
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
  [5.075,4.40,-1.12],
  [5.355,2.04,-0.12],
  [5.355,2.04,2.35],
  [5.125,1.85,3.88],
  [5.075,1.85,5.60]
 ],
 'mich-2002':[
  [5.03,4.55,-5.70],
  [5.03,4.55,-0.78],
  [5.28,3.06,0.10],
  [5.28,3.06,2.52],
  [5.08,1.90,4.08],
  [5.03,1.90,5.75]
 ],
 // H20: MICH TC-2001 is a full ear cutout, not the TC-2002 partial cut.
 // Raise ONLY the ear arch while seating the rear lower on the head.
 // H23 shifts the *onset* of the ear opening behind the temple (near
 // Z0, beside the symbolic ear), while retaining the iconic Y5.30 arch.
 // The rear drops independently to a Y2.25 nape below the head-ear top.
 // Proportions are stylized; not millimeter conversions. Six stations.
 'mich-2001':[
  [5.015,4.55,-5.71],
  [5.015,4.55,-0.80],
  [5.015,5.30,0.10],
  [5.015,5.30,2.52],
  [5.015,2.05,4.08],
  [5.015,2.05,5.66]
 ]
};
/** Broad full/mid ear-panel widths, front-to-back (not a peak ridge).
 * The upper half is flat; high-cut has no lateral ear projection.
 * All cuts retain the six original YZ hem stations.
 */
export const UNIFIED_HELMET_EAR_SHOULDERS:Readonly<
 Record<UnifiedCut,readonly number[]>>={
 ach:[5.075,5.075,5.67,5.67,5.19,5.075],
 'mich-2002':[5.03,5.03,5.56,5.56,5.15,5.03],
 'mich-2001':[5.015,5.015,5.015,5.015,5.015,5.015]
};
export const ACH_MICH_EAR_SHOULDER_FRACTION=.52;
// Two edges of ONE broad protective face: short outward bevel, long wall,
// compact inward return. Fractions are measured toward the hem at each station.
export const ACH_MICH_EAR_FACE_TOP_FRACTION=.66;
export const ACH_MICH_EAR_FACE_BOTTOM_FRACTION=.90;
/** Ear-side planes are referenced to the central ear, NOT individually
 * stretched over each hem height. The old station-relative calculation
 * lifted the leading brow/ear junction into a pointed upward spike.
 * Local clamps keep front edges inside the actual brow/nape perimeter.
 */
export function unifiedHelmetEarVerticalProfile(
 cut:UnifiedCut,shoulderY:number,hemY:number){
 const earHem=UNIFIED_HELMET_HEMS[cut][2][1];
 const nominalTop=shoulderY+(earHem-shoulderY)*ACH_MICH_EAR_FACE_TOP_FRACTION;
 const nominalBottom=shoulderY+(earHem-shoulderY)*ACH_MICH_EAR_FACE_BOTTOM_FRACTION;
 const faceBottomY=Math.max(hemY+.08,nominalBottom);
 const faceTopY=Math.max(hemY+.24,nominalTop,faceBottomY+.16);
 const onsetY=Math.max(
  shoulderY+(hemY-shoulderY)*ACH_MICH_EAR_SHOULDER_FRACTION,
  faceTopY+.28
 );
 return {onsetY,faceTopY,faceBottomY};
}

/** Linear front-back sampling shared by shell and fitted cover. */
export function unifiedHelmetEarShoulderWidth(cut:UnifiedCut,z:number):number{
 const hem=UNIFIED_HELMET_HEMS[cut],width=UNIFIED_HELMET_EAR_SHOULDERS[cut];
 if(z<=hem[0][2])return width[0];
 for(let i=1;i<hem.length;i++)if(z<=hem[i][2]){
  const t=(z-hem[i-1][2])/(hem[i][2]-hem[i-1][2]);
  return width[i-1]+(width[i]-width[i-1])*t;
 }
 return width.at(-1)!;
}
type V=readonly [number,number,number];
const v=(x:number,y:number,z:number):V=>[x,y,z];
/** Closed, simple outer bowl with a narrow underside edge. */
export function createUnifiedHelmetShellGeometry(cut:UnifiedCut,roofY:number,
 topInset:number,bevelHeight:number):THREE.BufferGeometry{
 const hem=UNIFIED_HELMET_HEMS[cut],s=hem[0][0],
  front=hem[0][2],rear=hem.at(-1)![2];
 const shoulderY=roofY-bevelHeight,inner=s-.48,topX=s-topInset;
 const earWidths=UNIFIED_HELMET_EAR_SHOULDERS[cut];
 const topF=front+topInset,topR=rear-topInset;
 // A small rear rake: the low nape reaches farther back than the upper
 // shoulder, avoiding a vertical slab end without adding contour stations.
 const shoulderRear=rear-.20;
 const upperZ=(z:number)=>z===rear?shoulderRear:z;
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
 // The unchanged 6 stations carry both YZ cut and variable X half-width.
 // Mirror X for both sides. No supplemental side cubes, physics or draw calls.
 // The existing roof height and single chunky top chamfer are preserved.
 quad(v(-topX,roofY,topF),v(-topX,roofY,topR),
  v(topX,roofY,topR),v(topX,roofY,topF),v(0,1,0),1,3,1);
 for(const sign of [-1,1] as const){
  const x=sign*s,tx=sign*topX;
  quad(v(tx,roofY,topF),v(tx,roofY,topR),
   v(x,shoulderY,shoulderRear),v(x,shoulderY,front),v(sign,1,0),0,0,.97);
  for(let i=1;i<hem.length;i++){
   const a=hem[i-1],b=hem[i];
   // Keep the entire upper half at the original side width, then
   // expand only below this onset. No chamfer-to-ear triangular panel.
   const onset=(point:ShellPoint):V=>[
    sign*s,
    unifiedHelmetEarVerticalProfile(cut,shoulderY,point[1]).onsetY,
    point[2]
   ];
   const onsetA=onset(a),onsetB=onset(b);
   quad(v(x,shoulderY,upperZ(a[2])),v(x,shoulderY,upperZ(b[2])),
    onsetB,onsetA,v(sign,0,0),0,1,.96);
   if(cut!=='mich-2001'){
    // Two equal-width contour rings form a substantial, near-vertical
    // protective face. The only outward transition is a short bevel;
    // the hem return tucks UNDER it rather than forming a pointed ridge.
    const face=(point:ShellPoint,index:number,edge:'top'|'bottom'):V=>{
     const profile=unifiedHelmetEarVerticalProfile(cut,shoulderY,point[1]);
     return [
      sign*earWidths[index],
      edge==='top'?profile.faceTopY:profile.faceBottomY,
      point[2]
     ];
    };
    const topA=face(a,i-1,'top'),topB=face(b,i,'top');
    const bottomA=face(a,i-1,'bottom'),bottomB=face(b,i,'bottom');
    quad(onsetA,onsetB,topB,topA,v(sign,0,0),0,1,.96);
    quad(topA,topB,bottomB,bottomA,v(sign,0,0),0,1,.94);
    quad(bottomA,bottomB,v(sign*b[0],b[1],b[2]),
     v(sign*a[0],a[1],a[2]),v(sign,0,0),0,1,.92);
   }else{
    // High cut: no lateral ear mass, while the ear arch and nape remain.
    quad(onsetA,onsetB,v(sign*b[0],b[1],b[2]),
     v(sign*a[0],a[1],a[2]),v(sign,0,0),0,1,.95);
   }
   // A narrow underside fold is part of the SAME shell, not a second rim.
   quad(v(sign*a[0],a[1],a[2]),v(sign*b[0],b[1],b[2]),
    v(sign*(b[0]-.48),b[1],b[2]),
    v(sign*(a[0]-.48),a[1],a[2]),
    v(0,-1,0),1,1,.87);
  }
 }
 quad(v(-topX,roofY,topF),v(topX,roofY,topF),
  v(s,shoulderY,front),v(-s,shoulderY,front),
  v(0,0,-1),2,0,.96);
 quad(v(-topX,roofY,topR),v(topX,roofY,topR),
  v(s,shoulderY,shoulderRear),v(-s,shoulderY,shoulderRear),
  v(0,0,1),2,0,.96);
 quad(v(-s,shoulderY,front),v(s,shoulderY,front),
  v(s,hem[0][1],front),v(-s,hem[0][1],front),
  v(0,0,-1),2,2,.92);
 quad(v(-s,shoulderY,shoulderRear),v(s,shoulderY,shoulderRear),
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
 g.userData.h25MidwallEarShoulder=true;
 g.userData.h26LowerEarOnset=true;
 g.userData.h27BroadEarFace=cut!=='mich-2001';
 g.userData.h27BrowSpikeClamp=true;
 g.userData.h26HighCutNoLateralBulge=cut==='mich-2001';
 g.userData.h25EarShoulderFraction=ACH_MICH_EAR_SHOULDER_FRACTION;
 g.userData.h27EarFaceTopFraction=ACH_MICH_EAR_FACE_TOP_FRACTION;
 g.userData.h27EarFaceBottomFraction=ACH_MICH_EAR_FACE_BOTTOM_FRACTION;
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
