/** R7.19: weapon-only surface glints. Helmet shells, helmet covers, metal
 * fittings on headwear, and non-weapon equipment rely on the approved
 * three-band cel shading instead. No additional outline geometry or pass.
 */
import * as THREE from 'three';

export function studioContourEligible(
 mesh:THREE.Mesh,source:THREE.MeshStandardMaterial
):boolean{
 if(source.userData.fieldworkStudioHelmetShellCover===true||
    source.userData.fieldworkFabric===true||
    source.userData.fieldworkStudioSoftGear===true||
    source.userData.fieldworkStudioSkin===true)return false;
 if(source.transparent||source.opacity<.999||source.alphaTest>0||
    !source.depthWrite||source.side===THREE.DoubleSide)return false;
 if(!mesh.geometry.getAttribute('normal'))return false;
 let node:THREE.Object3D|null=mesh;
 while(node){
  // The authored headwear group explicitly owns helmet shell identity.
  // Reject the entire assembly, including metal brackets and accessories.
  if(node.userData.fieldworkStudioBareShellMaterial!==undefined)return false;
  if(node.userData.fieldworkWeaponPresentation===true)return true;
  node=node.parent;
 }
 // Metal buckles and other gear do not inherit a weapon's highlight.
 return false;
}
