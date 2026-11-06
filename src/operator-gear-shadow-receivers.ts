/** Precision receivers for baked equipment light. Only STATIC meshes.
 * Creates no additional meshes, materials, atlases, or draw calls. Existing
 * camo UVs and normalized 8-bit grayscale vertex data are interpolated.
 * Dynamic one-unit IK limb segments MUST NEVER pass through this module.
 */
import * as THREE from 'three';
const STEP=1.0,MAX_STEPS=9;
export const STATIC_RECEIVER_VERTEX_BUDGET=8500;
export const BASE_TORSO_VERTEX_BUDGET=3700;
export type ReceiverBakeSummary={before:number;after:number;refined:number};
const supported=(geometry:THREE.BufferGeometry)=>
 Object.entries(geometry.attributes).every(([,a])=>
  a instanceof THREE.BufferAttribute&&
  a.array instanceof Float32Array||
  a instanceof THREE.BufferAttribute&&a.array instanceof Uint8Array);
const writeAttribute=(src:THREE.BufferAttribute,values:number[])=>{
 if(src.array instanceof Uint8Array)
  return new THREE.Uint8BufferAttribute(values.map(v=>
   Math.max(0,Math.min(255,Math.round(v*255)))),src.itemSize,true);
 return new THREE.Float32BufferAttribute(values,src.itemSize,src.normalized);
};
export function refineStaticShadowGeometry(
 geometry:THREE.BufferGeometry,budget=STATIC_RECEIVER_VERTEX_BUDGET,
 step=STEP):THREE.BufferGeometry{
 if(geometry.userData.fieldworkReceiverRefined===true)return geometry;
 const attrs=Object.entries(geometry.attributes) as
  [string,THREE.BufferAttribute][];
 const pos=geometry.getAttribute('position') as THREE.BufferAttribute|undefined,
  normal=geometry.getAttribute('normal') as THREE.BufferAttribute|undefined;
 if(!pos||!normal||!supported(geometry)||geometry.morphAttributes.position||
    geometry.getAttribute('skinIndex'))return geometry;
 const indices=geometry.index?.array;
 const triangles=(indices?indices.length:pos.count)/3;
 const plans:number[]=[];
 let count=0,changed=false;
 for(let t=0;t<triangles;t++){
  const ia=indices?indices[t*3]:t*3,
   ib=indices?indices[t*3+1]:t*3+1,
   ic=indices?indices[t*3+2]:t*3+2;
  const pts=[ia,ib,ic].map(i=>new THREE.Vector3().fromBufferAttribute(pos,i));
  const ab=pts[1].distanceTo(pts[0]),ac=pts[2].distanceTo(pts[0]),
   bc=pts[2].distanceTo(pts[1]);
  const area=pts[1].clone().sub(pts[0]).cross(
   pts[2].clone().sub(pts[0])).length()*.5;
  const nx=(normal.getX(ia)+normal.getX(ib)+normal.getX(ic))/3,
   ny=(normal.getY(ia)+normal.getY(ib)+normal.getY(ic))/3;
  // Large exposed static receiving panels only; don't inflate thin straps,
  // small hardware, or underfaces that won't receive useful cast shadows.
  const receiver=area>2.2&&(Math.abs(nx)>.35||ny>.40);
  let n=receiver?Math.min(MAX_STEPS,Math.max(1,Math.ceil(
   Math.max(ab,ac,bc)/step))):1;
  if(count+3*n*n>budget)n=1; // deterministic hard cap, no partial mesh.
  plans.push(n);count+=3*n*n;if(n>1)changed=true;
 }
 if(!changed)return geometry;
 const data=new Map<string,number[]>();
 for(const [k] of attrs)data.set(k,[]);
 const tmp=new Map<string,number[][]>();
 for(const [name,attr] of attrs){
  const raw:number[][]=[];
  for(let i=0;i<attr.count;i++){
   const row:number[]=[];
   for(let c=0;c<attr.itemSize;c++){
    const v=c===0?attr.getX(i):c===1?attr.getY(i):
     c===2?attr.getZ(i):attr.getW(i);
    row.push(v);
   }
   raw.push(row);
  }
  tmp.set(name,raw);
 }
 for(let t=0;t<triangles;t++){
  const n=plans[t],ix=[
   indices?indices[t*3]:t*3,
   indices?indices[t*3+1]:t*3+1,
   indices?indices[t*3+2]:t*3+2
  ];
  const vertex=(i:number,j:number)=>{
   const a=(n-i-j)/n,b=i/n,c=j/n;
   for(const [key,attr] of attrs){
    const source=tmp.get(key)!;
    const target=data.get(key)!;
    for(let d=0;d<attr.itemSize;d++){
     let value=a*source[ix[0]][d]+b*source[ix[1]][d]+
      c*source[ix[2]][d];
     if(key==='normal'){
      // Inputs are faceted, but normalize for fitted non-box triangles.
      const vec=[0,1,2].map(k=>
       a*source[ix[0]][k]+b*source[ix[1]][k]+c*source[ix[2]][k]);
      value=vec[d]/(Math.hypot(...vec)||1);
     }
     target.push(value);
    }
   }
  };
  for(let i=0;i<n;i++)for(let j=0;j<n-i;j++){
   vertex(i,j);vertex(i+1,j);vertex(i,j+1);
   if(i+j<n-1){
    vertex(i+1,j);vertex(i+1,j+1);vertex(i,j+1);
   }
  }
 }
 const result=new THREE.BufferGeometry();
 for(const [key,attr] of attrs)
  result.setAttribute(key,writeAttribute(attr,data.get(key)!));
 result.userData={...geometry.userData,fieldworkReceiverRefined:true};
 result.computeBoundingBox();result.computeBoundingSphere();
 return result;
}
export function refineStaticReceiver(
 root:THREE.Object3D,budget=STATIC_RECEIVER_VERTEX_BUDGET
):ReceiverBakeSummary{
 let before=0,after=0,refined=0,remaining=budget;
 root.traverse(o=>{
  if(!(o instanceof THREE.Mesh)||!o.visible||
   Array.isArray(o.material)||!o.material.userData.fieldworkBakedEquipmentAO||
   o.isSkinnedMesh||o.userData.ikLimb)return;
  const old=o.geometry,positions=old.getAttribute('position');
  if(!positions||!positions.count)return;
  before+=positions.count;
  if(remaining>positions.count){
   const g=refineStaticShadowGeometry(old,remaining);
   if(g!==old){
    o.geometry=g;old.dispose();refined++;
   }
  }
  const used=o.geometry.getAttribute('position').count;
  after+=used;remaining=Math.max(0,remaining-used);
 });
 return {before,after,refined};
}
