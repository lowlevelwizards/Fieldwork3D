/** R5.5-B mobile shadow LOD: keep the scene's ONE shadow map.
 * The GPU shadow caster set changes only when a character crosses a
 * projected-size quality band or its equipment geometry is replaced.
 * Small parts retain baked AO even when their live cast is omitted.
 */
import * as THREE from 'three';
import type {GraphicsPreset} from './breach-graphics-budget.ts';

export type OperatorShadowDetail='high'|'medium'|'distant';
export function projectedOperatorHeightPx(
 camera:THREE.OrthographicCamera,viewportHeight:number,
 standingHeight=50
):number{
 return standingHeight*viewportHeight/
  Math.max(1,camera.top-camera.bottom);
}
export function operatorShadowDetail(
 height:number,preset:GraphicsPreset
):OperatorShadowDetail{
 if(preset==='performance'){
  if(height>=180)return 'medium';
  return 'distant';
 }
 if(height>=(preset==='quality'?110:125))return 'high';
 if(height>=(preset==='quality'?38:45))return 'medium';
 return 'distant';
}
export function cavityQualityForDetail(detail:OperatorShadowDetail):number{
 return detail==='high'?1:detail==='medium'?.8:.5;
}
const size=new THREE.Vector3();
const scale=new THREE.Vector3();
function visibleShadowVolume(mesh:THREE.Mesh):number{
 const geometry=mesh.geometry as THREE.BufferGeometry;
 if(!geometry.getAttribute('position'))return 0;
 if(!geometry.boundingBox)geometry.computeBoundingBox();
 if(!geometry.boundingBox)return 0;
 geometry.boundingBox.getSize(size);
 mesh.getWorldScale(scale);
 size.x*=Math.abs(scale.x);
 size.y*=Math.abs(scale.y);
 size.z*=Math.abs(scale.z);
 return size.x*size.y*size.z;
}
export type ShadowLodChange={changed:boolean;casterChanges:number};
export function applyOperatorShadowLod(
 root:THREE.Object3D,detail:OperatorShadowDetail,
 appearanceKey=String(root.userData.fieldworkLightingAppearanceKey??'')
):ShadowLodChange{
 // Every unchanged pose is O(1); never traverse dozens of static pouches
 // per rendered frame. Material AO remains in every quality tier.
 if(root.userData.fieldworkShadowLod===detail&&
  root.userData.fieldworkShadowLodAppearance===appearanceKey)
  return {changed:false,casterChanges:0};
 root.updateWorldMatrix(true,true);
 const cutoff=detail==='high'?0:detail==='medium'?20:150;
 let casterChanges=0;
 root.traverse(node=>{
  if(!(node instanceof THREE.Mesh))return;
  if(node.userData.fieldworkOriginalCastShadow===undefined)
   node.userData.fieldworkOriginalCastShadow=node.castShadow;
  const original=node.userData.fieldworkOriginalCastShadow===true;
  const next=original&&visibleShadowVolume(node)>=cutoff;
  if(node.castShadow!==next){
   node.castShadow=next;casterChanges++;
  }
 });
 root.userData.fieldworkShadowLod=detail;
 root.userData.fieldworkShadowLodAppearance=appearanceKey;
 root.userData.fieldworkCavityQuality=cavityQualityForDetail(detail);
 return {changed:true,casterChanges};
}
