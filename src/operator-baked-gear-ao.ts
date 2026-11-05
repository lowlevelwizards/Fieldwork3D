/** Static, color/print agnostic pseudo-ambient occlusion for operator equipment.
 * A normalized 8-bit grayscale vertex attribute is baked ONCE per geometry.
 * MeshStandardMaterial multiplies it by the existing solid or SRGB camo map.
 * No additional lights, maps, render passes, geometry or draw calls. GPU
 * storage: three bytes per original vertex (vs 12-byte float vertex colors).
 * This is contact-inspired art shading, not ray-traced ambient occlusion.
 */
import * as THREE from 'three';
const AO_FLAG='fieldworkBakedEquipmentAO';
export const BAKED_GEAR_AO_MIN=.73;

/** Opt in only the wardrobe textile materials, never skin, weapon, lenses
 * or unrelated shared global materials. Cloning a material preserves userData.
 */
export function enableBakedGearAO(material:THREE.MeshStandardMaterial):void{
 if(material.userData[AO_FLAG]===true)return;
 material.userData[AO_FLAG]=true;
 material.vertexColors=true;
 material.needsUpdate=true;
}
/** For boxes, sewn bands and merged static meshes alike. UVs and maps are
 * deliberately untouched; an original geometry keeps its triangulation.
 * Local +Y is up. +X is the front of the armor/rig/pack attachment.
 */
export function bakeGearGeometryAO(
 geometry:THREE.BufferGeometry,material:THREE.Material
):THREE.BufferGeometry{
 if(material.userData[AO_FLAG]!==true||
    geometry.userData[AO_FLAG]===true)return geometry;
 const positions=geometry.getAttribute('position'),
  normals=geometry.getAttribute('normal');
 if(!positions||!normals||positions.count!==normals.count)return geometry;
 if(!geometry.boundingBox)geometry.computeBoundingBox();
 const bounds=geometry.boundingBox!;
 const height=Math.max(.001,bounds.max.y-bounds.min.y);
 const bytes=new Uint8Array(positions.count*3);
 for(let i=0;i<positions.count;i++){
  // Quiet top panels, discernible side facets and notably dark undersides.
  // The lower vertical gradient suggests overlap/contact without black seams.
  const ny=normals.getY(i),nx=normals.getX(i),nz=normals.getZ(i);
  const lower=1-THREE.MathUtils.clamp(
   (positions.getY(i)-bounds.min.y)/height,0,1);
  const shade=THREE.MathUtils.clamp(
   .955+.045*Math.max(0,ny)-.165*Math.max(0,-ny)
   -.040*Math.abs(nz)-.030*Math.max(0,-nx)
   -.052*lower,BAKED_GEAR_AO_MIN,1);
  const byte=Math.round(shade*255);
  bytes[i*3]=byte;bytes[i*3+1]=byte;bytes[i*3+2]=byte;
 }
 geometry.setAttribute('color',new THREE.Uint8BufferAttribute(bytes,3,true));
 geometry.userData[AO_FLAG]=true;
 return geometry;
}
/** Authored headwear already carries region construction tones in vertex
 * colors. Compress those darks into an AO-safe range so MARPAT/EMR etc.
 * remain legible when the vertex-color path is ON for both solids and prints.
 * Kept at geometry creation, never on a wardrobe/camo pose update.
 */
export function softenHeadwearAO(geometry:THREE.BufferGeometry):void{
 if(geometry.userData.fieldworkHeadwearAO===true)return;
 const shades=geometry.getAttribute('color'),
  normals=geometry.getAttribute('normal');
 if(!shades||!normals)return;
 for(let i=0;i<shades.count;i++){
  const original=shades.getX(i);
  const down=Math.max(0,-normals.getY(i));
  const tone=THREE.MathUtils.clamp(
   .985+(original-1)*.52-.105*down,.77,1);
  shades.setXYZ(i,tone,tone,tone);
 }
 shades.needsUpdate=true;
 geometry.userData.fieldworkHeadwearAO=true;
}
