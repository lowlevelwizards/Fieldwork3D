/** E6.20: reusable rigid visual model compiler.
 *
 * Authoring meshes remain retained under an invisible source archive so
 * existing site disposal reaches their geometries and a bake can be undone.
 * Generated geometry is owned by the visible compiled mesh. Never dispose
 * a source geometry here: it may be shared by other owners, rigs or caches.
 *
 * "Model" does not mean "one draw" when materials/passes differ. Only mesh
 * parts with exactly the same material and GPU submission contract merge.
 * By default this processes only direct children of ONE visibility owner.
 */
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export type VisualCompileMode='opaque'|'opaque-facade';
export type VisualCompileStats=Readonly<{
 owner:THREE.Object3D;sourceMeshes:number;compiledMeshes:number;
 avoidedDraws:number;candidateMeshes:number;archive:THREE.Group|null;
 restore:()=>void;
}>;
export type VisualCompileOptions={
 mode?:VisualCompileMode;
 exclude?:ReadonlySet<THREE.Object3D>;
 minParts?:number;
 /** Explicit opt-in for rigid, opaque Toon siblings. Default is unchanged. */
 allowOpaqueToon?:boolean;
};
const safeMetadata=new Set([
 'fogFacade','fieldworkDrawFamily','fieldworkTransparencyRole'
]);
type EligibleRigidMaterial=THREE.MeshStandardMaterial|THREE.MeshToonMaterial;
type Candidate={mesh:THREE.Mesh<THREE.BufferGeometry,EligibleRigidMaterial>;
 material:EligibleRigidMaterial;role:string};
function eligible(node:THREE.Object3D,options:VisualCompileOptions):Candidate|null{
 if(!(node instanceof THREE.Mesh)||
  node instanceof THREE.InstancedMesh||
  node instanceof THREE.SkinnedMesh||
  !node.visible||node.children.length||node.name.length>0||
  options.exclude?.has(node)||node.customDepthMaterial||
  node.customDistanceMaterial||node.morphTargetInfluences?.length||
  !(node.geometry instanceof THREE.BufferGeometry)||
  Object.keys(node.userData).some(k=>!safeMetadata.has(k)))return null;
 // Operator garments may carry source-indexed baked AO, skin/cavity
 // receiver masks or per-piece visual metadata. Generic mergeGeometries
 // cannot preserve those channels; the operator-specific garment merger
 // owns them. Never silently drop any such CPU metadata in this pilot.
 const opaqueToon=options.allowOpaqueToon===true&&
  options.mode!=='opaque-facade'&&
  Object.keys(node.geometry.userData).length===0&&
  node.material instanceof THREE.MeshToonMaterial;
 if(!(node.material instanceof THREE.MeshStandardMaterial)&&!opaqueToon)return null;
 // Toon is allowed only when the caller explicitly owns this parent as
 // rigid. Moving bones, individually hidden parts and special shader meshes
 // must never be offered as direct siblings to this visual-only compiler.
 const material=node.material as EligibleRigidMaterial;
 if(material.opacity!==1||!material.depthWrite||!material.depthTest||
  material.alphaTest!==0||material.alphaMap!==null||
  material.blending!==THREE.NormalBlending)return null;
 const role=String(node.userData.fieldworkTransparencyRole??'');
 if(options.mode==='opaque-facade'){
  // Not genuinely translucent. These have transparent=true ONLY to sit
  // above the known-exterior fog pass, with 1002 render ordering.
  if(!material.transparent||node.renderOrder!==1002||
   role!=='known-exterior-detail'||node.userData.fogFacade!==true)return null;
 }else if(material.transparent||node.renderOrder!==0)return null;
 return {mesh:node as Candidate['mesh'],material,role};
}
function geometryCompatible(a:THREE.BufferGeometry,b:THREE.BufferGeometry){
 if(!!a.index!==!!b.index)return false;
 const keys=Object.keys(a.attributes).sort();
 const other=Object.keys(b.attributes).sort();
 if(keys.join('|')!==other.join('|'))return false;
 return keys.every(k=>{
  const x=a.attributes[k],y=b.attributes[k];
  return x.itemSize===y.itemSize&&x.normalized===y.normalized;
 });
}
/** Compile only rigid siblings controlled by the SAME parent.
 * Caller may use this for windows, static furniture, helmet components,
 * rigid weapon sub-assemblies and eventually spatial scenery chunks.
 * NEVER pass moving joints, fog planes, transparent glass or independent
 * disclosure owners as the whole group.
 */
