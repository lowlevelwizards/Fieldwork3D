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
   .985+.015*Math.max(0,ny)-.105*Math.max(0,-ny)
   -.028*Math.abs(nz)-.018*Math.max(0,-nx)
   -.055*lower,BAKED_GEAR_AO_MIN,1);
  const byte=Math.round(shade*255);
  bytes[i*3]=byte;bytes[i*3+1]=byte;bytes[i*3+2]=byte;
 }
 geometry.setAttribute('color',new THREE.Uint8BufferAttribute(bytes,3,true));
 geometry.userData[AO_FLAG]=true;
 return geometry;
}
/** Local-space contact AO for an assembly of rigid, unmerged equipment pieces.
 *
 * Unlike orientation-only shading, this compares the physical bounding
 * volumes of neighboring plates, pouch bodies/flaps, straps and packs.
 * It creates no texture, decal, new mesh, or frame-time work. A small
 * normalized vertex-color multiplier remains identical for every camo/solid.
 *
 * Call BEFORE one-material mesh consolidation, and again only for newly
 * regenerated fitted connectors. Once a geometry has been processed it
 * carries a stable stamp so later wardrobe selections don't double-darken.
 */
/** A ray toward the studio key from a receiver point. Real directional
 * projection onto the receiving surface, independent of material/camo.
 * Unlike nearest-volume AO, this detects the actual shadow ray crossing
 * the occluder's 3D bounding slab.
 */
