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
 // Reuse scratch rather than creating three vectors and two cross products
 // for each face of every first-use outfit. Geometry and density unchanged.
 const p0=new THREE.Vector3(),p1=new THREE.Vector3(),
  p2=new THREE.Vector3(),edgeA=new THREE.Vector3(),
  edgeB=new THREE.Vector3();
 // Reserve ALL original triangles before adding any lighting samples.
 // A late unrefined triangle is not allowed to exceed the vertex cap.
 let count=triangles*3,changed=false;
 if(count>=budget)return geometry;
 for(let t=0;t<triangles;t++){
  const ia=indices?indices[t*3]:t*3,
   ib=indices?indices[t*3+1]:t*3+1,
   ic=indices?indices[t*3+2]:t*3+2;
  p0.fromBufferAttribute(pos,ia);
  p1.fromBufferAttribute(pos,ib);
  p2.fromBufferAttribute(pos,ic);
  const ab=p1.distanceTo(p0),ac=p2.distanceTo(p0),
   bc=p2.distanceTo(p1);
  const area=edgeA.copy(p1).sub(p0).cross(
   edgeB.copy(p2).sub(p0)).length()*.5;
  const nx=(normal.getX(ia)+normal.getX(ib)+normal.getX(ic))/3,
   ny=(normal.getY(ia)+normal.getY(ib)+normal.getY(ic))/3;
  // Large exposed static receiving panels only; don't inflate thin straps,
  // small hardware, or underfaces that won't receive useful cast shadows.
  const receiver=area>2.2&&(Math.abs(nx)>.35||ny>.40);
  let n=receiver?Math.min(MAX_STEPS,Math.max(1,Math.ceil(
   Math.max(ab,ac,bc)/step))):1;
  const extra=3*(n*n-1);
  if(count+extra>budget)n=1; // preserve total cap including future faces.
  else count+=extra;
  plans.push(n);if(n>1)changed=true;
 }
 if(!changed)return geometry;
 const data=new Map<string,number[]>();
 for(const [k] of attrs)data.set(k,[]);
 // Read source attributes directly instead of materializing an array of
 // boxed JS numbers for every source vertex and channel. This shrinks
 // temporary allocations at load/wardrobe-change time on mobile.
 const read=(a:THREE.BufferAttribute,i:number,c:number)=>
  c===0?a.getX(i):c===1?a.getY(i):c===2?a.getZ(i):a.getW(i);
 for(let t=0;t<triangles;t++){
  const n=plans[t],ix=[
   indices?indices[t*3]:t*3,
   indices?indices[t*3+1]:t*3+1,
   indices?indices[t*3+2]:t*3+2
  ];
  const vertex=(i:number,j:number)=>{
   const a=(n-i-j)/n,b=i/n,c=j/n;
   for(const [key,attr] of attrs){
    const target=data.get(key)!;
    // Normalization is invariant per generated vertex, not per component.
    let nx=0,ny=0,nz=0,length=1;
    if(key==='normal'){
     nx=a*read(attr,ix[0],0)+b*read(attr,ix[1],0)+
      c*read(attr,ix[2],0);
     ny=a*read(attr,ix[0],1)+b*read(attr,ix[1],1)+
      c*read(attr,ix[2],1);
     nz=a*read(attr,ix[0],2)+b*read(attr,ix[1],2)+
      c*read(attr,ix[2],2);
     length=Math.hypot(nx,ny,nz)||1;
    }
    for(let d=0;d<attr.itemSize;d++){
     const value=key==='normal'&&d<3?
      (d===0?nx:d===1?ny:nz)/length:
      a*read(attr,ix[0],d)+b*read(attr,ix[1],d)+
       c*read(attr,ix[2],d);
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
 const meshes:THREE.Mesh[]=[];
 root.traverse(o=>{
  if(!(o instanceof THREE.Mesh)||!o.visible||
   Array.isArray(o.material)||!o.material.userData.fieldworkBakedEquipmentAO||
   o instanceof THREE.SkinnedMesh||o.userData.ikLimb)return;
  if(o.geometry.getAttribute('position')?.count)meshes.push(o);
 });
 const before=meshes.reduce((total,mesh)=>
  total+mesh.geometry.getAttribute('position').count,0);
 let after=before,refined=0;
 // Never use one mesh's allowance to consume another mesh's mandatory
 // original vertices, even when some boxes are extremely small.
 let extraAllowance=Math.max(0,budget-before);
 for(const mesh of meshes){
  if(!extraAllowance)break;
  const old=mesh.geometry,base=old.getAttribute('position').count;
  const g=refineStaticShadowGeometry(old,base+extraAllowance);
  if(g===old)continue;
  const newCount=g.getAttribute('position').count;
  extraAllowance-=newCount-base;
  after+=newCount-base;
  mesh.geometry=g;old.dispose();refined++;
 }
 return {before,after,refined};
}
