/** PASGT P5-A: shell-relative, sparse planar cloth fitted over the unchanged
 * approved cuboid helmet. The fabric uses a deliberately small set of broad
 * geometric transitions; no subdivision, smoothing, or cloth simulation.
 */
import * as THREE from 'three';
import {headwearCuboidVolumes} from './operator-headwear-silhouettes.ts';

export const PASGT_ATLAS_WIDTH=256;
export const PASGT_ATLAS_HEIGHT=256;
export const PASGT_CAMO_SCALE=1; // shared metric fabric prints, no additional PASGT scaling
export const PASGT_TOP_SEAM_OFFSETS=[-2.6,2.6] as const;
const shell=headwearCuboidVolumes('pasgt');
const box=(name:string)=>{
 const p=shell.find(c=>c.name===name);
 if(!p)throw Error('Missing PASGT source volume '+name);
 return p;
};
const crown=box('pasgt-single-protective-crown');
const peak=box('pasgt-integrated-front-peak');
const rear=box('pasgt-low-rear-skirt');
const ear=box('pasgt-right-ear-lobe');
export const PASGT_COVER_TOP_Y=crown.y+crown.height/2+.14;
const X=crown.width/2+.12;
const FRONT=-crown.depth/2-.13;
const REAR=crown.depth/2+.13;
const PEAK_FRONT=peak.z-peak.depth/2-.11;
const NAPE_REAR=rear.z+rear.depth/2+.12;
const SIDE=ear.x+ear.width/2+.13;
const FRONT_BOTTOM=peak.y-peak.height/2+.23;
const REAR_BOTTOM=rear.y-rear.height/2+.24;
const SIDE_BOTTOM=ear.y-ear.height/2+.24;
type Side='front'|'right'|'rear'|'left';
export type PasgtRingSample={
 side:Side;x:number;z:number;bottomY:number;distance:number;
};
export type PasgtSlitAnchor={
 id:string;position:readonly [number,number,number];
 yaw:number;pitch:number;
};
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
/** The deep ear protection begins at approximately z=-1.45. Compress the
 * transition into three large segments around that actual source boundary,
 * instead of the previous long triangular cutout across the whole temple.
 */
function sideHem(z:number):number{
 if(z<=-1.65)return FRONT_BOTTOM;
 if(z>=-.84)return SIDE_BOTTOM;
 const t=clamp((z+1.65)/.81);
 return FRONT_BOTTOM+(SIDE_BOTTOM-FRONT_BOTTOM)*t;
}
const frontXs=[-X,-2.65,0,2.65,X];
const sideZs=[FRONT,-3.4,-1.7,-1.45,-1.20,-.96,-.78,.50,2.70,4.3,REAR];
const panels:readonly (readonly Omit<PasgtRingSample,'distance'>[])[]=[
 frontXs.map(x=>({side:'front' as const,x,z:FRONT,bottomY:FRONT_BOTTOM})),
 sideZs.map(z=>({side:'right' as const,x:X,z,bottomY:sideHem(z)})),
 [...frontXs].reverse().map(x=>({side:'rear' as const,x,z:REAR,bottomY:REAR_BOTTOM})),
 [...sideZs].reverse().map(z=>({side:'left' as const,x:-X,z,bottomY:sideHem(z)}))
];
let length=0;
export const PASGT_RING_SAMPLES:readonly PasgtRingSample[]=panels.flatMap((panel,k)=>
 panel.map((p,i)=>{
  if(k||i){
   const preceding=i?panel[i-1]:panels[k-1].at(-1)!;
   length+=Math.hypot(p.x-preceding.x,p.z-preceding.z);
  }
  return {...p,distance:length};
 }));
export const PASGT_RING_CIRCUMFERENCE=length;
export type PasgtRing='top'|'shoulder'|'ramp'|'hem';
/** All four panel corners agree exactly in 3D. The side face expands
 * towards the brow/nape only near its endpoints, so no corner cracks.
 */
