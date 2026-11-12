/** R7.18: three broad graphic steps on existing tactical architecture.
 * No cloned meshes, no replacement materials, no extra draw calls, and no
 * changes to dynamic opacity/visibility, shadows or existing pixel art.
 * An opt-out (?lighting=legacy) is retained for comparative performance QA.
 *
 * Architectural MeshStandardMaterial remains authoritative. Operator rigs
 * use the richer shared Studio graphic shader and independent white glints.
 */
import * as THREE from 'three';
import {GRAPHIC_LIGHT_PROFILE as G} from './rendering/graphic-lighting-profile.ts';

const FLAG='fieldworkR718WorldGraphic';
const vertexHeader='varying float vFWGraphicHeight;\n';
const vertexHeight='vFWGraphicHeight=(modelMatrix*vec4(position,1.0)).y;\n';
const glsl=(x:number)=>x.toFixed(3);
export const WORLD_GRAPHIC_FRAGMENT=`
 // F1: one key and band scale with Studio, but preserve Standard materials.
 vec3 fwWorldKey=normalize((viewMatrix*vec4(${G.keyDirection.map(glsl).join(',')},0.0)).xyz);
 float fwWorldFace=clamp(dot(normalize(normal),fwWorldKey)*.5+.5,0.0,1.0);
 // Screen-pixel antialiasing removes hard shimmering without blurring textures.
 float fwWorldAA=max(fwidth(fwWorldFace)*.70,.0005);
 float fwWorldLow=smoothstep(${glsl(G.lowCutoff)}-fwWorldAA,
   ${glsl(G.lowCutoff)}+fwWorldAA,fwWorldFace);
 float fwWorldHigh=smoothstep(${glsl(G.highCutoff)}-fwWorldAA,
   ${glsl(G.highCutoff)}+fwWorldAA,fwWorldFace);
 float fwWorldBand=mix(mix(${glsl(G.levels.shadow)},
   ${glsl(G.levels.mid)},fwWorldLow),${glsl(G.levels.light)},fwWorldHigh);
 reflectedLight.directDiffuse*=fwWorldBand/max(.36,fwWorldFace);
 // Indirect light is restrained to keep the graphic shadow band sculptural.
 reflectedLight.indirectDiffuse*=mix(${glsl(G.indirectShadow)},
   ${glsl(G.indirectLight)},fwWorldHigh);
 float fwWorldLower=1.0-smoothstep(.05,39.0,vFWGraphicHeight);
 vec3 fwWorldRose=mix(vec3(1.0),vec3(.975,.926,.941),
   fwWorldLower*.50);
 reflectedLight.directDiffuse*=fwWorldRose*(1.0-${glsl(G.lowerWorldShade)}*fwWorldLower);
 reflectedLight.indirectDiffuse*=fwWorldRose*(1.0-${glsl(G.lowerWorldShade)}*fwWorldLower);
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
 material.customProgramCacheKey=()=>previousKey()+':f1-world-3-band-edge-aa';
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
