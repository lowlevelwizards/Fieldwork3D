/** H3: PASGT-density, three-sewn-panel fitted ACH/MICH textile.
 * Deliberately sparse rings hug the *actual* crown chamfer and the
 * separately authored brow/ear/nape contour. One mesh, static at creation.
 * Same 512×256 three-cut print atlas and 7 px/world-unit as PASGT.
 */
import * as THREE from 'three';
import {headwearCuboidVolumes,ACH_MICH_SHELLS,ACH_MICH_UPPER_INSET}
 from './operator-headwear-silhouettes.ts';
import {achMichProfile,achMichBindingHeight} from './operator-ach-mich-details.ts';
import {pasgtAtlasUv,PASGT_TOP_SEAM_OFFSETS,PASGT_FABRIC_PANELS,
 PASGT_UV_TEXELS_PER_UNIT} from './operator-pasgt-drape-geometry.ts';

// Exterior textile must clear the full unioned shell, not its inset liner.
// A controlled ~0.2 unit fabric thickness prevents flat shell faces from
// z-fighting through the drape without inflating accessory band spacing.
export const ACH_MICH_COVER_OFFSET=.205;
export const ACH_MICH_COVER_FOLDED_HEM=.18;
// Extend the upper left/right fabric over the un-beveled shell flank.
// Otherwise the long cloth diagonal crosses the hard crown just below
// its shorter bevel, leaving thin shell-colored flashes on both sides.
export const ACH_MICH_COVER_SIDE_CROWN_ALLOWANCE=.24;
export type AchMichCoverShell=typeof ACH_MICH_SHELLS[number];
type Side='front'|'right'|'rear'|'left';
type Ring='top'|'shoulder'|'hem';
type Sample={side:Side;x:number;z:number;bottom:number};
const clamp=(n:number)=>Math.min(1,Math.max(0,n));
type Style={
 shell:AchMichCoverShell;topY:number;topX:number;topFront:number;
 topRear:number;shoulderY:number;front:number;rear:number;
 sideX:number;hem:readonly (readonly [number,number,number])[];
 brow:number;nape:number;
};
function dimensions(shell:AchMichCoverShell):Style{
 const crown=headwearCuboidVolumes(shell)[0],p=achMichProfile(shell);
 const offset=ACH_MICH_COVER_OFFSET;
 return {
  shell,topY:crown.y+crown.height/2+offset,
  topX:crown.width/2-ACH_MICH_UPPER_INSET+offset+
   ACH_MICH_COVER_SIDE_CROWN_ALLOWANCE,
  topFront:-crown.depth/2+ACH_MICH_UPPER_INSET-offset,
  topRear:crown.depth/2-ACH_MICH_UPPER_INSET+offset,
  // Direct, broad diagonal from crown toward the outer front/rear planes.
  shoulderY: shell==='ach'?6.53:shell==='mich-2001'?6.77:6.79,
  front:p.front-offset,rear:p.rear+offset,
  sideX:p.side+offset,hem:p.hem,brow:p.brow,nape:p.nape
 };
}
const sideBottom=(style:Style,z:number):number=>{
 const list=style.hem;
 if(z<=list[0][2])return list[0][1];
 if(z>=list[list.length-1][2])return list[list.length-1][1];
 for(let i=1;i<list.length;i++)if(z<=list[i][2]){
  const a=list[i-1],b=list[i];
  const t=clamp((z-a[2])/(b[2]-a[2]));
  return a[1]+(b[1]-a[1])*t;
 }
 return list[list.length-1][1];
};
const sideExtent=(style:Style,z:number):number=>{
 const list=style.hem;
 if(z<=list[0][2])return list[0][0];
 if(z>=list[list.length-1][2])return list[list.length-1][0];
 for(let i=1;i<list.length;i++)if(z<=list[i][2]){
  const a=list[i-1],b=list[i];
  return a[0]+(b[0]-a[0])*clamp((z-a[2])/(b[2]-a[2]));
 }
 return style.sideX;
};
function samples(style:Style):readonly (readonly Sample[])[]{
 const xs=[-style.topX,PASGT_TOP_SEAM_OFFSETS[0],0,
  PASGT_TOP_SEAM_OFFSETS[1],style.topX];
 const front=xs.map(x=>({side:'front' as const,x,z:style.topFront,
  bottom:style.brow}));
 const anchors=[style.topFront,...style.hem.slice(1,-1).map(p=>p[2]),
  style.topRear].sort((a,b)=>a-b);
 const stations=[...new Set(anchors)];
 // Stitch the skirt ends to the front brow and rear nape exactly.
 // Interior stations keep the actual high/mid-cut side hem contour.
 const bottomAtJoin=(z:number)=>Math.abs(z-style.topFront)<1e-5?
  style.brow:Math.abs(z-style.topRear)<1e-5?
  style.nape:sideBottom(style,z);
 const right=stations.map(z=>({side:'right' as const,x:style.topX,z,
  bottom:bottomAtJoin(z)}));
 const rear=[...xs].reverse().map(x=>({side:'rear' as const,x,
  z:style.topRear,bottom:style.nape}));
 const left=[...stations].reverse().map(z=>({side:'left' as const,
  x:-style.topX,z,bottom:bottomAtJoin(z)}));
 return [front,right,rear,left];
}
/** Three contours: flat top, one broad diagonal shoulder, and hem.
 * No intermediate inward-facing ramp or painted-shell-revealing shelf.
 */
