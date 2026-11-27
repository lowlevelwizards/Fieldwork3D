/** WR2.1: capture candidate support seats before rigid mesh compilation.
 * Transform nested/folded part geometry into the silhouette root's local
 * frame; never treat a folded stock's mesh-local coordinates as deployed. */
import * as THREE from 'three';
import {deriveWeaponRetentionSockets,type WeaponRetentionSockets}
 from './weapon-retention-sockets.ts';
type Slot='receiver'|'stock'|'handguard';
export function measureWeaponRetentionSockets(root:THREE.Object3D):
 WeaponRetentionSockets|null{
 root.updateWorldMatrix(true,true);
 const inverse=root.matrixWorld.clone().invert();
 const local=new THREE.Matrix4();
 const bounds:Record<Slot,THREE.Box3>={
  receiver:new THREE.Box3(),stock:new THREE.Box3(),handguard:new THREE.Box3()
 };
 root.traverse(o=>{
  if(!(o instanceof THREE.Mesh))return;
  let node:THREE.Object3D|null=o,slot:Slot|undefined;
  while(node&&node!==root){
   const match=/^family-(receiver|stock|handguard)-/.exec(node.name);
   if(match){slot=match[1] as Slot;break;}
   node=node.parent;
  }
  if(!slot)return;
  if(o instanceof THREE.InstancedMesh){
   if(!o.boundingBox)o.computeBoundingBox();
   if(o.boundingBox)bounds[slot].union(o.boundingBox.clone()
    .applyMatrix4(local.multiplyMatrices(inverse,o.matrixWorld)));
  }else{
   if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();
   if(o.geometry.boundingBox)bounds[slot].union(o.geometry.boundingBox.clone()
    .applyMatrix4(local.multiplyMatrices(inverse,o.matrixWorld)));
  }
 });
 return deriveWeaponRetentionSockets(bounds);
}
