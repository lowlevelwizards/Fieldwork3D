/** BP2 — static art helpers. Pack-local +X bodyward, +Y up, +Z right.
 * Use the shared metric fabric UVs and existing AO/merge pass. No runtime
 * physics, textures, lights or new material instances are allocated here.
 */
import * as THREE from 'three';
import {mapGarmentBoxUV} from './operator-fabric-camo-materials.ts';
import {mapBoxPixelUV} from './rendering/pixel-materials.ts';
import {bakeGearGeometryAO} from './operator-baked-gear-ao.ts';
import {ART_PIXEL} from './rendering/material-art-scale.ts';
export const PACK_DETAIL_PIXEL=ART_PIXEL;
export const PACK_DETAIL={secondary:.75*ART_PIXEL,signature:ART_PIXEL,lightStrap:ART_PIXEL,paddedStrap:1.5*ART_PIXEL,hose:.7*ART_PIXEL} as const;
export type PackCut=Readonly<{topWidth?:number;bottomWidth?:number;topDepth?:number;bottomDepth?:number}>;
export const PACK_VOLUME_RINGS=[-.5,-.32,.32,.5] as const;
export function packRing(d:number,w:number,y:number,cut:PackCut){
 const t=y>.32?(y-.32)/.18:y<-.32?(-.32-y)/.18:0;
 const widthScale=1+((y>0?(cut.topWidth??1):(cut.bottomWidth??1))-1)*t;
 const depthScale=1+((y>0?(cut.topDepth??1):(cut.bottomDepth??1))-1)*t;
 return {rear:d*.5-d*depthScale,half:w*.5*widthScale};
}
function metric(g:THREE.BoxGeometry,size:PackPoint,p:PackPoint,m:THREE.Material){
 if(m.userData.fieldworkFabric===true)mapGarmentBoxUV(g,...size,...p);
 else mapBoxPixelUV(g,...size);
 return g;
}

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
 const g=metric(new THREE.BoxGeometry(...size),size,p,m);
 bakeGearGeometryAO(g,m);
 return mesh(parent,name,g,m,p);
}
/** Authored textile volume: optional narrowed top/bottom and compressed
 * rear upper edge. Faceted, not rounded; seams/pockets remain separate. */
export function packVolume(parent:THREE.Group,name:string,m:THREE.Material,p:PackPoint,size:PackPoint,
 cut:PackCut={}){
 validate(p,size);
 const [d,h,w]=size;
 const factors=[cut.topWidth??1,cut.bottomWidth??1,cut.topDepth??1,cut.bottomDepth??1];
 if(!factors.every(n=>positive(n)&&n<=1))throw new RangeError('Invalid textile taper');
 // Four rings preserve actual broad shoulder/base facets; no accidental AO
 // replacement of the sculpt. Broad fabric faces get one lateral AO sample.
 const across=m.userData.fieldworkBakedEquipmentAO===true&&h>=6&&w>=6?2:1;
 const g=metric(new THREE.BoxGeometry(d,h,w,across,3,across),size,p,m);
 const pos=g.getAttribute('position');
 for(let i=0;i<pos.count;i++){
  const x=pos.getX(i),z=pos.getZ(i),y=pos.getY(i);
  const ring=Math.max(0,Math.min(3,Math.round((y/h+.5)*3)));
  const t=PACK_VOLUME_RINGS[ring],shape=packRing(d,w,t,cut);
  pos.setXYZ(i,shape.rear+(x/d+.5)*(d*.5-shape.rear),t*h,z*shape.half/(w*.5));
 }
 pos.needsUpdate=true;g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();
 bakeGearGeometryAO(g,m);
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
 return packBox(parent,name,m.dark,p,[.48,1.0,Math.max(1.1,width+.22)]);
}
/** Thin dark graphic strip and chunky pull, rather than individual teeth. */
export function packZipper(parent:THREE.Group,name:string,m:PackMaterials,a:PackPoint,b:PackPoint,normal:PackPoint){
 const strip=packWebbing(parent,name,m.dark,a,b,PACK_DETAIL.signature,.075,normal);
 return strip;
}
/** Static batches only, never call while animating. Keep authored socket
 * metadata on the root rather than meshes consumed by the merge. */
export function finishPackArtwork(root:THREE.Group){
 root.userData.fieldworkPackComponents=root.children.length;
 consolidateVisualGroup(root);return root;
}
