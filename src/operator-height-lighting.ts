/** R5.4-A: shared root-relative operator brightness, never per-item height.
 * At outfit changes this bakes one grayscale multiplier onto existing 8-bit
 * lighting vertices. Every animation frame thereafter is a constant-time
 * stamp check, so no pose-time CPU raycasting or texture allocation.
 */
import * as THREE from 'three';
export const OPERATOR_HEIGHT_REFERENCE=50;
/** Smooth continuous piecewise gradient for an operator in rest-pose units.
 * Higher parts are brighter; no pouch, strap, boot or jacket restarts it.
 */
const STOPS:readonly (readonly [number,number])[]=[
 [0,.82],[.20,.86],[.45,.92],[.70,.97],[1,1]
];
export function operatorHeightBrightness(height:number):number{
 const h=THREE.MathUtils.clamp(height/OPERATOR_HEIGHT_REFERENCE,0,1);
 for(let i=1;i<STOPS.length;i++){
  const [x1,y1]=STOPS[i], [x0,y0]=STOPS[i-1];
  if(h>x1)continue;
  const q=THREE.MathUtils.clamp((h-x0)/(x1-x0),0,1);
  return y0+(y1-y0)*q*q*(3-2*q);
 }
 return 1;
}
export type HeightLightingResult={meshes:number;vertices:number;cached:boolean};
/** Caller must supply the complete operator root, including torso/hip/arms.
 * Stable bind/first-appearance positions avoid shadows sliding with gait.
 * No UV/color-tint mutation, additional shaders or draw calls.
 */
export function applyOperatorHeightLighting(root:THREE.Object3D,
 stamp:string):HeightLightingResult{
 if(root.userData.fieldworkHeightRootKey===stamp)
  return {meshes:0,vertices:0,cached:true};
 root.updateWorldMatrix(true,true);
 const toRoot=root.matrixWorld.clone().invert();
 const sample=new THREE.Vector3();
 const seen=new Set<THREE.BufferGeometry>();
 let meshes=0,vertices=0;
 root.traverse(node=>{
  if(!(node instanceof THREE.Mesh)||Array.isArray(node.material)||
    !node.material.userData.fieldworkBakedEquipmentAO)return;
  let parent:THREE.Object3D|null=node;
  while(parent){
   if(!parent.visible)return;
   if(parent===root)break;
   parent=parent.parent;
  }
  const geometry=node.geometry as THREE.BufferGeometry;
  if(seen.has(geometry))return;
  seen.add(geometry);
  const positions=geometry.getAttribute('position');
  const colors=geometry.getAttribute('color');
  if(!positions||!colors||colors.itemSize!==3||
   !(colors.array instanceof Uint8Array)||!colors.normalized||
   positions.count!==colors.count)return;
  const samples=colors.array as Uint8Array;
  const sourceKey=String(geometry.userData.fieldworkCrossLightKey??'base');
  let baseline=geometry.userData.fieldworkHeightBaseline as Uint8Array|undefined;
  if(!baseline||baseline.length!==samples.length||
    geometry.userData.fieldworkHeightSourceKey!==sourceKey){
   baseline=new Uint8Array(samples);
   geometry.userData.fieldworkHeightBaseline=baseline;
   geometry.userData.fieldworkHeightSourceKey=sourceKey;
  }
  // Recompose strictly from the ungraded baseline on each costume change.
  const transform=toRoot.clone().multiply(node.matrixWorld);
  for(let i=0;i<positions.count;i++){
   sample.fromBufferAttribute(positions,i).applyMatrix4(transform);
   const factor=operatorHeightBrightness(sample.y);
   for(let c=0;c<3;c++)
    samples[i*3+c]=Math.round(Math.max(.55,
     baseline[i*3+c]/255*factor)*255);
   vertices++;
  }
  colors.needsUpdate=true;
  meshes++;
 });
 root.userData.fieldworkHeightRootKey=stamp;
 return {meshes,vertices,cached:false};
}
