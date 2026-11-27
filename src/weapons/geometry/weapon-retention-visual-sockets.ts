/** WR2.1: capture candidate support seats before rigid mesh compilation.
 * Transform nested/folded part geometry into the silhouette root's local
 * frame; never treat a folded stock's mesh-local coordinates as deployed. */
import * as THREE from 'three';
import {deriveWeaponRetentionSockets,type WeaponRetentionSockets,type RetentionPoint}
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
 const meshes:Record<Slot,THREE.Mesh[]>={receiver:[],stock:[],handguard:[]};
 root.traverse(o=>{
  if(!(o instanceof THREE.Mesh))return;
  let node:THREE.Object3D|null=o,slot:Slot|undefined;
  while(node&&node!==root){
   const match=/^family-(receiver|stock|handguard)-/.exec(node.name);
   if(match){slot=match[1] as Slot;break;}
   node=node.parent;
  }
  if(!slot)return;
  meshes[slot].push(o);
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
 const candidate=deriveWeaponRetentionSockets(bounds);
 if(!candidate)return null;
 // Seat candidates on the actual outboard surface, even on hollow stocks.
 // Bounded search: up to 25 rays at configuration rebuild only.
 const ray=new THREE.Raycaster();
 const direction=new THREE.Vector3(0,0,-1).transformDirection(root.matrixWorld);
 const origin=new THREE.Vector3();
 function surface(p:RetentionPoint,slot:Slot):RetentionPoint|null{
  const b=bounds[slot];
  if(b.isEmpty())return null;
  for(const [dx,dy] of [[0,0],[0,.16],[0,-.16],[.12,0],[-.12,0],
    [.12,.16],[-.12,.16],[.12,-.16],[-.12,-.16],[.25,0],[-.25,0],[0,.32],[0,-.32]]){
   origin.set(p.x+dx*(b.max.x-b.min.x),p.y+dy*(b.max.y-b.min.y),b.max.z+2)
    .applyMatrix4(root.matrixWorld);
   ray.set(origin,direction);
   const hit=ray.intersectObjects(meshes[slot],false)[0];
   if(hit){
    const localHit=hit.point.clone().applyMatrix4(inverse);
    return {x:localHit.x,y:localHit.y,z:localHit.z};
   }
  }
  return null;
 }
 const single=surface(candidate.single,'receiver')??candidate.single;
 const rear=surface(candidate.rear,candidate.rear.x<bounds.receiver.min.x?'stock':'receiver')??single;
 const front=candidate.front?surface(candidate.front,'handguard'):null;
 const usableFront=front&&front.x>rear.x+1?front:null;
 return {rear,single,front:usableFront,supported:usableFront?['single','two']:['single']};
}
