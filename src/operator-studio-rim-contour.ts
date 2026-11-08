/** R7.12: eligibility only. No silhouette hull or transparent glow meshes.
 * The key-lit glimmer now lives on the original surface in the material
 * shader. Keep the strict weapon/metal/uncovered-helmet policy from R7.11.
 */
import * as THREE from 'three';

export function studioContourEligible(
 mesh:THREE.Mesh,source:THREE.MeshStandardMaterial
):boolean{
 // A fitted ballistic helmet cover belongs to the helmet SHELL family,
 // not the rejected generic clothing/gear/skin highlight family.
 const shellCover=source.userData.fieldworkStudioHelmetShellCover===true;
 if(!shellCover&&(source.userData.fieldworkFabric===true||
    source.userData.fieldworkStudioSoftGear===true||
    source.userData.fieldworkStudioSkin===true))return false;
 if(source.transparent||source.opacity<.999||source.alphaTest>0||
    !source.depthWrite||source.side===THREE.DoubleSide)return false;
 if(!mesh.geometry.getAttribute('normal'))return false;
 if(shellCover)return true;
 let node:THREE.Object3D|null=mesh;
 while(node){
  // A helmet with a fitted/loose textile cover never gets a pale highlight.
  // Identity must match the authored bare shell, not a group-wide tag.
  if(node.userData.fieldworkStudioBareShellMaterial!==undefined)
   return node.userData.fieldworkStudioBareShellMaterial===source;
  if(node.userData.fieldworkWeaponPresentation===true)return true;
  node=node.parent;
 }
 return source.userData.fieldworkSpecRim===true||source.metalness>=.18;
}
