/** Build-time, render-only batch of rigid fixture parts.
 * Each intact/debris visibility group stays independent, including nested
 * groups, and translucent wear decals are never merged or reordered.
 * Original geometries can be site-wide shared; do NOT dispose them here.
 */
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export type FixtureBatchStats={original:number;batched:number;avoided:number};

export function consolidateStaticFixtureParts(root:THREE.Group,
 options:{recursive?:boolean;cellSize?:number}={}):FixtureBatchStats{
 const stats:FixtureBatchStats={original:0,batched:0,avoided:0};
 function visit(parent:THREE.Object3D):void{
  // Recursion respects the existing transforms and visibility boundaries.
  if(options.recursive!==false)
   for(const child of [...parent.children])
    if(child instanceof THREE.Group)visit(child);
  const groups=new Map<THREE.Material,Map<string,THREE.Mesh[]>>();
  for(const child of parent.children){
   if(!(child instanceof THREE.Mesh)||child instanceof THREE.InstancedMesh||
      !(child.geometry instanceof THREE.BufferGeometry)||
      !(child.material instanceof THREE.MeshStandardMaterial)||
      child.material.transparent||child.children.length||!child.visible||
      child.renderOrder!==0||Object.keys(child.userData).length>0)continue;
   // Partition large site exteriors into local cells so batching doesn't
   // force the entire neighborhood to render outside the camera frustum.
   const cell=options.cellSize&&options.cellSize>0?
    [Math.floor(child.position.x/options.cellSize),
     Math.floor(child.position.z/options.cellSize)].join(','):'';
   const flags=[child.castShadow,child.receiveShadow,
    child.layers.mask,child.frustumCulled,cell].join('/');
   let keyed=groups.get(child.material);
   if(!keyed){keyed=new Map();groups.set(child.material,keyed);}
   const list=keyed.get(flags)??[];
   list.push(child);keyed.set(flags,list);
  }
  for(const [material,keyed] of groups)for(const members of keyed.values()){
   if(members.length<2)continue;
   const parts=members.map(mesh=>{
    mesh.updateMatrix();
    return mesh.geometry.clone().applyMatrix4(mesh.matrix);
   });
   const combined=mergeGeometries(parts,false);
   for(const part of parts)part.dispose();
   if(!combined)continue; // mixed attributes/topology: preserve source parts
   const first=members[0];
   const mesh=new THREE.Mesh(combined,material);
   mesh.castShadow=first.castShadow;
   mesh.receiveShadow=first.receiveShadow;
   mesh.renderOrder=first.renderOrder;
   mesh.layers.mask=first.layers.mask;
   mesh.frustumCulled=first.frustumCulled;
   // All source vertices were transformed into the same parent space.
   for(const original of members)parent.remove(original);
   parent.add(mesh);
   stats.original+=members.length;stats.batched++;
  }
 }
 visit(root);
 stats.avoided=stats.original-stats.batched;
 return stats;
}
