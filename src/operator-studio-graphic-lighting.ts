/** R7.9: Studio-only, single-pass graphic lighting audition.
 * Opaque Standard / compatible Toon only. This module never touches tactical
 * simulation, material source ownership, UVs, shadows, collision or saved kit.
 * A single mutable 128-step gradient ramp per band count adjusts live cutoff
 * values without recompiling a distinct program for every slider position.
 */
import * as THREE from 'three';
import type {StudioLightLabSettings,StudioCelProfile}
 from './operator-studio-light-lab.ts';
import {operatorRimRole,injectOperatorRim}
 from './operator-studio-toon-lighting.ts';

type Source=THREE.MeshStandardMaterial;
type Variant=THREE.MeshStandardMaterial|THREE.MeshToonMaterial;
type VariantState={signature:string;material:Variant};
type Cache=Map<Source,Map<'hard'|'warm',VariantState>>;
const ramps=new Map<2|3,THREE.DataTexture>();
const rampKeys=new Map<2|3,string>();
const brightness:Record<StudioCelProfile,
 {shadow:number;mid:number;light:number}>={
 classic:{shadow:.68,mid:.86,light:1},
 soft:{shadow:.77,mid:.92,light:1},
 hard:{shadow:.53,mid:.80,light:1},
 graphic:{shadow:.43,mid:.74,light:1}
};
export function updateStudioCelRamp(
 bands:2|3,style:StudioCelProfile,low:number,high:number
):THREE.DataTexture{
 const shadow=Math.max(.3,Math.min(.9,low));
 const highlight=Math.max(shadow+.06,Math.min(.97,high));
 const key=[bands,style,shadow.toFixed(2),highlight.toFixed(2)].join(':');
 let ramp=ramps.get(bands);
 if(!ramp){
  const pixels=new Uint8Array(128*4);
  ramp=new THREE.DataTexture(pixels,128,1,THREE.RGBAFormat);
  ramp.name='Fieldwork R7.9 shared editable '+bands+'-band light';
  ramp.colorSpace=THREE.NoColorSpace;
  ramp.magFilter=ramp.minFilter=THREE.NearestFilter;
  ramp.generateMipmaps=false;
  ramps.set(bands,ramp);
 }
 if(rampKeys.get(bands)===key)return ramp;
 const data=ramp.image.data as Uint8Array,levels=brightness[style];
 for(let i=0;i<128;i++){
  const n=(i+.5)/128;
  const intensity=bands===2?(n<shadow?levels.shadow:levels.light):
   n<shadow?levels.shadow:n<highlight?levels.mid:levels.light;
  const v=Math.round(intensity*255),index=i*4;
  data[index]=data[index+1]=data[index+2]=v;
  data[index+3]=255;
 }
 ramp.needsUpdate=true;
 rampKeys.set(bands,key);
 return ramp;
}
function original(node:THREE.Mesh):Source|null{
 const cached=node.userData.fieldworkStudioArtOriginal as Source|undefined;
 if(cached)return cached;
 return node.material instanceof THREE.MeshStandardMaterial?node.material:null;
}
function isSafeSurface(m:Source):boolean{
 return !m.transparent&&m.opacity>=.999&&m.alphaTest===0&&
  m.depthWrite&&m.side!==THREE.DoubleSide;
}
/** Role assignment is geometry-led so textile fabric and weapon metal never
 * acquire identical specular accents simply because they share a material. */
export function studioArtRole(node:THREE.Object3D,source:Source):
 'hard'|'warm'{
 return operatorRimRole(node)==='hard-shell'||
  source.userData.fieldworkSpecRim===true||source.metalness>.24?
  'hard':'warm';
}
const VARIANT_FLAG='fieldworkStudioArtOnly';
const hasViolet=(profile:StudioLightLabSettings['gradient'])=>
 profile==='violet'||profile==='violet-noir';