function sideZ(sample:PasgtRingSample,ring:PasgtRing):number{
 if(ring==='top')return sample.z;
 const frontWeight=clamp((-3.4-sample.z)/(-3.4-FRONT));
 const rearWeight=clamp((sample.z-4.3)/(REAR-4.3));
 const f=(ring==='shoulder'?.035:1);
 return sample.z+
  (PEAK_FRONT-FRONT)*frontWeight*f+
  (NAPE_REAR-REAR)*rearWeight*f;
}
export function pasgtRingPoint(sample:PasgtRingSample,ring:PasgtRing):
 readonly [number,number,number]{
 const face=sample.side==='front',back=sample.side==='rear';
 const isSide=!face&&!back;
 const sx=sample.x<0?-1:1;
 const extent=ring==='top'?X:ring==='shoulder'?X+.035:SIDE;
 const x=isSide?sx*extent:sample.x/X*extent;
 const z=face?ring==='top'?FRONT:ring==='shoulder'?FRONT-.035:PEAK_FRONT:
  back?ring==='top'?REAR:ring==='shoulder'?REAR+.035:NAPE_REAR:
  sideZ(sample,ring);
 const y=ring==='top'?PASGT_COVER_TOP_Y:
  ring==='shoulder'?6.81:ring==='ramp'?6.01:sample.bottomY;
 return [x,y,z];
}
/** Unfold the physical cloth surface around its top edge. This provides a
 * common planar coordinate across crown and adjoining side panels; the
 * vertical fabric scale uses actual 3D geodesic distance, not local hem Y.
 */
export function pasgtFabricCoordinate(sample:PasgtRingSample,ring:PasgtRing):
 readonly [number,number]{
 const point=pasgtRingPoint(sample,ring);
 if(ring==='top')return [point[0],point[2]];
 const order:readonly PasgtRing[]=['top','shoulder','ramp','hem'];
 let travel=0;
 for(let k=1;k<=order.indexOf(ring);k++){
  const a=pasgtRingPoint(sample,order[k-1]);
  const b=pasgtRingPoint(sample,order[k]);
  travel+=Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2]);
 }
 switch(sample.side){
  case 'front':return [sample.x,FRONT-travel];
  case 'rear':return [sample.x,REAR+travel];
  case 'right':return [X+travel,sample.z];
  case 'left':return [-X-travel,sample.z];
 }
}
/** P5-B atlas will share these actual-unfolded coordinates. There is one
 * cloth texel density across top, brow bridge and lower protective skirt.
 */
