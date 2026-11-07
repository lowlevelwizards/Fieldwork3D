/** PASGT P4-B — taut fabric skin over the unchanged blocky shell.
 * Authored front/brow and rear/nape diagonal bridges, plus one sloping
 * temple-to-ear lower edge. No shell remesh, interpolation subdivisions,
 * cloth simulation, or per-frame geometry construction.
 */
import * as THREE from 'three';

export const PASGT_ATLAS_WIDTH=256;
export const PASGT_ATLAS_HEIGHT=256;
export const PASGT_CAMO_SCALE=1.8; // relative to approved source print density
export const PASGT_TOP_SEAM_OFFSETS=[-2.6,2.6] as const;
export const PASGT_COVER_TOP_Y=8.94;

type Side='front'|'right'|'rear'|'left';
export type PasgtRingSample={
 side:Side;x:number;z:number;bottomY:number;distance:number;
};
export type PasgtSlitAnchor={
 id:string;position:readonly [number,number,number];
 yaw:number;pitch:number;
};
const X=5.275,TOP_FRONT=-5.155,TOP_REAR=5.17;
const rightBottom=(z:number):number=>
 z<=-1.5?4.31:z>=.40?1.96:4.31-(z+1.5)/1.9*2.35;
/** Clockwise in horizontal plan: front left -> front right -> rear right
 * -> rear left. Corner duplicates are removed; wrap closure is explicit.
 */
const layout:{side:Side;x:number;z:number;bottomY:number}[]=[
 ...[-X,-2.65,0,2.65,X].map(x=>({side:'front' as const,x,z:TOP_FRONT,bottomY:4.31})),
 ...[-3.4,-1.5,.40,2.3,4.55,TOP_REAR].map(z=>({
  side:'right' as const,x:X,z,bottomY:rightBottom(z)
 })),
 ...[2.65,0,-2.65,-X].map(x=>({side:'rear' as const,x,z:TOP_REAR,bottomY:1.96})),
 ...[4.55,2.3,.40,-1.5,-3.4].map(z=>({
  side:'left' as const,x:-X,z,bottomY:rightBottom(z)
 }))
];
let cumulative=0;
export const PASGT_RING_SAMPLES:readonly PasgtRingSample[]=layout.map((a,i)=>{
 if(i){
  const prev=layout[i-1];
  cumulative+=Math.hypot(a.x-prev.x,a.z-prev.z);
 }
 return {...a,distance:cumulative};
});
export const PASGT_RING_CIRCUMFERENCE=cumulative+
 Math.hypot(layout[0].x-layout.at(-1)!.x,layout[0].z-layout.at(-1)!.z);
export type PasgtRing='top'|'shoulder'|'ramp'|'hem';
export function pasgtRingPoint(sample:PasgtRingSample,ring:PasgtRing):
 readonly [number,number,number]{
 const face=sample.side==='front',back=sample.side==='rear';
 const isSide=sample.side==='left'||sample.side==='right';
 const sign=sample.x<0?-1:1;
 const extent=ring==='top'?X:ring==='shoulder'?X+.025:X+.13;
 const x=isSide?sign*extent:sample.x/X*extent;
 const z=face?(ring==='top'?TOP_FRONT:ring==='shoulder'?-5.19:-6.45):
  back?(ring==='top'?TOP_REAR:ring==='shoulder'?5.22:5.86):
  sample.z;
 const y=ring==='top'?PASGT_COVER_TOP_Y:ring==='shoulder'?6.74:
  ring==='ramp'?6.12:sample.bottomY;
 return [x,y,z];
}
const uvTop=(x:number,z:number):readonly [number,number]=>
 [(30+5*(x+X)+.5)/PASGT_ATLAS_WIDTH,
  (30+5*(z-TOP_FRONT)+.5)/PASGT_ATLAS_HEIGHT];
const uvSide=(distance:number,y:number,bottomY:number):
 readonly [number,number]=>
 [(10+4.9*distance+.5)/PASGT_ATLAS_WIDTH,
  (145+5*(y-bottomY)+.5)/PASGT_ATLAS_HEIGHT];
