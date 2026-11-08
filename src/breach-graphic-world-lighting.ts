/** R7.18: three broad graphic steps on existing tactical architecture.
 * No cloned meshes, no replacement materials, no extra draw calls, and no
 * changes to dynamic opacity/visibility, shadows or existing pixel art.
 * An opt-out (?lighting=legacy) is retained for comparative performance QA.
 *
 * Architectural MeshStandardMaterial remains authoritative. Operator rigs
 * use the richer shared Studio graphic shader and independent white glints.
 */
import * as THREE from 'three';

const FLAG='fieldworkR718WorldGraphic';
const vertexHeader='varying float vFWGraphicHeight;\n';
const vertexHeight='vFWGraphicHeight=(modelMatrix*vec4(position,1.0)).y;\n';
export const WORLD_GRAPHIC_FRAGMENT=`
 // R7.18: sun orientation matches the Studio key and its three cel tiers.
 // Quantizing the diffuse contribution rather than replacing materials keeps
 // room darkness, authored paint, lightmaps and atmospheric shadow control.
 vec3 fwWorldKey=normalize((viewMatrix*
  vec4(.462,.884,.070,0.0)).xyz);
 float fwWorldFace=clamp(dot(normalize(normal),fwWorldKey)*.5+.5,0.0,1.0);
 float fwWorldBand=fwWorldFace<.60?.43:fwWorldFace<.86?.72:1.14;
 reflectedLight.directDiffuse*=fwWorldBand/max(.36,fwWorldFace);
 reflectedLight.indirectDiffuse*=mix(.80,1.07,
  step(.86,fwWorldFace));
 // Slightly stronger dusty-rose height tint; no saturated pink wash.
 float fwWorldLower=1.0-smoothstep(.05,39.0,vFWGraphicHeight);
 vec3 fwWorldRose=mix(vec3(1.0),vec3(.975,.926,.941),
  fwWorldLower*.50);
 reflectedLight.directDiffuse*=fwWorldRose*(1.0-.205*fwWorldLower);
 reflectedLight.indirectDiffuse*=fwWorldRose*(1.0-.205*fwWorldLower);
`;
/** Mutate shader hooks only once per unique existing Standard material.
 * This also includes instanced meshes, preserving their batching. */
export function enableWorldGraphicMaterial(material:THREE.Material):boolean{
 if(!(material instanceof THREE.MeshStandardMaterial)||
   material.userData[FLAG]===true||
   material.transparent||material.opacity<.999||
   material.alphaTest>0||!material.depthWrite)return false;
 const original=material.onBeforeCompile;
 const previousKey=material.customProgramCacheKey.bind(material);
 material.onBeforeCompile=(shader,renderer)=>{
  original.call(material,shader,renderer);
  const begin='#include <begin_vertex>';
  const lights='#include <lights_fragment_end>';
  if(!shader.vertexShader.includes(begin)||
     !shader.fragmentShader.includes(lights))return;
  shader.vertexShader=vertexHeader+
   shader.vertexShader.replace(begin,begin+'\n'+vertexHeight);
  shader.fragmentShader='varying float vFWGraphicHeight;\n'+
   shader.fragmentShader.replace(lights,lights+'\n'+WORLD_GRAPHIC_FRAGMENT);
 };
 material.customProgramCacheKey=()=>previousKey()+':r718-world-3-band-rose';
 material.userData[FLAG]=true;
 material.needsUpdate=true;
 return true;
}
export function applyWorldGraphicLighting(root:THREE.Object3D):{
 meshes:number;materials:number
}{
 const unique=new Set<THREE.Material>();
 let meshes=0,materials=0;
 root.traverse(node=>{
  if(!(node instanceof THREE.Mesh))return;
  const list=Array.isArray(node.material)?node.material:[node.material];
  for(const m of list)if(m&&!unique.has(m)){
   unique.add(m);
   if(enableWorldGraphicMaterial(m))materials++;
  }
  meshes++;
 });
 return {meshes,materials};
}