export const PASGT_UV_TEXELS_PER_UNIT=7;
export const pasgtAtlasUv=(coord:readonly [number,number]):
 readonly [number,number]=>[
 (128+PASGT_UV_TEXELS_PER_UNIT*coord[0]+.5)/PASGT_ATLAS_WIDTH,
 (128+PASGT_UV_TEXELS_PER_UNIT*coord[1]+.5)/PASGT_ATLAS_HEIGHT
];
export function createPasgtDrapedGeometry(hemOnly=false):THREE.BufferGeometry{
 const positions:number[]=[],uvs:number[]=[];
 const push=(p:readonly number[],uv:readonly number[])=>{
  positions.push(p[0],p[1],p[2]);uvs.push(uv[0],uv[1]);
 };
 const tri=(a:readonly number[],b:readonly number[],c:readonly number[],
  ua:readonly number[],ub:readonly number[],uc:readonly number[])=>{
  push(a,ua);push(b,ub);push(c,uc);
 };
 const quad=(a:readonly number[],b:readonly number[],c:readonly number[],
  d:readonly number[],ua:readonly number[],ub:readonly number[],
  uc:readonly number[],ud:readonly number[])=>{
  tri(a,b,c,ua,ub,uc);tri(a,c,d,ua,uc,ud);
 };
 if(!hemOnly){
  const a=[-X,PASGT_COVER_TOP_Y,FRONT],b=[X,PASGT_COVER_TOP_Y,FRONT],
   c=[X,PASGT_COVER_TOP_Y,REAR],d=[-X,PASGT_COVER_TOP_Y,REAR];
  tri(a,c,b,pasgtAtlasUv([a[0],a[2]]),pasgtAtlasUv([c[0],c[2]]),
   pasgtAtlasUv([b[0],b[2]]));
  tri(a,d,c,pasgtAtlasUv([a[0],a[2]]),pasgtAtlasUv([d[0],d[2]]),
   pasgtAtlasUv([c[0],c[2]]));
 }
 const pairs:readonly [PasgtRing,PasgtRing][]=
  hemOnly?[['ramp','hem']]:
  [['top','shoulder'],['shoulder','ramp'],['ramp','hem']];
 for(const [up,down] of pairs){
  for(const panel of panels){
   for(let i=0;i<panel.length-1;i++){
    const rawA=panel[i],rawB=panel[i+1];
    const a=PASGT_RING_SAMPLES.find(s=>s.side===rawA.side&&s.x===rawA.x&&s.z===rawA.z)!;
    const b=PASGT_RING_SAMPLES.find(s=>s.side===rawB.side&&s.x===rawB.x&&s.z===rawB.z)!;
    if(hemOnly){
     // Slim folded seam with the same lower contour as the fitted fabric.
     const make=(s:PasgtRingSample,raised:boolean):readonly number[]=>{
      const p=pasgtRingPoint(s,'hem');
      const n=s.side==='front'?[0,0,-.035]:
       s.side==='rear'?[0,0,.035]:
       [s.side==='right'?.035:-.035,0,0];
      return [p[0]+n[0],p[1]+(raised?.14:0),p[2]+n[2]];
     };
     const p0=make(a,true),p1=make(b,true),p2=make(b,false),p3=make(a,false);
     quad(p0,p1,p2,p3,
      pasgtAtlasUv(pasgtFabricCoordinate(a,'hem')),
      pasgtAtlasUv(pasgtFabricCoordinate(b,'hem')),
      pasgtAtlasUv(pasgtFabricCoordinate(b,'hem')),
      pasgtAtlasUv(pasgtFabricCoordinate(a,'hem')));
     continue;
    }
    const p0=pasgtRingPoint(a,up),p1=pasgtRingPoint(b,up),
     p2=pasgtRingPoint(b,down),p3=pasgtRingPoint(a,down);
    quad(p0,p1,p2,p3,
     pasgtAtlasUv(pasgtFabricCoordinate(a,up)),
     pasgtAtlasUv(pasgtFabricCoordinate(b,up)),
     pasgtAtlasUv(pasgtFabricCoordinate(b,down)),
     pasgtAtlasUv(pasgtFabricCoordinate(a,down)));
   }
  }
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
 g.setAttribute('uv1',new THREE.Float32BufferAttribute(uvs.slice(),2));
 g.computeVertexNormals();g.computeBoundingBox();
 g.userData.pasgtDrapedFabric=true;
 g.userData.pasgtPanelCount=hemOnly?
  panels.reduce((n,p)=>n+p.length-1,0):
  1+3*panels.reduce((n,p)=>n+p.length-1,0);
 g.userData.pasgtUvLayout='common-unfolded-crown-side-fabric';
 g.userData.topSeams=[...PASGT_TOP_SEAM_OFFSETS];
 g.userData.printScale=PASGT_CAMO_SCALE;
 return g;
}
/** PASGT P5-D will update slit frames using this same panel parameterization.
 * Preserve the existing eight slots until the accessory audit begins.
 */
export const PASGT_SLIT_ANCHORS:readonly PasgtSlitAnchor[]=[
 {id:'front-left',position:[-2.70,5.47,PEAK_FRONT-.09],yaw:0,pitch:-.10},
 {id:'front-right',position:[2.70,5.47,PEAK_FRONT-.09],yaw:0,pitch:.10},
 {id:'right-forward',position:[SIDE+.09,5.48,-3.15],yaw:Math.PI/2,pitch:-.11},
 {id:'right-aft',position:[SIDE+.09,4.20,2.30],yaw:Math.PI/2,pitch:.12},
 {id:'rear-right',position:[2.65,4.22,NAPE_REAR+.09],yaw:Math.PI,pitch:.10},
 {id:'rear-left',position:[-2.65,4.22,NAPE_REAR+.09],yaw:Math.PI,pitch:-.10},
 {id:'left-aft',position:[-SIDE-.09,4.24,2.30],yaw:-Math.PI/2,pitch:.13},
 {id:'left-forward',position:[-SIDE-.09,5.48,-3.15],yaw:-Math.PI/2,pitch:-.10}
];
/** PASGT P5-C: one vertically readable, near-flush strip. Its upper and
 * lower edges lie on the UPRIGHT brim/side/nape surfaces, not the wide
 * diagonal shoulder. Two prebuilt profiles allow bare-shell and cover fit.
 */
export function createPasgtBandGeometry(covered=true):THREE.BufferGeometry{
 const positions:number[]=[],uvs:number[]=[];
 const push=(p:readonly number[],uv:readonly number[])=>{
  positions.push(p[0],p[1],p[2]);uvs.push(uv[0],uv[1]);
 };
 const tri=(a:readonly number[],b:readonly number[],c:readonly number[],
  ua:readonly number[],ub:readonly number[],uc:readonly number[])=>{
  push(a,ua);push(b,ub);push(c,uc);
 };
 const sideWidth=covered?SIDE+.065:ear.x+ear.width/2+.055;
 const frontZ=covered?PEAK_FRONT-.065:peak.z-peak.depth/2-.055;
 const rearZ=covered?NAPE_REAR+.065:rear.z+rear.depth/2+.055;
 const frontShift=frontZ-FRONT,rearShift=rearZ-REAR;
 const project=(s:PasgtRingSample,y:number):readonly [number,number,number]=>{
  if(s.side==='front')return [s.x/X*sideWidth,y,frontZ];
  if(s.side==='rear')return [s.x/X*sideWidth,y,rearZ];
  const f=clamp((-3.4-s.z)/(-3.4-FRONT));
  const b=clamp((s.z-4.3)/(REAR-4.3));
  return [s.side==='right'?sideWidth:-sideWidth,y,
   s.z+frontShift*f+rearShift*b];
 };
 // 0.72 model-unit vertical width, ~0.065 unit protrusion from the
 // surrounding material. Keeping both Y levels on vertical faces prevents
 // another shelf / projecting roof, even for the covered brow.
 const top=5.90,bottom=5.18;
 for(const panel of panels)for(let i=0;i<panel.length-1;i++){
  const a=PASGT_RING_SAMPLES.find(s=>s.side===panel[i].side&&s.x===panel[i].x&&s.z===panel[i].z)!;
  const b=PASGT_RING_SAMPLES.find(s=>s.side===panel[i+1].side&&s.x===panel[i+1].x&&s.z===panel[i+1].z)!;
  const p0=project(a,top),p1=project(b,top),
   p2=project(b,bottom),p3=project(a,bottom);
  const u0:[number,number]=[a.distance/PASGT_RING_CIRCUMFERENCE,1];
  const u1:[number,number]=[b.distance/PASGT_RING_CIRCUMFERENCE,1];
  const v0:[number,number]=[a.distance/PASGT_RING_CIRCUMFERENCE,0];
  const v1:[number,number]=[b.distance/PASGT_RING_CIRCUMFERENCE,0];
  tri(p0,p1,p2,u0,u1,v1);tri(p0,p2,p3,u0,v1,v0);
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
 g.computeVertexNormals();g.computeBoundingBox();
 g.userData.pasgtBandHeight=top-bottom;
 g.userData.pasgtBandFit=covered?'cover':'bare-shell';
 g.userData.pasgtBandContactOffset=.065;
 return g;
}