export function compileRigidVisualOwner(owner:THREE.Object3D,
 options:VisualCompileOptions={}):VisualCompileStats{
 const groups=new Map<THREE.Material,Map<string,Candidate[]>>();
 let candidates=0;
 for(const child of owner.children){
  const item=eligible(child,options);
  if(!item)continue;
  candidates++;
  const m=item.mesh;
  const key=[m.castShadow,m.receiveShadow,m.renderOrder,
   m.layers.mask,m.frustumCulled,item.role,
   !!m.geometry.index,Object.keys(m.geometry.attributes).sort().map(k=>
    k+':'+m.geometry.attributes[k].itemSize+':'+
    m.geometry.attributes[k].normalized).join(',')].join('/');
  const byKey=groups.get(item.material)??new Map<string,Candidate[]>();
  const parts=byKey.get(key)??[];
  parts.push(item);byKey.set(key,parts);groups.set(item.material,byKey);
 }
 const merged:{mesh:THREE.Mesh;originals:THREE.Mesh[]}[]=[];
 for(const byKey of groups.values())for(const members of byKey.values()){
  if(members.length<(options.minParts??2))continue;
  const head=members[0];
  if(members.some(m=>!geometryCompatible(head.mesh.geometry,m.mesh.geometry)))
   continue;
  const parts=members.map(({mesh})=>{
   mesh.updateMatrix();
   return mesh.geometry.clone().applyMatrix4(mesh.matrix);
  });
  const combined=mergeGeometries(parts,false);
  for(const p of parts)p.dispose();
  if(!combined)continue;
  const baked=new THREE.Mesh(combined,head.material);
  baked.castShadow=head.mesh.castShadow;
  baked.receiveShadow=head.mesh.receiveShadow;
  baked.renderOrder=head.mesh.renderOrder;
  baked.layers.mask=head.mesh.layers.mask;
  baked.frustumCulled=head.mesh.frustumCulled;
  baked.userData.fieldworkCompiledModel=true;
  baked.userData.fieldworkCompiledSourceCount=members.length;
  if(head.role)baked.userData.fieldworkTransparencyRole=head.role;
  baked.userData.fieldworkDrawFamily='compiled-'+
   (head.role||'rigid')+'-assembly';
  merged.push({mesh:baked,originals:members.map(m=>m.mesh)});
 }
 if(!merged.length)return {owner,sourceMeshes:0,compiledMeshes:0,
  avoidedDraws:0,candidateMeshes:candidates,archive:null,restore:()=>{}};
 const archive=new THREE.Group();
 archive.name='fieldwork-compiled-authoring-sources';
 archive.visible=false;
 archive.userData.fieldworkCompiledSourceArchive=true;
 let originals=0;
 for(const batch of merged){
  for(const mesh of batch.originals){archive.add(mesh);originals++;}
  owner.add(batch.mesh);
 }
 owner.add(archive);
 let restored=false;
 const restore=()=>{
  if(restored)return;
  restored=true;
  for(const batch of merged){
   owner.remove(batch.mesh);
   batch.mesh.geometry.dispose();
   for(const source of batch.originals)owner.add(source);
  }
  owner.remove(archive);
 };
 return {owner,sourceMeshes:originals,compiledMeshes:merged.length,
  avoidedDraws:originals-merged.length,candidateMeshes:candidates,
  archive,restore};
}
