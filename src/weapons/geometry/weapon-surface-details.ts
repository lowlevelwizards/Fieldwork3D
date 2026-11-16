/** A4.1: one shared presentation contract for low-resolution exterior ink.
 * Does not replace material/finish registry or FNC's integrated UV atlas.
 * Overlay meshes and textures are owned by the weapon and app, respectively.
 */
import * as THREE from 'three';
import {tagVisualMaterial} from '../../rendering/material-identity.ts';
/** Pixel marks are premade RGBA ink. No renderer-dependent dynamic textures. */
export function surfaceMarkTexture(data:Uint8Array,w:number,h:number,
 name:string):THREE.DataTexture{
 const map=new THREE.DataTexture(data,w,h,THREE.RGBAFormat);
 map.name='weapon-surface:'+name;
 map.colorSpace=THREE.SRGBColorSpace;
 map.wrapS=map.wrapT=THREE.ClampToEdgeWrapping;
 map.magFilter=map.minFilter=THREE.NearestFilter;
 map.generateMipmaps=false;
 map.needsUpdate=true;
 return map;
}
/** Substrate-lit opaque/transparent ink, single front-facing pass only.
 * Dedicated plane for each actual visible face; avoid DoubleSide two-pass
 * transparent rendering and back-face ghosting through the receiver.
 */
export function surfaceMarkMaterial(map:THREE.DataTexture):THREE.MeshStandardMaterial{
 const material=tagVisualMaterial(new THREE.MeshStandardMaterial({
  map,color:0xffffff,roughness:.98,metalness:0,transparent:true,
  depthWrite:false,depthTest:true,
  polygonOffset:true,polygonOffsetFactor:-1,side:THREE.FrontSide,
  flatShading:true
 }), 'paint');
 material.forceSinglePass=true;
 material.name='weapon-surface:'+map.name;
 return material;
}
export function finishSurfaceOverlay(mesh:THREE.Mesh,kind:string,
 side:'right'|'left'|'both'|'faceted'):void{
 mesh.userData.weaponPixelArt=true;
 mesh.userData.surfaceDetailKind=kind;
 mesh.userData.surfaceDetailFace=side;
 mesh.castShadow=false;mesh.receiveShadow=false;
 mesh.renderOrder=3;
}