function castRayBox(p:THREE.Vector3,dir:THREE.Vector3,
 box:THREE.Box3,maxDist=1.85):boolean{
 let near=0,far=maxDist;
 for(const axis of ['x','y','z'] as const){
  const d=dir[axis],o=p[axis];
  if(Math.abs(d)<1e-7){
   if(o<box.min[axis]||o>box.max[axis])return false;
   continue;
  }
  const low=(box.min[axis]-o)/d,high=(box.max[axis]-o)/d;
  near=Math.max(near,Math.min(low,high));
  far=Math.min(far,Math.max(low,high));
  if(near>far)return false;
 }
 return near>.035&&far>.045;
}
const KEY_RAYS=[
 new THREE.Vector3(.46,.88,.07).normalize(),
 new THREE.Vector3(.43,.90,.03).normalize(),
 new THREE.Vector3(.47,.88,.04).normalize()
] as const;
// Narrow seams, not a diffuse two-and-a-half-unit shadow halo.
export const GEAR_CONTACT_AO_RADIUS=.95;
export const GEAR_CONTACT_AO_STRENGTH=.46;
export const GEAR_CONTACT_AO_FLOOR=.62;
type ContactPart={
 mesh:THREE.Mesh;local:THREE.Matrix4;normalMatrix:THREE.Matrix3;
 box:THREE.Box3;center:THREE.Vector3;partId:string;
};
export function bakeGearContactAO(group:THREE.Group):number{
 const candidates=group.children.filter((node):node is THREE.Mesh=>
  node instanceof THREE.Mesh&&!Array.isArray(node.material)&&
  !!node.geometry.getAttribute('position')&&
  node.geometry.getAttribute('position').count>0);
 if(candidates.length<2)return 0;
 // This happens only during geometry construction / a change of fitted top.
 group.updateWorldMatrix(true,true);
 const inverse=new THREE.Matrix4().copy(group.matrixWorld).invert();
 const parts:ContactPart[]=candidates.map(mesh=>{
  if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();
  const local=new THREE.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld);
  const box=mesh.geometry.boundingBox!.clone().applyMatrix4(local);
  const partId=String(mesh.userData.fieldworkShadowPartId??mesh.uuid);
  return {mesh,local,normalMatrix:new THREE.Matrix3().getNormalMatrix(local),
   box,center:box.getCenter(new THREE.Vector3()),partId};
 });
 const p=new THREE.Vector3(),n=new THREE.Vector3(),
  rayOrigin=new THREE.Vector3();
 let touched=0;
 for(const part of parts){
  if(Array.isArray(part.mesh.material))continue;
  const material=part.mesh.material;
  if(material.userData[AO_FLAG]!==true)continue;
  const geo=part.mesh.geometry;
  if(geo.userData.fieldworkContactAO===true)continue;
  bakeGearGeometryAO(geo,material);
  const attr=geo.getAttribute('color'),positions=geo.getAttribute('position'),
   normals=geo.getAttribute('normal');
  if(!attr||!positions||!normals)continue;
  const pixels=attr.array;
  if(!(pixels instanceof Uint8Array))continue;
  let altered=false;
  // R5.2-A: never confound a pouch's OWN folds with unrelated gear.
  // These independent 8-bit CPU masks are resolved before mesh batching.
  const selfMask=new Uint8Array(positions.count);
  const externalMask=new Uint8Array(positions.count);
  // Save one neutral byte per receiving vertex, before & after CONTACT.
  // Texture-atlas experiments need this to REPLACE self AO rather than
  // multiply self AO twice. It does not affect the default renderer.
  const contactBase=new Uint8Array(positions.count);
  const contactComposed=new Uint8Array(positions.count);
  for(let i=0;i<positions.count;i++){
   contactBase[i]=pixels[i*3];
   p.fromBufferAttribute(positions,i).applyMatrix4(part.local);
   n.fromBufferAttribute(normals,i).applyMatrix3(part.normalMatrix).normalize();
   let selfOcclusion=0,externalOcclusion=0;
   for(const neighbor of parts){
    if(neighbor===part)continue;
    const box=neighbor.box;
    // Broad phase: no interaction beyond this actual contact radius.
    const dx=p.x<box.min.x?box.min.x-p.x:p.x>box.max.x?p.x-box.max.x:0;
    const dy=p.y<box.min.y?box.min.y-p.y:p.y>box.max.y?p.y-box.max.y:0;
    const dz=p.z<box.min.z?box.min.z-p.z:p.z>box.max.z?p.z-box.max.z:0;
    const sq=dx*dx+dy*dy+dz*dz;
    if(sq>=GEAR_CONTACT_AO_RADIUS*GEAR_CONTACT_AO_RADIUS)continue;
    const cx=neighbor.center.x-p.x,cy=neighbor.center.y-p.y,
     cz=neighbor.center.z-p.z;
    // Never darken an exposed face because some gear is behind it.
    const toward=n.x*cx+n.y*cy+n.z*cz;
    if(toward<=.015)continue;
    const length=Math.hypot(cx,cy,cz);
    const facing=length>.001?Math.min(1,toward/length):0;
    if(facing<.12)continue;
    const proximity=1-Math.sqrt(sq)/GEAR_CONTACT_AO_RADIUS;
    const strength=GEAR_CONTACT_AO_STRENGTH*proximity*
     (.32+.68*facing);
    if(neighbor.partId===part.partId)
     selfOcclusion=Math.max(selfOcclusion,strength);
    else externalOcclusion=Math.max(externalOcclusion,strength);
   }
   // Bake cast shadows ON the base panel under projecting pockets and
   // straps. Three rays create a cheap fixed-light soft penumbra; never
   // sample this from a light or raycaster during gameplay.
   rayOrigin.copy(p).addScaledVector(n,.05);
   let ownHits=0,externalHits=0;
   for(const light of KEY_RAYS){
    if(n.dot(light)<.035)continue;
    let own=false,external=false;
    for(const neighbor of parts){
     if(neighbor===part||!castRayBox(rayOrigin,light,neighbor.box))
      continue;
     if(neighbor.partId===part.partId)own=true;
     else external=true;
     if(own&&external)break;
    }
    if(own)ownHits++;
    if(external)externalHits++;
   }
   const selfShadow=Math.max(selfOcclusion,.46*ownHits/KEY_RAYS.length);
   const externalShadow=Math.max(externalOcclusion,
    .46*externalHits/KEY_RAYS.length);
   selfMask[i]=Math.round(255*THREE.MathUtils.clamp(selfShadow,0,1));
   externalMask[i]=Math.round(255*THREE.MathUtils.clamp(externalShadow,0,1));
   // Compose once from the strongest independent shadow, rather than
   // multiplying overlapping AO, self and external cast darkness.
   const shadow=Math.max(selfShadow,externalShadow);
   if(shadow<.012){
    contactComposed[i]=pixels[i*3];continue;
   }
   const old=pixels[i*3]/255;
   const gray=Math.round(255*Math.max(GEAR_CONTACT_AO_FLOOR,
    old*(1-shadow)));
   contactComposed[i]=gray;
   if(gray===pixels[i*3])continue;
   pixels[i*3]=gray;pixels[i*3+1]=gray;pixels[i*3+2]=gray;
   altered=true;
  }
  geo.userData.fieldworkSelfOcclusionMask=selfMask;
  geo.userData.fieldworkExternalOcclusionMask=externalMask;
  geo.userData.fieldworkContactBaseTone=contactBase;
  geo.userData.fieldworkContactComposedTone=contactComposed;
  if(altered){attr.needsUpdate=true;touched++;}
  geo.userData.fieldworkContactAO=true;
 }
 return touched;
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