export function injectStudioGraphicLighting(
 shader:{vertexShader:string;fragmentShader:string},
 opts:{rim:StudioLightLabSettings['rim'];hard:boolean;
 gradient:StudioLightLabSettings['gradient']}
):void{
 const begin='#include <begin_vertex>',opaque='#include <opaque_fragment>';
 if(!shader.vertexShader.includes(begin)||!shader.fragmentShader.includes(opaque))
  return;
 const {rim,hard,gradient}=opts;
 if((rim==='off'||rim==='hard'||rim==='pixel')&&!hasViolet(gradient)){
  if(rim==='hard'||rim==='pixel')injectOperatorRim(shader,rim);
  return;
 }
 // World-height is evaluated at the mesh vertex so the violet fade does not
 // reset at every belt/pouch or at the weapon's own local bounding box.
 shader.vertexShader='varying vec3 vFWArtLocal;\nvarying float vFWArtHeight;\n'+
  shader.vertexShader.replace(begin,
   begin+'\nvFWArtLocal=position;\n'+
   'vFWArtHeight=(modelMatrix*vec4(position,1.0)).y;');
 let effect='';
 if(hasViolet(gradient)){
  const noir=gradient==='violet-noir';
  effect+=
   'float fwLower=1.0-smoothstep(3.0,39.0,vFWArtHeight);\n'+
   'outgoingLight=mix(outgoingLight,'+
   (noir?
    'outgoingLight*vec3(.36,.33,.78)+vec3(.014,.007,.064),fwLower*.90':
    'outgoingLight*vec3(.49,.46,.86)+vec3(.025,.015,.065),fwLower*.76')+
   ');\n';
 }
 if(rim==='dual'){
  // Large object-anchored cells rather than screen-space noise. Warm rim
  // outlines nearly every opaque surface; white projected key accents are
  // reserved for metallic / helmet / plate / firearm hard-shell regions.
  effect+=
   'float fwFacing=abs(dot(normalize(normal),normalize(vViewPosition)));\n'+
   'float fwEdge=1.0-clamp(fwFacing,0.0,1.0);\n'+
   'vec3 fwCells=floor(vFWArtLocal/3.3);\n'+
   'float fwPattern=fract(dot(fwCells,vec3(.357,.619,.173)));\n'+
   'float fwWarm=step(.38,fwEdge)*step(.22,fwPattern);\n'+
   'outgoingLight=mix(outgoingLight,vec3(1.03,.79,.56),fwWarm*.58);\n';
  if(hard){
   effect+=
    'vec3 fwKey=normalize((viewMatrix*vec4('+
     'vec3(.46,.88,.07),0.0)).xyz);\n'+
    'float fwProjected=smoothstep(-.35,.30,dot(normalize(normal),fwKey));\n'+
    'float fwWhite=step(.58,fwEdge)*step(.40,fwPattern)*fwProjected;\n'+
    'outgoingLight=mix(outgoingLight,vec3(1.36,1.35,1.24),fwWhite*.90);\n';
  }
 }else if(rim==='hard'||rim==='pixel'){
  // Legacy R7 variants remain available with their original silhouette.
  injectOperatorRim(shader,rim);
 }
 shader.fragmentShader='varying vec3 vFWArtLocal;\n'+
  'varying float vFWArtHeight;\n'+shader.fragmentShader.replace(opaque,effect+opaque);
}
function copyToon(target:THREE.MeshToonMaterial,source:Source):void{
 const mapChanged=target.map!==source.map||target.aoMap!==source.aoMap||
  target.alphaMap!==source.alphaMap||target.vertexColors!==source.vertexColors;
 target.color.copy(source.color);
 target.map=source.map;target.aoMap=source.aoMap;
 target.aoMapIntensity=source.aoMapIntensity;
 target.lightMap=source.lightMap;target.lightMapIntensity=source.lightMapIntensity;
 target.alphaMap=source.alphaMap;
 target.alphaTest=source.alphaTest;target.vertexColors=source.vertexColors;
 target.emissive.copy(source.emissive);
 target.emissiveIntensity=source.emissiveIntensity;
 target.emissiveMap=source.emissiveMap;
 target.depthWrite=source.depthWrite;target.depthTest=source.depthTest;
 target.side=source.side;target.fog=source.fog;
 if(mapChanged)target.needsUpdate=true;
}
function canToon(m:Source):boolean{
 // Keep physically specialized materials and unsupported shader behavior on
 // the Standard shader, while still allowing warm/white rim and violet fade.
 return !m.normalMap&&!m.bumpMap&&!m.roughnessMap&&
  !m.metalnessMap&&!m.envMap;
}
function makeVariant(source:Source,config:StudioLightLabSettings,
 role:'hard'|'warm',useToon:boolean):Variant{
 let variant:Variant;
 if(useToon){
  variant=new THREE.MeshToonMaterial({
   color:source.color.clone(),map:source.map,
   vertexColors:source.vertexColors,aoMap:source.aoMap,
   aoMapIntensity:source.aoMapIntensity,
   lightMap:source.lightMap,lightMapIntensity:source.lightMapIntensity,
   alphaMap:source.alphaMap,alphaTest:source.alphaTest,
   depthWrite:source.depthWrite,depthTest:source.depthTest,
   side:source.side,fog:source.fog,
   emissive:source.emissive.clone(),emissiveIntensity:source.emissiveIntensity,
   emissiveMap:source.emissiveMap,
   gradientMap:updateStudioCelRamp(config.toon as 2|3,
    config.celProfile,config.celLow,config.celHigh)
  });
 }else variant=source.clone();
 variant.userData[VARIANT_FLAG]=true;
 const hook=source.onBeforeCompile;
 variant.onBeforeCompile=(shader,renderer)=>{
  if(hook!==THREE.Material.prototype.onBeforeCompile)
   hook.call(source,shader,renderer);
  injectStudioGraphicLighting(shader,{
   rim:config.rim,hard:role==='hard',gradient:config.gradient
  });
 };
 variant.customProgramCacheKey=()=>[
  'fieldwork-r79',useToon?'toon'+config.toon:'standard',
  config.rim,role,hasViolet(config.gradient)?config.gradient:'normal',
  source.customProgramCacheKey()
 ].join(':');
 return variant;
}
export function restoreStudioGraphicLighting(root:THREE.Object3D):void{
 root.traverse(node=>{
  if(!(node instanceof THREE.Mesh)||Array.isArray(node.material))return;
  const src=node.userData.fieldworkStudioArtOriginal as Source|undefined;
  if(!src)return;
  if(node.material?.userData?.[VARIANT_FLAG]===true)node.material=src;
  delete node.userData.fieldworkStudioArtOriginal;
 });
}
export function disposeStudioGraphicLighting(root:THREE.Object3D):void{
 restoreStudioGraphicLighting(root);
 const cache=root.userData.fieldworkStudioArtCache as Cache|undefined;
 if(cache)for(const variants of cache.values())
  for(const entry of variants.values())entry.material.dispose();
 delete root.userData.fieldworkStudioArtCache;
}
/** Every UI change is safe to replay over the same posed operator. */
export function applyStudioGraphicLighting(root:THREE.Object3D,
 config:StudioLightLabSettings
):{meshes:number;materials:number;weapons:number}{
 const effect=config.toon!==0||config.rim!=='off'||hasViolet(config.gradient);
 if(!effect){restoreStudioGraphicLighting(root);
  return {meshes:0,materials:0,weapons:0};}
 restoreStudioGraphicLighting(root);
 let cache=root.userData.fieldworkStudioArtCache as Cache|undefined;
 if(!cache){cache=new Map();root.userData.fieldworkStudioArtCache=cache;}
 if(config.toon)updateStudioCelRamp(config.toon,config.celProfile,
  config.celLow,config.celHigh);
 let meshes=0,weapons=0;
 const active=new Set<Source>();
 root.traverseVisible(node=>{
  if(!(node instanceof THREE.Mesh)||Array.isArray(node.material))return;
  const src=original(node);
  if(!src||!isSafeSurface(src))return;
  if(!config.allSurfaces&&src.userData.fieldworkBakedEquipmentAO!==true)
   return;
  active.add(src);
  const role=studioArtRole(node,src);
  const useToon=config.toon!==0&&canToon(src);
  const key=[config.toon,config.rim,config.gradient,role,
   useToon?'toon':'standard'].join(':');
  let variants=cache!.get(src);
  if(!variants){variants=new Map();cache!.set(src,variants);}
  let entry=variants.get(role);
  if(!entry||entry.signature!==key){
   entry?.material.dispose();
   entry={signature:key,material:makeVariant(src,config,role,useToon)};
   variants.set(role,entry);
  }else if(entry.material instanceof THREE.MeshToonMaterial)
   copyToon(entry.material,src);
  else{
   // Keep authored color, textures and material parameters current while
   // retaining the one cached Standard shader instance per source/role.
   entry.material.color.copy(src.color);
   entry.material.map=src.map;
   entry.material.emissive.copy(src.emissive);
   entry.material.emissiveIntensity=src.emissiveIntensity;
  }
  node.userData.fieldworkStudioArtOriginal=src;
  node.material=entry.material;
  meshes++;
  let ancestor:THREE.Object3D|null=node;
  while(ancestor&&ancestor!==root){
   if(ancestor.userData.fieldworkWeaponPresentation){weapons++;break;}
   ancestor=ancestor.parent;
  }
 });
 // Dropped/replaced magazine and gun materials need not survive forever.
 for(const [src,variants] of cache)
  if(!active.has(src)){
   for(const entry of variants.values())entry.material.dispose();
   cache.delete(src);
  }
 let materials=0;for(const variants of cache.values())materials+=variants.size;
 return {meshes,materials,weapons};
}
