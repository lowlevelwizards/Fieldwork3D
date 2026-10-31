/** Static floor grid instancing with room-group fog visibility.
 * One draw call per room; no actor/nav/visibility behavior changes. */
import * as THREE from 'three';
export type GroutRoom={x:number;y:number;w:number;h:number};
export function addRoomGroutInstances(parent:THREE.Object3D,room:GroutRoom,
  material:THREE.Material):THREE.InstancedMesh|null{
  const lengths:{x:number;z:number;w:number;d:number}[]=[];
  for(let x=room.x+22;x<room.x+room.w-8;x+=29)
    lengths.push({x,z:room.y+room.h/2,w:.65,d:room.h-7});
  for(let y=room.y+22;y<room.y+room.h-8;y+=29)
    lengths.push({x:room.x+room.w/2,z:y,w:room.w-7,d:.65});
  if(!lengths.length)return null;
  const mesh=new THREE.InstancedMesh(
    new THREE.BoxGeometry(1,1,1),material,lengths.length);
  const object=new THREE.Object3D();
  lengths.forEach((part,i)=>{
    object.position.set(part.x,-.01,part.z);
    object.scale.set(part.w,.1,part.d);
    object.updateMatrix();
    mesh.setMatrixAt(i,object.matrix);
  });
  mesh.instanceMatrix.needsUpdate=true;
  mesh.castShadow=false;mesh.receiveShadow=true;
  parent.add(mesh);
  return mesh;
}
