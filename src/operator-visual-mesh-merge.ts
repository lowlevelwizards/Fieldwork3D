/** Combine rigid, single-material parts after kit construction.
 * Preserves category visibility and all simulation transforms, while reducing
 * draw calls on iOS. Dynamic magazine slots and articulated limbs stay separate.
 */
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {bakeGearGeometryAO,bakeGearContactAO} from './operator-baked-gear-ao.ts';
import {rememberUnmergedShadowVolumes} from './operator-baked-gear-cast.ts';
import {refineStaticReceiver} from './operator-gear-shadow-receivers.ts';

export const OPERATOR_LIGHTING_MASK_KEYS=[
 'fieldworkSelfOcclusionMask','fieldworkExternalOcclusionMask',
 'fieldworkContactBaseTone','fieldworkContactComposedTone'
] as const;
export type LightingPieceSpan={partId:string;role:string;start:number;count:number};
/** The renderer merges identical-material geometry into one draw call. UserData
 * does NOT survive mergeGeometries(), so retain each logical piece's baked
 * grayscale channels in vertex-order CPU arrays for atlas work/inspection.
 * When an indexed mesh becomes non-indexed, duplicate its mask using the
 * actual index buffer: never trust the original vertex order.
 */
export function transferLightingMasksToMerge(
 output:THREE.BufferGeometry,
 originals:readonly THREE.Mesh[],
 transformed:readonly THREE.BufferGeometry[]
):void{
 const count=output.getAttribute('position')?.count??0;
 if(!count||originals.length!==transformed.length)return;
 const partSpans:LightingPieceSpan[]=[];
 let cursor=0;
 for(let i=0;i<originals.length;i++){
  const mesh=originals[i];
  const vertices=transformed[i].getAttribute('position')?.count??0;
  partSpans.push({
   partId:String(mesh.userData.fieldworkShadowPartId??
    mesh.name??'piece-'+i),
   role:String(mesh.userData.fieldworkShadowRole??'surface'),
   start:cursor,count:vertices
  });
  cursor+=vertices;
 }
 if(cursor!==count)return;
 // Pure CPU metadata. No new vertex attributes, samplers or draw calls.
 output.userData.fieldworkLightingPartSpans=partSpans;
 for(const key of OPERATOR_LIGHTING_MASK_KEYS){
  if(!originals.some(mesh=>
   mesh.geometry.userData[key] instanceof Uint8Array))continue;
  const result=new Uint8Array(count);
  let offset=0;
  for(let i=0;i<originals.length;i++){
   const geo=originals[i].geometry;
   const sourceMask=geo.userData[key] as Uint8Array|undefined;
   const originalCount=geo.getAttribute('position')?.count??0;
   const newCount=transformed[i].getAttribute('position')?.count??0;
   if(sourceMask?.length===originalCount){
    if(newCount===originalCount)
     result.set(sourceMask,offset);
    else if(geo.index?.count===newCount)
     for(let j=0;j<newCount;j++)
      result[offset+j]=sourceMask[geo.index.getX(j)];
   }
   offset+=newCount;
  }
  output.userData[key]=result;
 }
}
export function consolidateVisualGroup(group:THREE.Group):void{
 // Only the large, STATIC armor/rig receiver families need extra sampling.
 // Never subdivide animated garment limbs or unsupported accessories.
 if(group.name.startsWith('authored-rig-')||
   group.parent?.name.startsWith('authored-armor-'))
  refineStaticReceiver(group);
 // Bake actual neighboring-volume contact before authored panels and pouch
 // flaps are merged. One-time CPU work only; no per-frame AO traversal.
 bakeGearContactAO(group);
 rememberUnmergedShadowVolumes(group);
 const buckets=new Map<THREE.Material,THREE.Mesh[]>();
 for(const item of group.children){
  // Preserve per-mesh attribute parity in the existing iOS draw-call merge.
  if(item instanceof THREE.Mesh&&!Array.isArray(item.material))
   bakeGearGeometryAO(item.geometry,item.material);
  if(!(item instanceof THREE.Mesh)||item.children.length||
    Array.isArray(item.material)||item.userData.armorCompressible||
    item.userData.armorContactShell||item.userData.keepSeparate)continue;
  const bucket=buckets.get(item.material)??[];
  bucket.push(item);buckets.set(item.material,bucket);
 }
 for(const [material,meshes] of buckets){
  if(meshes.length<2)continue;
  // Armor uses both extruded (non-indexed) and box (indexed) faces.
  // Normalize that *one-time* mismatch instead of silently forfeiting
  // batching when both kinds share a material.
  const mixedIndex=meshes.some(mesh=>mesh.geometry.index===null)&&
   meshes.some(mesh=>mesh.geometry.index!==null);
  const geometryParts=meshes.map(item=>{
   item.updateMatrix();
   const source=item.geometry.clone().applyMatrix4(item.matrix);
   if(!mixedIndex||source.index===null)return source;
   const flat=source.toNonIndexed();
   source.dispose();
   return flat;
  });
  const combined=mergeGeometries(geometryParts,false);
  if(combined)transferLightingMasksToMerge(combined,meshes,geometryParts);
  for(const source of geometryParts)source.dispose();
  if(!combined)continue;
  for(const part of meshes){
   group.remove(part);
   part.geometry.dispose();
  }
  const mesh=new THREE.Mesh(combined,material);
  mesh.castShadow=true;mesh.receiveShadow=true;
  group.add(mesh);
 }
}
