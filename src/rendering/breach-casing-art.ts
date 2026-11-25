/** One low-poly shared casing mesh; per-instance proportions/finish. */
import * as THREE from 'three';
import type {EjectedCasing} from '../breach-effects.ts';
export function createCasingGeometry():THREE.BufferGeometry{
 // Rectangular silhouette, closed box with no hollow interior or rim mesh.
 const g=new THREE.BoxGeometry(1.10,2.18,1.10);
 return g;
}
/** One flat painted base band, no extra vertices, materials or draw calls.
 * Compose with the shared graphic lighting shader rather than replacing it. */
export function applyCasingBaseFinish(material:THREE.MeshStandardMaterial):void{
 const prior=material.onBeforeCompile;
 const key=material.customProgramCacheKey.bind(material);
 const brass=new THREE.Color(0x987342);
 const rgb=[brass.r,brass.g,brass.b].map(x=>x.toFixed(5)).join(',');
 material.onBeforeCompile=(shader,renderer)=>{
  prior.call(material,shader,renderer);
  const begin='#include <begin_vertex>',color='#include <color_fragment>';
  shader.vertexShader='varying float vCasingY;\n'+shader.vertexShader.replace(begin,begin+'\nvCasingY=position.y;');
  shader.fragmentShader='varying float vCasingY;\n'+shader.fragmentShader.replace(color,
   color+'\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3('+rgb+'),1.0-smoothstep(-.82,-.76,vCasingY));');
 };
 material.customProgramCacheKey=()=>key()+':v20-casing-base';
}
export function casingVisualProfile(c:Pick<EjectedCasing,'weapon'|'secondaryWeapon'>){
 // V21: restore ~18% of V20 visual dimensions; retain category proportions.
 if(c.weapon==='shotgun')return {width:1.32,length:1.65,color:0xa57858};
 if(c.secondaryWeapon||c.weapon==='smg')return {width:.85,length:.77,color:0xb38d59};
 if(c.weapon==='rifle')return {width:.91,length:1.43,color:0xb38d59};
 return {width:.85,length:1.24,color:0xb38d59};
}
