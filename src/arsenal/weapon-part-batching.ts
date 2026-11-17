/** E6.27: optional render-only batching INSIDE independently selectable
 * rigid firearm components. Each model retains its original named meshes in
 * an invisible authoring archive for socket measurement and art inspection.
 *
 * Scope is intentionally narrower than a whole-gun bake: no magazine,
 * optics, accessory, moving mechanisms, overlays or instance-driven rails.
 * Call once after source silhouette creation and stock-contact measurement.
 */
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

type Slot='receiver'|'barrel'|'handguard'|'stock'|'grip';
type Candidate={mesh:THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>;
 slot:Slot;material:THREE.MeshStandardMaterial;signature:string};
const slotName=/^family-(receiver|barrel|handguard|stock|grip)-/;
function candidate(node:THREE.Object3D,root:THREE.Group):Candidate|null{
 if(node.parent!==root||!(node instanceof THREE.Mesh)||
    node instanceof THREE.InstancedMesh||node instanceof THREE.SkinnedMesh||
    node.children.length||!node.visible||node.renderOrder!==0||
    node.customDepthMaterial||node.customDistanceMaterial||
    node.morphTargetInfluences?.length||
    Object.keys(node.userData).length||
    !(node.material instanceof THREE.MeshStandardMaterial)||
    !(node.geometry instanceof THREE.BufferGeometry)||
    Object.keys(node.geometry.morphAttributes).length)return null;
 const match=slotName.exec(node.name);
 if(!match)return null;
 const material=node.material;
 if(material.transparent||material.alphaTest!==0||
    material.opacity!==1||!material.depthWrite||!material.depthTest||
    material.blending!==THREE.NormalBlending)return null;
 const geo=node.geometry;
 // A partially drawn buffer or alpha-masked surface cannot be flattened.
 // Geometry groups are harmless when the mesh has ONE opaque material:
 // THREE.BoxGeometry itself emits six face groups under one material.
 if(geo.drawRange.start!==0||geo.drawRange.count!==Infinity||
    material.alphaMap!==null)return null;
 const keys=Object.keys(geo.attributes).sort();
 if(!keys.includes('position')||
    keys.some(k=>!(geo.attributes[k] instanceof THREE.BufferAttribute)))return null;
 const layout=keys.map(k=>{
  const a=geo.attributes[k] as THREE.BufferAttribute;
  return k+':'+a.itemSize+':'+a.normalized+':'+a.array.constructor.name;
 }).join(',');
 const signature=[node.castShadow,node.receiveShadow,node.layers.mask,
  node.frustumCulled,!!geo.index,layout].join('/');
 return {mesh:node as Candidate['mesh'],slot:match[1] as Slot,material,signature};
}
export type ArsenalPartBake=Readonly<{
 originalMeshes:number;renderMeshes:number;avoidedDraws:number;
 archive:THREE.Group|null;restore:()=>void;
}>;
export function compileArsenalRigidPartSiblings(root:THREE.Group):ArsenalPartBake{
 const bins=new Map<string,Candidate[]>();
 const materialIds=new Map<THREE.Material,number>();
 for(const node of [...root.children]){
  const item=candidate(node,root);
  if(!item)continue;
  if(!materialIds.has(item.material))materialIds.set(item.material,materialIds.size);
  const key=[item.slot,materialIds.get(item.material),item.signature].join('|');
  const group=bins.get(key)??[];
  group.push(item);bins.set(key,group);
 }
 const output:{mesh:THREE.Mesh;source:THREE.Mesh[]}[]=[];
 let batchIndex=0;
 for(const group of bins.values()){
  if(group.length<2)continue;
  const parts=group.map(({mesh})=>{
   mesh.updateMatrix();
   return mesh.geometry.clone().applyMatrix4(mesh.matrix);
  });
  const geometry=mergeGeometries(parts,false);
  for(const part of parts)part.dispose();
  if(!geometry)continue;
  const head=group[0],mesh=new THREE.Mesh(geometry,head.material);
  mesh.name='family-'+head.slot+'-compiled-e627-'+batchIndex++;
  mesh.castShadow=head.mesh.castShadow;
  mesh.receiveShadow=head.mesh.receiveShadow;
  mesh.layers.mask=head.mesh.layers.mask;
  mesh.frustumCulled=head.mesh.frustumCulled;
  mesh.userData.fieldworkE627CompiledPart=head.slot;
  mesh.userData.fieldworkE627SourceCount=group.length;
  output.push({mesh,source:group.map(x=>x.mesh)});
 }
 if(!output.length)return {
  originalMeshes:0,renderMeshes:0,avoidedDraws:0,archive:null,restore:()=>{}
 };
 const archive=new THREE.Group();
 archive.name='e627-hidden-weapon-part-authoring';
 archive.visible=false;
 archive.userData.fieldworkSourceArchive=true;
 let original=0;
 for(const {mesh,source} of output){
  for(const part of source){archive.add(part);original++;}
  root.add(mesh);
 }
 root.add(archive);
 let restored=false;
 return {originalMeshes:original,renderMeshes:output.length,
  avoidedDraws:original-output.length,archive,
  restore:()=>{
   if(restored)return;
   restored=true;
   for(const {mesh,source} of output){
    root.remove(mesh);mesh.geometry.dispose();
    for(const part of source)root.add(part);
   }
   root.remove(archive);
  }
 };
}
