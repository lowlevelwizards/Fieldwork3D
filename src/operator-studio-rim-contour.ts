/** R7.11 Studio-only selective silhouette contour.
 * One shared translucent backface hull material per operator, and only a
 * second draw for explicitly eligible hard-surface meshes. Unlike R7.9's
 * object-space random cells, backface extrusion follows the *real projected
 * outer outline* of helmets, receivers, barrels, magazines and metal.
 * No scene-wide post pass, no outlines on cloth, skin or soft pouches.
 */
import * as THREE from 'three';

export function studioContourEligible(
 mesh:THREE.Mesh,source:THREE.MeshStandardMaterial
):boolean{
 if(source.userData.fieldworkFabric===true)return false;
 if(source.transparent||source.opacity<.999||source.alphaTest>0||
    !source.depthWrite||source.side===THREE.DoubleSide)return false;
 if(!mesh.geometry.getAttribute('normal'))return false;
 let node:THREE.Object3D|null=mesh;
 while(node){
  // Only the ACTUAL helmet-shell material, not rails, cover or straps.
  if(node.userData.fieldworkStudioBareShellMaterial!==undefined){
   return node.userData.fieldworkStudioBareShellMaterial===source;
  }
  if(node.userData.fieldworkWeaponPresentation===true)return true;
  node=node.parent;
 }
 return source.userData.fieldworkSpecRim===true||source.metalness>=.18;
}
type OverlayMesh=THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>;
function outlineMaterial(root:THREE.Object3D):THREE.MeshBasicMaterial{
 let material=root.userData.fieldworkStudioContourMaterial as
  THREE.MeshBasicMaterial|undefined;
 if(material)return material;
 material=new THREE.MeshBasicMaterial({
  color:0xf4ede4,side:THREE.BackSide,transparent:true,
  opacity:.10,depthTest:true,depthWrite:false,
  toneMapped:false,fog:false
 });
 material.name='R7.11 subtle metallic silhouette stripe';
 material.onBeforeCompile=shader=>{
  // True outer contour from an expanded backface hull. No flat-face paint,
  // pixel islands or face-normal lighting can appear in the interior.
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
   '#include <begin_vertex>\ntransformed += normalize(normal) * 0.32;');
 };
 material.customProgramCacheKey=()=> 'fieldwork-r711-silhouette-backface-v1';
 root.userData.fieldworkStudioContourMaterial=material;
 return material;
}
function drop(mesh:THREE.Mesh):void{
 const overlay=mesh.userData.fieldworkStudioContourMesh as
  OverlayMesh|undefined;
 if(!overlay)return;
 mesh.remove(overlay);
 delete mesh.userData.fieldworkStudioContourMesh;
}
export function removeStudioContours(root:THREE.Object3D):void{
 root.traverse(node=>{
  if(node instanceof THREE.Mesh&&
     node.userData.fieldworkStudioContourMesh)drop(node);
 });
}
export function disposeStudioContours(root:THREE.Object3D):void{
 removeStudioContours(root);
 const material=root.userData.fieldworkStudioContourMaterial as
  THREE.MeshBasicMaterial|undefined;
 material?.dispose();
 delete root.userData.fieldworkStudioContourMaterial;
}
/** Called after source-material restoration on every Studio preview update.
 * The original mesh and its shared geometry remain untouched. */
export function synchronizeStudioContours(
 root:THREE.Object3D,enabled:boolean,amount:number
):{meshes:number}{
 if(!enabled||amount<=0){
  removeStudioContours(root);
  return {meshes:0};
 }
 const material=outlineMaterial(root);
 material.opacity=THREE.MathUtils.clamp(amount,0,.20);
 const eligible=new Set<THREE.Mesh>();
 root.traverseVisible(node=>{
  if(!(node instanceof THREE.Mesh)||Array.isArray(node.material)||
     node.userData.fieldworkStudioContourOverlay===true)return;
  const source=(node.userData.fieldworkStudioArtOriginal??
   node.material) as THREE.MeshStandardMaterial;
  if(!(source instanceof THREE.MeshStandardMaterial)||
     !studioContourEligible(node,source))return;
  eligible.add(node);
  let overlay=node.userData.fieldworkStudioContourMesh as
   OverlayMesh|undefined;
  if(!overlay){
   overlay=new THREE.Mesh(node.geometry as THREE.BufferGeometry,material);
   overlay.name='fieldwork-studio-selective-rim';
   overlay.userData.fieldworkStudioContourOverlay=true;
   overlay.castShadow=false;overlay.receiveShadow=false;
   overlay.frustumCulled=node.frustumCulled;
   node.add(overlay);
   node.userData.fieldworkStudioContourMesh=overlay;
  }
  overlay.geometry=node.geometry as THREE.BufferGeometry;
  overlay.visible=true;
 });
 root.traverse(node=>{
  if(node instanceof THREE.Mesh&&
     node.userData.fieldworkStudioContourMesh&&!eligible.has(node))drop(node);
 });
 return {meshes:eligible.size};
}
