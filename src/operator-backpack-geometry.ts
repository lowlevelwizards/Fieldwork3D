/** BP2 — static art helpers. Pack-local +X bodyward, +Y up, +Z right.
 * Use the shared metric fabric UVs and existing AO/merge pass. No runtime
 * physics, textures, lights or new material instances are allocated here.
 */
import * as THREE from 'three';
import {garmentBoxUV} from './operator-fabric-camo-materials.ts';
import {consolidateVisualGroup} from './operator-visual-mesh-merge.ts';
export type PackPoint=readonly [number,number,number];
export type PackMaterials=Readonly<{fabric:THREE.Material;trim:THREE.Material;dark:THREE.Material}>;
const positive=(n:number)=>Number.isFinite(n)&&n>0;
function validate(p:PackPoint,size:PackPoint){
 if(!p.every(Number.isFinite)||!size.every(positive))throw new RangeError('Invalid pack art dimensions');
}
function mesh(parent:THREE.Group,name:string,g:THREE.BufferGeometry,m:THREE.Material,p:PackPoint){
 const result=new THREE.Mesh(g,m);
 result.name=name;result.position.set(...p);
 result.castShadow=true;result.receiveShadow=true;parent.add(result);
 return result;
}
export function packBox(parent:THREE.Group,name:string,m:THREE.Material,p:PackPoint,size:PackPoint){
 validate(p,size);
 const g=new THREE.BoxGeometry(...size);
 garmentBoxUV(g,...size,...p,m);
 return mesh(parent,name,g,m,p);
}
/** Authored textile volume: optional narrowed top/bottom and compressed
 * rear upper edge. Faceted, not rounded; seams/pockets remain separate. */
export function packVolume(parent:THREE.Group,name:string,m:THREE.Material,p:PackPoint,size:PackPoint,
 cut:Readonly<{topWidth?:number;bottomWidth?:number;topDepth?:number}>={}){
 validate(p,size);
 const [d,h,w]=size;
 const topWidth=cut.topWidth??1,bottomWidth=cut.bottomWidth??1,topDepth=cut.topDepth??1;
 if(![topWidth,bottomWidth,topDepth].every(n=>positive(n)&&n<=1))throw new RangeError('Invalid textile taper');
 // Two height bands form broad deliberate shoulder cuts, not a sphere.
 const g=new THREE.BoxGeometry(d,h,w,1,3,1);
 garmentBoxUV(g,d,h,w,...p,m);
 const pos=g.getAttribute('position');
 for(let i=0;i<pos.count;i++){
  const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
  const t=y>=h*.49?topWidth:y<=-h*.49?bottomWidth:1;
  const depth=y>=h*.49?topDepth:1;
  pos.setXYZ(i,x<0?d*.5-(d*.5-x)*depth:x,y,z*t);
 }
 pos.needsUpdate=true;g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();
 return mesh(parent,name,g,m,p);
}
/** A flat straight webbing span with an authored face normal. Width stays
 * perpendicular to its path, thickness stays in the normal direction. */
export function packWebbing(parent:THREE.Group,name:string,m:THREE.Material,
 a:PackPoint,b:PackPoint,width:number,thickness:number,normal:PackPoint){
 const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),y=end.clone().sub(start);
 const length=y.length();validate(a,[thickness,length,width]);
 if(!b.every(Number.isFinite)||!normal.every(Number.isFinite))throw new RangeError('Invalid strap seat');
 y.normalize();const x=new THREE.Vector3(...normal).addScaledVector(y,-new THREE.Vector3(...normal).dot(y));
 if(x.lengthSq()<1e-8)throw new RangeError('Strap normal parallel to path');
 x.normalize();const z=x.clone().cross(y).normalize();
 const center=start.add(end).multiplyScalar(.5);
 const result=packBox(parent,name,m,[center.x,center.y,center.z],[thickness,length,width]);
 result.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));
 return result;
}
export function packBuckle(parent:THREE.Group,name:string,m:PackMaterials,p:PackPoint,width:number){
 return packBox(parent,name,m.dark,p,[.38,.65,width+.18]);
}
/** Thin dark graphic strip and chunky pull, rather than individual teeth. */
export function packZipper(parent:THREE.Group,name:string,m:PackMaterials,a:PackPoint,b:PackPoint,normal:PackPoint){
 const strip=packWebbing(parent,name,m.dark,a,b,.28,.07,normal);
 packBox(parent,name+'-pull',m.trim,b,[.2,.48,.38]);
 return strip;
}
/** Static batches only, never call while animating. Keep authored socket
 * metadata on the root rather than meshes consumed by the merge. */
export function finishPackArtwork(root:THREE.Group){
 consolidateVisualGroup(root);return root;
}