export function createPasgtDrapedGeometry(hemOnly=false):THREE.BufferGeometry{
 const vertices:number[]=[],uvs:number[]=[];
 const put=(p:readonly number[],uv:readonly number[])=>{
  vertices.push(p[0],p[1],p[2]);uvs.push(uv[0],uv[1]);
 };
 const tri=(a:readonly number[],b:readonly number[],c:readonly number[],
  u:readonly number[],v:readonly number[],w:readonly number[])=>{
  put(a,u);put(b,v);put(c,w);
 };
 const quad=(a:readonly number[],b:readonly number[],c:readonly number[],
  d:readonly number[],u:readonly number[],v:readonly number[],
  w:readonly number[],q:readonly number[])=>{
  tri(a,b,c,u,v,w);tri(a,c,d,u,w,q);
 };
 // A single truly flat crown: two longitudinal seams are printed, not
 // modeled. Do not create a stepped second shell on this surface.
 if(!hemOnly){
  const y=PASGT_COVER_TOP_Y;
  const a=[-X,y,TOP_FRONT],b=[X,y,TOP_FRONT],
   c=[X,y,TOP_REAR],d=[-X,y,TOP_REAR];
  tri(a,c,b,uvTop(a[0],a[2]),uvTop(c[0],c[2]),uvTop(b[0],b[2]));
  tri(a,d,c,uvTop(a[0],a[2]),uvTop(d[0],d[2]),uvTop(c[0],c[2]));
 }
 const N=PASGT_RING_SAMPLES.length;
 const pairs:readonly [PasgtRing,PasgtRing][]=
  hemOnly?[['ramp','hem']]:
   [['top','shoulder'],['shoulder','ramp'],['ramp','hem']];
 for(const [upper,lower] of pairs){
  for(let i=0;i<N;i++){
   const a=PASGT_RING_SAMPLES[i],b=PASGT_RING_SAMPLES[(i+1)%N];
   const sA=a.distance,sB=i===N-1?PASGT_RING_CIRCUMFERENCE:b.distance;
   if(hemOnly){
    // An integral 0.14-height folded textile tape along the lower boundary;
    // sits just outside the drape and follows the diagonal ear transition.
    const bottomA=pasgtRingPoint(a,'hem'),bottomB=pasgtRingPoint(b,'hem');
    const offset=(p:readonly number[])=>{
     const sx=p[0]===0?0:Math.sign(p[0])*.040;
     const sz=p[2]<-5.5?-.040:p[2]>5.5?.040:0;
     return [p[0]+sx,p[1],p[2]+sz];
    };
    const p0=offset([bottomA[0],bottomA[1]+.15,bottomA[2]]);
    const p1=offset([bottomB[0],bottomB[1]+.15,bottomB[2]]);
    const p2=offset(bottomB),p3=offset(bottomA);
    quad(p0,p1,p2,p3,
     uvSide(sA,a.bottomY+.15,a.bottomY),
     uvSide(sB,b.bottomY+.15,b.bottomY),
     uvSide(sB,b.bottomY,b.bottomY),
     uvSide(sA,a.bottomY,a.bottomY));
    continue;
   }
   const p0=pasgtRingPoint(a,upper),p1=pasgtRingPoint(b,upper),
    p2=pasgtRingPoint(b,lower),p3=pasgtRingPoint(a,lower);
   quad(p0,p1,p2,p3,uvSide(sA,p0[1],a.bottomY),
    uvSide(sB,p1[1],b.bottomY),uvSide(sB,p2[1],b.bottomY),
    uvSide(sA,p3[1],a.bottomY));
  }
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
 geometry.setAttribute('uv1',new THREE.Float32BufferAttribute(uvs.slice(),2));
 geometry.computeVertexNormals();geometry.computeBoundingBox();
 geometry.userData.pasgtDrapedFabric=true;
 geometry.userData.pasgtPanelCount=hemOnly?N:N*3+1;
 geometry.userData.pasgtUvLayout='crown-planar/wrapped-skirt';
 geometry.userData.topSeams=[...PASGT_TOP_SEAM_OFFSETS];
 geometry.userData.printScale=PASGT_CAMO_SCALE;
 return geometry;
}
/** All field additions use these eight visible textile cuts. Nothing is
 * planted into empty space on top of the crown.
 */
export const PASGT_SLIT_ANCHORS:readonly PasgtSlitAnchor[]=[
 {id:'front-left',position:[-2.70,5.47,-6.54],yaw:0,pitch:-.10},
 {id:'front-right',position:[2.70,5.47,-6.54],yaw:0,pitch:.10},
 {id:'right-forward',position:[5.47,5.48,-3.15],yaw:Math.PI/2,pitch:-.11},
 {id:'right-aft',position:[5.47,4.20,2.30],yaw:Math.PI/2,pitch:.12},
 {id:'rear-right',position:[2.65,4.22,5.95],yaw:Math.PI,pitch:.10},
 {id:'rear-left',position:[-2.65,4.22,5.95],yaw:Math.PI,pitch:-.10},
 {id:'left-aft',position:[-5.47,4.24,2.30],yaw:-Math.PI/2,pitch:.13},
 {id:'left-forward',position:[-5.47,5.48,-3.15],yaw:-Math.PI/2,pitch:-.10}
];
/** A simple explicit 3D tape follows a physical Y contour of the four
 * cover surfaces. It is NOT a flat shelf, and is NOT a crown X pattern.
 */
export function createPasgtBandGeometry():THREE.BufferGeometry{
 const points:number[]=[],uvs:number[]=[];
 const push=(p:readonly number[])=>{points.push(...p);uvs.push(0,0);};
 const tri=(a:readonly number[],b:readonly number[],c:readonly number[])=>{
  push(a);push(b);push(c);
 };
 const N=PASGT_RING_SAMPLES.length;
 const interp=(a:PasgtRingSample,y:number):readonly number[]=>{
  const shoulder=pasgtRingPoint(a,'shoulder'),
   ramp=pasgtRingPoint(a,'ramp');
  if(y>=6.74){
   const top=pasgtRingPoint(a,'top'),t=(y-6.74)/(8.94-6.74);
   return shoulder.map((v,i)=>v*(1-t)+top[i]*t);
  }
  if(y>=6.12){
   const t=(y-6.12)/.62;
   return ramp.map((v,i)=>v*(1-t)+shoulder[i]*t);
  }
  return ramp;
 };
 const outset=(sample:PasgtRingSample,p:readonly number[])=>{
  const v=[...p];
  if(sample.side==='front')v[2]-=.095;
  else if(sample.side==='rear')v[2]+=.095;
  else v[0]+=Math.sign(v[0])*.095;
  return v;
 };
 for(let i=0;i<N;i++){
  const a=PASGT_RING_SAMPLES[i],b=PASGT_RING_SAMPLES[(i+1)%N];
  const a0=outset(a,interp(a,6.86)),b0=outset(b,interp(b,6.86));
  const a1=outset(a,interp(a,6.13)),b1=outset(b,interp(b,6.13));
  tri(a0,b0,b1);tri(a0,b1,a1);
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
 g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
 g.computeVertexNormals();g.computeBoundingBox();
 g.userData.pasgtBandHeight=.73;
 return g;
}
