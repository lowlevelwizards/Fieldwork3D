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
import {synchronizeStudioContours,disposeStudioContours}
 from './operator-studio-rim-contour.ts';

type Source=THREE.MeshStandardMaterial;
type Variant=THREE.MeshStandardMaterial|THREE.MeshToonMaterial;
type VariantState={signature:string;material:Variant};
type Cache=Map<Source,Map<string,VariantState>>;
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
/** Nearest authored IK zone wins. Exclude arms and thighs, but permit the
 * explicitly marked hands/gloves, shins and boots; all independent gear is
 * otherwise eligible. No world-Y guesses or shared material exclusions. */
export function studioPieceGradientEligible(node:THREE.Object3D):boolean{
 let current:THREE.Object3D|null=node;
 while(current){
  const role=current.userData.fieldworkStudioHeightRole;
  if(role==='exclude')return false;
  if(role==='include')return true;
  current=current.parent;
 }
 return true;
}

/** Local Y=0 is each independent mesh's lowest vertex, not the
 * operator's feet. Every individual pouch, rig component, helmet plate,
 * glove, boot and gun part receives its own complete gradient. The
 * attribute is cached once per existing rig geometry, not per frame. */
export function ensureStudioPieceGradient(geometry:THREE.BufferGeometry):boolean{
 const position=geometry.getAttribute('position');
 if(!position||position.itemSize<3)return false;
 const existing=geometry.getAttribute('fieldworkPieceHeight');
 if(existing&&existing.count===position.count)return true;
 // consolidateVisualGroup retains these spans in vertex order. Use their
 // bounds to preserve one gradient PER ORIGINAL POUCH/PANEL even if all share
 // one material and are merged into a single iOS-friendly draw call.
 const spans=geometry.userData.fieldworkLightingPartSpans as
  Array<{start:number;count:number}>|undefined;
 const valid=Array.isArray(spans)&&spans.length>0&&
  spans.every(part=>Number.isInteger(part.start)&&
   Number.isInteger(part.count)&&part.count>0&&part.start>=0&&
   part.start+part.count<=position.count);
 const ranges=valid?spans!:[{start:0,count:position.count}];
 const values=new Float32Array(position.count);
 for(const span of ranges){
  let low=Infinity,high=-Infinity;
  for(let i=span.start;i<span.start+span.count;i++){
   const y=position.getY(i);
   low=Math.min(low,y);high=Math.max(high,y);
  }
  const height=high-low;
  for(let i=span.start;i<span.start+span.count;i++)
   values[i]=height>0.001?
    THREE.MathUtils.clamp((position.getY(i)-low)/height,0,1):.5;
 }
 geometry.setAttribute('fieldworkPieceHeight',
  new THREE.BufferAttribute(values,1));
 return true;
}
export function injectStudioGraphicLighting(
 shader:{vertexShader:string;fragmentShader:string},
 opts:{rim:StudioLightLabSettings['rim'];hard:boolean;
 gradient:StudioLightLabSettings['gradient']}
):void{
 const begin='#include <begin_vertex>',opaque='#include <opaque_fragment>';
 if(!shader.vertexShader.includes(begin)||!shader.fragmentShader.includes(opaque))
  return;
 const {rim,gradient}=opts;
 const piece=gradient==='piece'||gradient==='piece-rose';
 const violet=hasViolet(gradient);
 if((rim==='off'||rim==='hard'||rim==='pixel')&&!violet&&!piece){
  if(rim==='hard'||rim==='pixel')injectOperatorRim(shader,rim);
  return;
 }
 const partHeader=piece?
  'attribute float fieldworkPieceHeight;\nvarying float vFWPieceHeight;\n':'';
 const partBody=piece?'vFWPieceHeight=fieldworkPieceHeight;\n':'';
 shader.vertexShader=partHeader+
  'varying vec3 vFWArtLocal;\nvarying float vFWArtHeight;\n'+
  shader.vertexShader.replace(begin,begin+'\nvFWArtLocal=position;\n'+
   'vFWArtHeight=(modelMatrix*vec4(position,1.0)).y;\n'+partBody);
 let effect='';
 if(piece){
  // Reweighted luminance, never a strong violet wash. The dusty variant
  // introduces only a low-saturation gray-rose shift at the lower edge.
  effect+=
   'float fwPieceLower=1.0-smoothstep(.05,.96,vFWPieceHeight);\n'+
   'outgoingLight*=1.0-.19*fwPieceLower;\n';
  if(gradient==='piece-rose')effect+=
   'outgoingLight*=mix(vec3(1.0),vec3(.98,.935,.945),'+
   'fwPieceLower*.44);\n';
 }else if(violet){
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
  // R7.11 draws a selective expanded-backface contour for eligible shells,
  // never projected pixel cells or shiny fragments on broad cloth surfaces.
 }else if(rim==='hard'||rim==='pixel'){
  injectOperatorRim(shader,rim);
 }
 const rimHeader='';
 const pieceFrag=piece?'varying float vFWPieceHeight;\n':'';
 shader.fragmentShader=rimHeader+pieceFrag+
  'varying vec3 vFWArtLocal;\nvarying float vFWArtHeight;\n'+
  shader.fragmentShader.replace(opaque,effect+opaque);
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
/** Sync wardrobe/weapon material mutations without replacing this composed
 * shader or accumulating a new clone on every pose update. */
function syncStandard(target:THREE.MeshStandardMaterial,source:Source):void{
 const recompile=target.map!==source.map||target.aoMap!==source.aoMap||
  target.alphaMap!==source.alphaMap||target.normalMap!==source.normalMap||
  target.metalnessMap!==source.metalnessMap||target.roughnessMap!==source.roughnessMap||
  target.vertexColors!==source.vertexColors;
 target.color.copy(source.color);
 target.map=source.map;target.vertexColors=source.vertexColors;
 target.aoMap=source.aoMap;target.aoMapIntensity=source.aoMapIntensity;
 target.lightMap=source.lightMap;target.lightMapIntensity=source.lightMapIntensity;
 target.alphaMap=source.alphaMap;target.alphaTest=source.alphaTest;
 target.normalMap=source.normalMap;target.bumpMap=source.bumpMap;
 target.metalnessMap=source.metalnessMap;target.roughnessMap=source.roughnessMap;
 target.metalness=source.metalness;target.roughness=source.roughness;
 target.emissive.copy(source.emissive);
 target.emissiveIntensity=source.emissiveIntensity;
 target.emissiveMap=source.emissiveMap;
 target.opacity=source.opacity;target.side=source.side;
 target.depthWrite=source.depthWrite;target.depthTest=source.depthTest;
 if(recompile)target.needsUpdate=true;
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
  config.rim,role,(hasViolet(config.gradient)||config.gradient==='piece')?
   config.gradient:'normal',
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
 disposeStudioContours(root);
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
 const shade=config.toon!==0||hasViolet(config.gradient)||
  config.gradient==='piece'||config.gradient==='piece-rose';
 const rimOn=config.rim==='dual'&&config.rimAmount>0;
 if(!shade){
  restoreStudioGraphicLighting(root);
  const contour=synchronizeStudioContours(root,rimOn,config.rimAmount);
  return {meshes:contour.meshes,materials:0,weapons:contour.weaponMeshes};
 }
 restoreStudioGraphicLighting(root);
 let cache=root.userData.fieldworkStudioArtCache as Cache|undefined;
 if(!cache){cache=new Map();root.userData.fieldworkStudioArtCache=cache;}
 if(config.toon)updateStudioCelRamp(config.toon,config.celProfile,
  config.celLow,config.celHigh);
 let meshes=0,weapons=0;
 const active=new Set<Source>(),activeVariants=new Set<Variant>();
 root.traverseVisible(node=>{
  if(!(node instanceof THREE.Mesh)||Array.isArray(node.material)||
     node.userData.fieldworkStudioContourOverlay===true)return;
  const src=original(node);
  if(!src||!isSafeSurface(src))return;
  if(!config.allSurfaces&&src.userData.fieldworkBakedEquipmentAO!==true)
   return;
  const gradient=(config.gradient==='piece'||
   config.gradient==='piece-rose')&&!studioPieceGradientEligible(node)?
   'current':config.gradient;
  if((gradient==='piece'||gradient==='piece-rose')&&
     !ensureStudioPieceGradient(node.geometry))return;
  active.add(src);
  const role=studioArtRole(node,src);
  const useToon=config.toon!==0&&canToon(src);
  const key=[config.toon,gradient,role,
   useToon?'toon':'standard'].join(':');
  let variants=cache!.get(src);
  if(!variants){variants=new Map();cache!.set(src,variants);}
  let entry=variants.get(key);
  if(!entry){
   entry={signature:key,material:makeVariant(src,{...config,gradient},
    role,useToon)};
   variants.set(key,entry);
  }else if(entry.material instanceof THREE.MeshToonMaterial)
   copyToon(entry.material,src);
  else syncStandard(entry.material,src);
  activeVariants.add(entry.material);
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
 for(const [src,variants] of cache){
  for(const [key,entry] of variants)
   if(!active.has(src)||!activeVariants.has(entry.material)){
    entry.material.dispose();
    variants.delete(key);
   }
  if(!variants.size)cache.delete(src);
 }
 const contour=synchronizeStudioContours(root,rimOn,config.rimAmount);
 let materials=0;for(const variants of cache.values())materials+=variants.size;
 return {meshes,materials,weapons:weapons+contour.weaponMeshes};
}
