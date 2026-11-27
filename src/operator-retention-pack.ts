/** SR7: sample selected visible pack artwork only when its cut changes.
 * The cached local box is transformed by the same staged pack inertia pose. */
import * as THREE from 'three';
import type {OperatorRig} from './breach-operator-rig.ts';
type Transform=Readonly<{position:THREE.Vector3;quaternion:THREE.Quaternion;scale:THREE.Vector3}>;
const cache=new WeakMap<THREE.Object3D,{key:string;local:THREE.Box3;frame:THREE.Box3;matrix:THREE.Matrix4}>();
function localBounds(node:THREE.Object3D,parent:THREE.Matrix4,out:THREE.Box3){
 if(!node.visible)return;
 node.updateMatrix();
 const matrix=parent.clone().multiply(node.matrix);
 if(node instanceof THREE.Mesh){
  const g=node.geometry;
  if(!g.boundingBox)g.computeBoundingBox();
  if(g.boundingBox&&!g.boundingBox.isEmpty())out.union(g.boundingBox.clone().applyMatrix4(matrix));
 }
 for(const child of node.children)localBounds(child,matrix,out);
}
export function retentionPackBounds(r:Pick<OperatorRig,'pack'|'visualKit'>,
 style:string,pose:Transform):THREE.Box3|undefined{
 if(!r.pack.visible||style==='no-pack')return undefined;
 const v=r.visualKit;
 const roots=[v.wardrobeGear.pack[style],v.dayPack,v.fieldPack,v.packPreview.active?.root].filter((g):g is THREE.Group=>!!g&&g.visible);
 const key=style+'|'+roots.map(g=>g.uuid+':'+g.scale.toArray().join(',')+':'+g.position.toArray().join(',')).join('|');
 let entry=cache.get(r.pack);
 if(!entry||entry.key!==key){
  const local=new THREE.Box3(),identity=new THREE.Matrix4();
  for(const root of roots)localBounds(root,identity,local);
  entry={key,local,frame:new THREE.Box3(),matrix:new THREE.Matrix4()};
  cache.set(r.pack,entry);
 }
 if(entry.local.isEmpty())return undefined;
 return entry.frame.copy(entry.local).applyMatrix4(entry.matrix.compose(pose.position,pose.quaternion,r.pack.scale));
}
export function packedRearSurface(back:number,y:number,z:number,pack?:THREE.Box3):number{
 return pack&&!pack.isEmpty()&&y>=pack.min.y&&y<=pack.max.y&&z>=pack.min.z&&z<=pack.max.z?
  Math.min(back,pack.min.x):back;
}