function ringPoint(style:Style,s:Sample,ring:Ring):readonly [number,number,number]{
 const front=s.side==='front',rear=s.side==='rear',side=!front&&!rear;
 const sign=s.side==='left'?-1:1;
 // The first and last side vertices must match the front/rear vertices.
 // MICH skirt stations sometimes protrude beyond the main side extent;
 // using those offsets at the corner left a visible open cover seam.
 const corner=side&&(Math.abs(s.z-style.topFront)<1e-5||
  Math.abs(s.z-style.topRear)<1e-5);
 const extent=side?(corner?style.sideX:
  sideExtent(style,s.z)+ACH_MICH_COVER_OFFSET):style.sideX;
 const x=ring==='top'?s.x:side?sign*extent:
  (s.x/style.topX)*style.sideX;
 const f=side?clamp((style.topFront+1.5-s.z)/1.5):1;
 const b=side?clamp((s.z-(style.topRear-1.5))/1.5):1;
 const z=ring==='top'?s.z:front?style.front:rear?style.rear:
  s.z+(style.front-style.topFront)*f+(style.rear-style.topRear)*b;
 const y=ring==='top'?style.topY:
  ring==='shoulder'?style.shoulderY:
  s.bottom+achMichBindingHeight(style.shell)+.035;
 return [x,y,z];
}
/** Three UV islands retain the exact PASGT fabric print texel pitch.
 * For skirts, UV travel measures 3D distance along the cloth, never
 * simply the change in vertical height. No 2× camo texture shrinkage.
 */
