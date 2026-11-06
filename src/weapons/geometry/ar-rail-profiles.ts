/** One reusable miniature Picatinny language for every AR rail. Repeated
 * blocks are INSTANCED into one draw call instead of 12-20 separate meshes.
 * Coordinates are visual XY/Z envelopes; no mount or gameplay physics.
 */
import * as THREE from 'three';
import type {SlotName} from './profile-primitives.ts';
export type ARRailOptions={
 startX:number;endX:number;count:number;topY:number;
 bottomY?:number;sideZ?:number;sideY?:number;
 coverSides?:boolean;
};
export function addARRailSegments(root:THREE.Group,slot:SlotName,id:string,n:number,
 art:ARRailOptions,material:THREE.Material){
 const count=Math.max(2,Math.min(6,Math.floor(art.count)));
 const teeth:{x:number;y:number;z:number;w:number;h:number;d:number}[]=[];
 const available=art.endX-art.startX;
 for(let i=0;i<count;i++){
  const x=art.startX+.80+i*(available-1.60)/(count-1);
  // Upper teeth — all rifles share these exact shapes and dimensions.
  teeth.push({x,y:art.topY,z:0,w:.66,h:.34,d:3.16});
  if(art.bottomY!==undefined)
   teeth.push({x,y:art.bottomY,z:0,w:.66,h:.34,d:2.43});
  if(art.sideZ!==undefined&&!art.coverSides){
   teeth.push({x,y:art.sideY??.57,z:-art.sideZ,w:.66,h:.80,d:.36});
   teeth.push({x,y:art.sideY??.57,z:art.sideZ,w:.66,h:.80,d:.36});
  }
 }
 const geometry=new THREE.BoxGeometry(1,1,1);
 const mesh=new THREE.InstancedMesh(geometry,material,teeth.length);
 mesh.name='family-'+slot+'-'+id+'-'+n;
 mesh.userData.arRailTeeth=true;
 mesh.userData.arRailCount=count;
 mesh.userData.arRailFourSided=
  art.bottomY!==undefined&&art.sideZ!==undefined&&!art.coverSides;
 const orientation=new THREE.Quaternion();
 const transform=new THREE.Matrix4();
 for(let i=0;i<teeth.length;i++){
  const t=teeth[i];
  transform.compose(new THREE.Vector3(t.x,t.y,t.z),orientation,
   new THREE.Vector3(t.w,t.h,t.d));
  mesh.setMatrixAt(i,transform);
 }
 mesh.instanceMatrix.needsUpdate=true;
 mesh.computeBoundingBox();mesh.computeBoundingSphere();
 mesh.castShadow=true;mesh.receiveShadow=true;
 root.add(mesh);
 return mesh;
}
