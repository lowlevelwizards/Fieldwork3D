/** Contour-conforming M1 field textiles; all modes built once.
 * Band, roof net and restrained foliage use the same M1 shape authority.
 */
import * as THREE from 'three';
import {m1PerimeterAt,M1_OUTLINE,type M1SurfaceMode}
 from './operator-m1-helmet-profile.ts';
type P=readonly [number,number,number];
export const M1_FIELD_MODES=['steel','fitted','loose'] as const;
const f=(a:P,b:P,c:P,triangles:number[])=>triangles.push(...a,...b,...c);
const geometry=(vertices:number[],kind:string):THREE.BufferGeometry=>{
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 g.computeVertexNormals();g.computeBoundingBox();
 g.userData.m1ProfileDerived=true;g.userData.m1FieldKind=kind;
 return g;
};
const outward=(p:P,push:number):P=>{
 const n=Math.hypot(p[0],p[2])||1;
 return [p[0]+push*p[0]/n,p[1],p[2]+push*p[2]/n];
};
export function createM1RetainingBandGeometry(mode:M1SurfaceMode){
 const yTop=mode==='steel'?5.74:5.58,
  yBottom=mode==='steel'?5.15:mode==='fitted'?5.11:5.02;
 const high=m1PerimeterAt(yTop,mode),low=m1PerimeterAt(yBottom,mode);
 const p:number[]=[];
 for(let i=0;i<M1_OUTLINE.length;i++){
  const k=(i+1)%M1_OUTLINE.length,
   a=outward(high[i],.085),b=outward(high[k],.085),
   c=outward(low[k],.085),d=outward(low[i],.085);
  f(a,b,c,p);f(a,c,d,p);
 }
 return geometry(p,'band-'+mode);
}
/** Surface height approximation to the authored bowl contour. A deliberately
 * sparse diamond net crosses the crown, then slopes into the sidewalls.
 * Ends tuck beneath the retaining band; no airborne horizontal roof grid.
 */
export function m1FieldHeight(mode:M1SurfaceMode,x:number,z:number){
 const slack=mode==='loose'?.28:mode==='fitted'?.13:0;
 // The new broad crown takes up ~81% of the bowl radius. Only one bold
 // shoulder leads to the wall; avoid the old sequence of tiny angled facets.
 const radius=Math.max(Math.abs(x)/6.17,Math.abs(z)/6.29);
 const points:[[number,number],[number,number],[number,number],[number,number]]=[
  [0,8.98+slack],[.81,8.98+slack],[.975,7.66+slack*.75],
  [1,5.25+slack*.4]
 ];
 for(let i=1;i<points.length;i++)if(radius<=points[i][0]){
  const lo=points[i-1],hi=points[i],t=(radius-lo[0])/(hi[0]-lo[0]);
  return lo[1]+(hi[1]-lo[1])*t;
 }
 return points.at(-1)![1];
}
export function createM1NetGeometry(mode:M1SurfaceMode){
 const p:number[]=[];
 // Four diagonal families with wide openings; cap total cord count.
 const directions=[[-.73,.68],[.73,.68]] as const;
 for(const [dx,dz] of directions)
  for(const offset of [-2.85,0,2.85]){
   const path:P[]=[];
   for(let j=0;j<=20;j++){
    const t=-7+j*.7,x=dx*t+dz*offset,z=dz*t-dx*offset;
    if(Math.max(Math.abs(x)/6.17,Math.abs(z)/6.29)>.985)continue;
    path.push([x,m1FieldHeight(mode,x,z)+.11,z]);
   }
   for(let j=0;j<path.length-1;j++){
    const a=path[j],b=path[j+1],w=.13,
     offsetX=dz*w,offsetZ=-dx*w;
    const p1:[number,number,number]=[
     a[0]-offsetX,m1FieldHeight(mode,a[0]-offsetX,a[2]-offsetZ)+.12,a[2]-offsetZ],
     p2:[number,number,number]=[
     a[0]+offsetX,m1FieldHeight(mode,a[0]+offsetX,a[2]+offsetZ)+.12,a[2]+offsetZ],
     p3:[number,number,number]=[
     b[0]+offsetX,m1FieldHeight(mode,b[0]+offsetX,b[2]+offsetZ)+.12,b[2]+offsetZ],
     p4:[number,number,number]=[
     b[0]-offsetX,m1FieldHeight(mode,b[0]-offsetX,b[2]-offsetZ)+.12,b[2]-offsetZ];
    f(p1,p2,p3,p);f(p1,p3,p4,p);
   }
  }
 return geometry(p,'net-'+mode);
}
/** Only a few broad scrim tabs; placement is tied to the actual contour.
 * Cloth is not another boxy second helmet perched around the lower edge.
 */
export function createM1ScrimGeometry(mode:M1SurfaceMode,heavy:boolean){
 const indices=heavy?[0,1,2,3,4,5,6,7]:[0,2,4,6];
 const p:number[]=[];
 const top=m1PerimeterAt(mode==='loose'?6.31:6.20,mode);
 for(const [order,i] of indices.entries()){
  const at=outward(top[i],.10),sign=i%2===0?1:-1;
  const span=heavy?.73:.91,h=heavy?1.00:.80;
  const tangent:[number,number,number]=[
   -at[2]/Math.hypot(at[0],at[2]),0,
   at[0]/Math.hypot(at[0],at[2])];
  const left:P=[
   at[0]-span*tangent[0]/2,at[1]-.38,
   at[2]-span*tangent[2]/2];
  const right:P=[
   at[0]+span*tangent[0]/2,at[1]-.38,
   at[2]+span*tangent[2]/2];
  const tip:P=[
   at[0]+sign*.28*tangent[0],at[1]+h*(order%3===0?1:.77),
   at[2]+sign*.28*tangent[2]];
  f(left,right,tip,p);
 }
 return geometry(p,heavy?'field-scrim-'+mode:'sparse-scrim-'+mode);
}