function fabricCoordinate(style:Style,s:Sample,ring:Ring):
 readonly [number,number]{
 const xyz=ringPoint(style,s,ring);
 if(ring==='top')return [xyz[0],xyz[2]];
 const rings:readonly Ring[]=['top','shoulder','hem'];
 let distance=0;
 for(let i=1;i<=rings.indexOf(ring);i++){
  const a=ringPoint(style,s,rings[i-1]),
   b=ringPoint(style,s,rings[i]);
  distance+=Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2]);
 }
 if(s.side==='front')return [s.x,style.topFront-distance];
 if(s.side==='rear')return [s.x,style.topRear+distance];
 if(s.side==='right')return [style.topX+distance,s.z];
 return [-style.topX-distance,s.z];
}
export function createAchMichDrapedGeometry(
 shell:AchMichCoverShell,hemOnly=false):THREE.BufferGeometry{
 const style=dimensions(shell),panels=samples(style);
 const positions:number[]=[],uvs:number[]=[];
 const add=(point:readonly number[],uv:readonly [number,number])=>{
  positions.push(...point);uvs.push(...uv);
 };
 const tri=(a:readonly number[],b:readonly number[],c:readonly number[],
  ua:readonly [number,number],ub:readonly [number,number],
  uc:readonly [number,number])=>{
  add(a,ua);add(b,ub);add(c,uc);
 };
 const quad=(a:readonly number[],b:readonly number[],c:readonly number[],
  d:readonly number[],ua:readonly [number,number],
  ub:readonly [number,number],uc:readonly [number,number],
  ud:readonly [number,number])=>{
  tri(a,b,c,ua,ub,uc);tri(a,c,d,ua,uc,ud);
 };
 const uv=(s:Sample,ring:Ring,panel:typeof PASGT_FABRIC_PANELS[number])=>
  pasgtAtlasUv(fabricCoordinate(style,s,ring),panel);
 if(!hemOnly){
  const bounds=[-style.topX,...PASGT_TOP_SEAM_OFFSETS,style.topX];
  for(let i=0;i<3;i++){
   const panel=PASGT_FABRIC_PANELS[i],x0=bounds[i],x1=bounds[i+1];
   const a:[number,number,number]=[x0,style.topY,style.topFront],
    b:[number,number,number]=[x1,style.topY,style.topFront],
    c:[number,number,number]=[x1,style.topY,style.topRear],
    d:[number,number,number]=[x0,style.topY,style.topRear];
   tri(a,c,b,pasgtAtlasUv([x0,style.topFront],panel),
    pasgtAtlasUv([x1,style.topRear],panel),
    pasgtAtlasUv([x1,style.topFront],panel));
   tri(a,d,c,pasgtAtlasUv([x0,style.topFront],panel),
    pasgtAtlasUv([x0,style.topRear],panel),
    pasgtAtlasUv([x1,style.topRear],panel));
  }
 }
 const pairs:readonly (readonly [Ring,Ring])[]=hemOnly?
  [['hem','hem']]:
  [['top','shoulder'],['shoulder','hem']];
 for(const [upper,lower] of pairs){
  for(const panelSamples of panels)
   for(let i=0;i<panelSamples.length-1;i++){
    const a=panelSamples[i],b=panelSamples[i+1];
    const panel=a.side==='left'?'left':a.side==='right'?'right':
     (a.x+b.x)/2<PASGT_TOP_SEAM_OFFSETS[0]?'left':
     (a.x+b.x)/2>PASGT_TOP_SEAM_OFFSETS[1]?'right':'top';
    if(hemOnly){
     const p0=ringPoint(style,a,'hem'),p1=ringPoint(style,b,'hem');
     const raised=(p:readonly number[]):readonly [number,number,number]=>
      [p[0],p[1]+ACH_MICH_COVER_FOLDED_HEM,p[2]];
     const outside=(p:readonly number[]):readonly [number,number,number]=>
      [p[0]+(a.side==='right'?.045:a.side==='left'?-.045:0),
       p[1],p[2]+(a.side==='front'?-.045:a.side==='rear'?.045:0)];
     const up0=outside(raised(p0)),up1=outside(raised(p1));
     const lo0=outside(p0),lo1=outside(p1);
     quad(up0,up1,lo1,lo0,uv(a,'hem',panel),
      uv(b,'hem',panel),uv(b,'hem',panel),uv(a,'hem',panel));
    }else{
     quad(ringPoint(style,a,upper),ringPoint(style,b,upper),
      ringPoint(style,b,lower),ringPoint(style,a,lower),
      uv(a,upper,panel),uv(b,upper,panel),
      uv(b,lower,panel),uv(a,lower,panel));
    }
   }
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
 // PASGT's seam atlas uses texture channel 1, not the default UV channel.
 g.setAttribute('uv1',new THREE.Float32BufferAttribute(uvs.slice(),2));
 g.computeVertexNormals();g.computeBoundingBox();
 g.userData.achMichDrapedFabric=true;
 g.userData.h66CoverShellClearance=ACH_MICH_COVER_OFFSET;
 g.userData.h71SideCrownAllowance=ACH_MICH_COVER_SIDE_CROWN_ALLOWANCE;
 g.userData.h71JoinedCoverCorners=true;
 g.userData.achMichShell=shell;
 g.userData.achMichHemOnly=hemOnly;
 g.userData.printPanels=[...PASGT_FABRIC_PANELS];
 g.userData.uvTexelsPerUnit=PASGT_UV_TEXELS_PER_UNIT;
 g.userData.minimumFoldHeight=ACH_MICH_COVER_FOLDED_HEM;
 g.userData.achMichDirectFrontRearDiagonal=true;
 return g;
}
