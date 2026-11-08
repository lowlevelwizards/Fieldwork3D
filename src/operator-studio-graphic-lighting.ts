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
import {studioContourEligible}
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
 'hard'|'fabric'|'skin'|'matte'{
 if(source.userData.fieldworkStudioSkin===true)return 'skin';
 if(source.userData.fieldworkFabric===true||
  source.userData.fieldworkStudioSoftGear===true||
  node.userData.fieldworkStudioSoftGear===true)return 'fabric';
 return operatorRimRole(node)==='hard-shell'||
  source.userData.fieldworkSpecRim===true||source.metalness>.24?
  'hard':'matte';
}
const VARIANT_FLAG='fieldworkStudioArtOnly';
/** Inspector switches are query-only, never saved to a character or campaign. */
export type StudioGraphicDiagnostics={celAA:boolean;bakedVertexLighting:boolean};
export function requestedStudioGraphicDiagnostics(search:string):StudioGraphicDiagnostics{
 const p=new URLSearchParams(search);
 return {celAA:p.get('studioCelAA')!=='off',
  bakedVertexLighting:p.get('studioBakedLighting')!=='off'};
}
const diagnostics=()=>{
 const search=typeof window==='undefined'?'':window.location.search;
 return requestedStudioGraphicDiagnostics(search);
};
/** Toon irradiance is analytically blended only across the width of one
 * screen pixel. No texture softening: intentional camo pixels stay crisp. */
export function injectStudioCelEdgeAA(shader:{fragmentShader:string},
 enabled:boolean):boolean{
 if(!enabled)return false;
 const needle='#include <gradientmap_pars_fragment>';
 if(!shader.fragmentShader.includes(needle))return false;
 shader.fragmentShader=shader.fragmentShader.replace(needle,`
uniform float fieldworkCelCutoff;
uniform float fieldworkCelShadowTone;
vec3 getGradientIrradiance(vec3 surfaceNormal,vec3 lightDirection){
 float coord=dot(surfaceNormal,lightDirection)*.5+.5;
 float pixel=max(fwidth(coord)*.72,.0005);
 return vec3(mix(fieldworkCelShadowTone,1.0,
  smoothstep(fieldworkCelCutoff-pixel,fieldworkCelCutoff+pixel,coord)));
}
`);
 return true;
}
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
/** A planar voxel face must not turn into an entirely white slab just
 * because its normal is near-grazing. Supply per-geometry local bounds to
 * the material shader so it can keep highlights on the actual face rim.
 * No new geometry, extra draw calls, or camera-facing outline hulls. */
export function ensureStudioRimBounds(geometry:THREE.BufferGeometry):boolean{
 const position=geometry.getAttribute('position');
 if(!position||position.itemSize<3)return false;
 const min=geometry.getAttribute('fieldworkRimBoundsMin');
 const max=geometry.getAttribute('fieldworkRimBoundsMax');
 if(min?.count===position.count&&max?.count===position.count)return true;
 // Gear often merges every strap/pouch into one draw call. A single broad
 // bounds box would make those neighboring parts share false "edges".
 // Reuse the authored non-overlapping geometry spans when available.
 const spans=geometry.userData.fieldworkLightingPartSpans as
  Array<{start:number;count:number}>|undefined;
 let cursor=0;
 const valid=Array.isArray(spans)&&spans.length>0&&
  spans.every(p=>{
   if(!Number.isInteger(p.start)||!Number.isInteger(p.count)||
      p.count<=0||p.start!==cursor||
      p.start+p.count>position.count)return false;
   cursor+=p.count;return true;
  })&&cursor===position.count;
 const ranges=valid?spans!:[{start:0,count:position.count}];
 const low=new Float32Array(position.count*3);
 const high=new Float32Array(position.count*3);
 for(const range of ranges){
  let ax=Infinity,ay=Infinity,az=Infinity;
  let bx=-Infinity,by=-Infinity,bz=-Infinity;
  for(let i=range.start;i<range.start+range.count;i++){
   const x=position.getX(i),y=position.getY(i),z=position.getZ(i);
   ax=Math.min(ax,x);ay=Math.min(ay,y);az=Math.min(az,z);
   bx=Math.max(bx,x);by=Math.max(by,y);bz=Math.max(bz,z);
  }
  for(let i=range.start;i<range.start+range.count;i++){
   const j=i*3;low[j]=ax;low[j+1]=ay;low[j+2]=az;
   high[j]=bx;high[j+1]=by;high[j+2]=bz;
  }
 }
 geometry.setAttribute('fieldworkRimBoundsMin',
  new THREE.BufferAttribute(low,3));
 geometry.setAttribute('fieldworkRimBoundsMax',
  new THREE.BufferAttribute(high,3));
 return true;
}
export function injectStudioGraphicLighting(
 shader:{vertexShader:string;fragmentShader:string},
 opts:{rim:StudioLightLabSettings['rim'];hard:boolean;
 gradient:StudioLightLabSettings['gradient'];litRim?:boolean}
):void{
 const begin='#include <begin_vertex>',opaque='#include <opaque_fragment>';
 if(!shader.vertexShader.includes(begin)||!shader.fragmentShader.includes(opaque))
  return;
 const {rim,gradient,litRim=false}=opts;
 const piece=gradient==='piece'||gradient==='piece-rose';
 const violet=hasViolet(gradient);
 if(!litRim&&!violet&&!piece){
  if(rim==='hard'||rim==='pixel')injectOperatorRim(shader,rim);
  return;
 }
 const partHeader=piece?
  'attribute float fieldworkPieceHeight;\nvarying float vFWPieceHeight;\n':'';
 const partBody=piece?'vFWPieceHeight=fieldworkPieceHeight;\n':'';
 const rimVertexHeader=litRim?
  'attribute vec3 fieldworkRimBoundsMin;\n'+
  'attribute vec3 fieldworkRimBoundsMax;\n'+
  'varying vec3 vFWRimBoundsMin;\nvarying vec3 vFWRimBoundsMax;\n':'';
 const rimVertexBody=litRim?
  'vFWRimBoundsMin=fieldworkRimBoundsMin;\n'+
  'vFWRimBoundsMax=fieldworkRimBoundsMax;\n':'';
 shader.vertexShader=partHeader+rimVertexHeader+
  'varying vec3 vFWArtLocal;\nvarying float vFWArtHeight;\n'+
  shader.vertexShader.replace(begin,begin+'\nvFWArtLocal=position;\n'+
   'vFWArtHeight=(modelMatrix*vec4(position,1.0)).y;\n'+
   partBody+rimVertexBody);
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
 if(litRim){
  // R7.13: unmistakable near-white highlight WITHIN the original surface.
  // Use a high-opacity color blend, not R7.12's almost invisible 10%
  // additive cream. Still requires a grazing view, light-facing normal,
  // received direct light, and real cast-shadow visibility.
  effect+=`
   vec3 fwNormal=normalize(normal);
   vec3 fwView=normalize(vViewPosition);
   vec3 fwKey=normalize((viewMatrix*vec4(fieldworkRimKeyWorld,0.0)).xyz);
   float fwGrazing=1.0-abs(dot(fwNormal,fwView));
   float fwEdgeWidth=max(fwidth(fwGrazing)*.8,.006);
   float fwEdge=smoothstep(
    .57-fwEdgeWidth-.11*(fieldworkRimAngleLooseness-1.0),
    .72+fwEdgeWidth,fwGrazing);
   // For boxy, flat-shaded geometry the Fresnel value is identical at
   // every pixel of a face. Approximate its border by taking the second
   // smallest distance to that mesh's three local bounding-box planes:
   // one coordinate is always on the face plane, another becomes small
   // only near an actual side edge. Prevents giant white helmet slabs.
   vec3 fwBoundDist=max(vec3(0.0),min(
    vFWArtLocal-vFWRimBoundsMin,vFWRimBoundsMax-vFWArtLocal));
   float fwSmall=min(fwBoundDist.x,min(fwBoundDist.y,fwBoundDist.z));
   float fwLarge=max(fwBoundDist.x,max(fwBoundDist.y,fwBoundDist.z));
   float fwSecond=fwBoundDist.x+fwBoundDist.y+fwBoundDist.z-
    fwSmall-fwLarge;
   vec3 fwSpan=vFWRimBoundsMax-vFWRimBoundsMin;
   float fwLineWidth=clamp(min(fwSpan.x,min(fwSpan.y,fwSpan.z))*
    .10,.18,.58)*fieldworkRimWidth;
   float fwGeometricEdge=1.0-smoothstep(fwLineWidth*.40,
    fwLineWidth*1.45,fwSecond);
   fwEdge*=fwGeometricEdge;
   // A single localized, key-dependent glint travels along one edge.
   // Choose the dominant mesh axis rather than screen-pixel cells; no
   // random sparkle, halo geometry or time-driven animation.
   vec3 fwUnit=clamp((vFWArtLocal-vFWRimBoundsMin)/
    max(fwSpan,vec3(.001)),vec3(0.0),vec3(1.0));
   bool fwAlongX=fwSpan.x>=fwSpan.y&&fwSpan.x>=fwSpan.z;
   bool fwAlongZ=!fwAlongX&&fwSpan.z>=fwSpan.y;
   float fwAlong=fwAlongX?fwUnit.x:(fwAlongZ?fwUnit.z:fwUnit.y);
   float fwCross=fwAlongX?fwUnit.z:fwUnit.x;
   float fwSweep=clamp(fwKey.x*.78+fwKey.z*.22,-1.0,1.0);
   float fwCenter=clamp(.50+.33*fwSweep,.12,.88);
   float fwRadius=max(.05,fieldworkRimCoverage*.5);
   float fwTravel=1.0-smoothstep(fwRadius*.70,fwRadius*1.15,
    abs(fwAlong-fwCenter));
   // Prefer one side of a rectangular crown/receiver at a time.
   float fwChosenSide=fwSweep>=0.0?0.0:1.0;
   float fwSingleEdge=1.0-smoothstep(.20,.80,
    abs(fwCross-fwChosenSide));
   fwEdge*=fwTravel*fwSingleEdge;
   float fwFacesKey=smoothstep(
    -.10*fieldworkRimAngleLooseness,.18,dot(fwNormal,fwKey));
   float fwDirect=dot(reflectedLight.directDiffuse,vec3(.2126,.7152,.0722));
   float fwReceivedLight=smoothstep(.004,.050,fwDirect);
   float fwKeyShadow=1.0;
   #ifdef USE_SHADOWMAP
    fwKeyShadow=getShadowMask();
   #endif
   float fwLitBand=fwEdge*fwFacesKey*fwReceivedLight*
    smoothstep(.25,.75,fwKeyShadow);
   // R7.16: all three inks operate INSIDE the original depth-writing
   // surface. The cream and warm bands are never geometry offsets.
   float fwSoftWidth=fieldworkRimRole<1.5?
    fieldworkRimFabricWidth:fieldworkRimSkinWidth;
   float fwSoftOpacity=fieldworkRimRole<1.5?
    fieldworkRimFabric:fieldworkRimSkin;
   float fwSoftBacklight=fieldworkRimRole<1.5?
    fieldworkRimFabricBacklight:fieldworkRimSkinBacklight;
   // The second nearest plane picks the edge WITHIN a visible voxel face.
   // It remains bounded by the actual triangle, never extending into air.
   float fwSoftLineWidth=clamp(min(fwSpan.x,min(fwSpan.y,fwSpan.z))*
    .10,.18,.58)*fwSoftWidth;
   float fwSoftAA=max(fwidth(fwSecond)*1.1,.005);
   float fwSoftBorder=1.0-smoothstep(
    fwSoftLineWidth*.82,fwSoftLineWidth+fwSoftAA,fwSecond);
   float fwSilhouette=smoothstep(.12,.54,fwGrazing);
   // Unlike the white glint, backlit cloth is allowed on the shadow-side
   // surface (faux transmitted light). It is still gated by view slant and
   // a geometric face border, not unbounded Fresnel or bloom.
   float fwRearNormal=max(-dot(fwNormal,fwKey),0.0);
   float fwRearKey=max(-dot(fwKey,fwView),0.0);
   float fwBack=smoothstep(.06,.70,max(fwRearNormal,fwRearKey*.72));
   float fwSoftBackGate=mix(.04,1.0,
    clamp(fwBack*fwSoftBacklight,0.0,1.0));
   float fwSoftBand=fwSoftBorder*fwSilhouette*fwSoftBackGate;
   float fwStrength=fieldworkRimRole<.5?
    fwLitBand*fieldworkRimStrength:
    fwSoftBand*fwSoftOpacity;
   vec3 fwSkinTint=outgoingLight*vec3(1.28,.94,.89)+
    vec3(.19,.058,.061)*fieldworkRimSkinWarmth;
   vec3 fwTarget=fieldworkRimRole<.5?vec3(1.15):
    fieldworkRimRole<1.5?vec3(1.0,.93,.82):fwSkinTint;
   float fwMask=clamp(fwStrength,0.0,1.0);
   float fwDiagnostic=fieldworkRimRole<.5?fwLitBand:fwSoftBand;
   outgoingLight=fieldworkRimDebug>.5?
    mix(outgoingLight,vec3(fwDiagnostic),.90):
    mix(outgoingLight,fwTarget,fwMask);
  `;
 }
 const rimHeader=litRim?[
  'uniform float fieldworkRimStrength;',
  'uniform float fieldworkRimWidth;',
  'uniform float fieldworkRimCoverage;',
  'uniform float fieldworkRimAngleLooseness;',
  'uniform float fieldworkRimFabric;',
  'uniform float fieldworkRimFabricWidth;',
  'uniform float fieldworkRimFabricBacklight;',
  'uniform float fieldworkRimSkin;',
  'uniform float fieldworkRimSkinWidth;',
  'uniform float fieldworkRimSkinBacklight;',
  'uniform float fieldworkRimSkinWarmth;',
  'uniform float fieldworkRimRole;',
  'uniform float fieldworkRimDebug;',
  'uniform vec3 fieldworkRimKeyWorld;',
  ''
 ].join('\n'):'';
 const rimFragmentHeader=litRim?
  'varying vec3 vFWRimBoundsMin;\nvarying vec3 vFWRimBoundsMax;\n':'';
 const pieceFrag=piece?'varying float vFWPieceHeight;\n':'';
 shader.fragmentShader=rimHeader+rimFragmentHeader+pieceFrag+
  'varying vec3 vFWArtLocal;\nvarying float vFWArtHeight;\n'+
  shader.fragmentShader.replace(opaque,effect+opaque);
 // Three r180's MeshToon/Standard sources include shadowmap_pars_fragment
 // but NOT the separate shadowmask_pars_fragment function. Adding this
 // declaration AFTER the shadowmap structs prevents an undefined helper
 // and ensures the rim is actually hidden by the key's cast shadow.
 const shadowSource='#include <shadowmap_pars_fragment>';
 if(litRim&&shader.fragmentShader.includes(shadowSource)&&
    !shader.fragmentShader.includes('#include <shadowmask_pars_fragment>'))
  shader.fragmentShader=shader.fragmentShader.replace(shadowSource,
   shadowSource+'\n#include <shadowmask_pars_fragment>');
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
 role:'hard'|'fabric'|'skin'|'matte',useToon:boolean,litRim:boolean,
 diag:StudioGraphicDiagnostics):Variant{
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
 if(!diag.bakedVertexLighting)variant.vertexColors=false;
 variant.userData[VARIANT_FLAG]=true;
 if(litRim)
  variant.userData.fieldworkRimUniform={
   strength:{value:config.rimAmount},
   width:{value:config.rimWidth},
   coverage:{value:config.rimCoverage},
   angle:{value:config.rimAngleLooseness},
   fabric:{value:config.rimFabricOpacity},
   fabricWidth:{value:config.rimFabricWidth},
   fabricBacklight:{value:config.rimFabricBacklight},
   skin:{value:config.rimSkinOpacity},
   skinWidth:{value:config.rimSkinWidth},
   skinBacklight:{value:config.rimSkinBacklight},
   skinWarmth:{value:config.rimSkinWarmth},
   role:{value:role==='hard'?0:role==='fabric'?1:2},
   debug:{value:config.rimDebugMask?1:0},
   key:{value:new THREE.Vector3(.46,.88,.07).normalize()
    .applyAxisAngle(new THREE.Vector3(0,1,0),
     THREE.MathUtils.degToRad(config.lightAzimuth))}
  };
 if(useToon&&diag.celAA){
  variant.userData.fieldworkCelUniforms={
   cutoff:{value:config.celLow},
   tone:{value:brightness[config.celProfile].shadow}
  };
 }
 const hook=source.onBeforeCompile;
 variant.onBeforeCompile=(shader,renderer)=>{
  if(hook!==THREE.Material.prototype.onBeforeCompile)
   hook.call(source,shader,renderer);
  if(useToon&&diag.celAA&&injectStudioCelEdgeAA(shader,true)){
   const uniforms=variant.userData.fieldworkCelUniforms as
    {cutoff:{value:number};tone:{value:number}};
   shader.uniforms.fieldworkCelCutoff=uniforms.cutoff;
   shader.uniforms.fieldworkCelShadowTone=uniforms.tone;
  }
  if(litRim){
   const u=variant.userData.fieldworkRimUniform as {
    strength:{value:number};width:{value:number};
    coverage:{value:number};angle:{value:number};
    fabric:{value:number};fabricWidth:{value:number};
    fabricBacklight:{value:number};skin:{value:number};
    skinWidth:{value:number};skinBacklight:{value:number};
    skinWarmth:{value:number};role:{value:number};
    debug:{value:number};key:{value:THREE.Vector3}
   };
   shader.uniforms.fieldworkRimStrength=u.strength;
   shader.uniforms.fieldworkRimWidth=u.width;
   shader.uniforms.fieldworkRimCoverage=u.coverage;
   shader.uniforms.fieldworkRimAngleLooseness=u.angle;
   shader.uniforms.fieldworkRimFabric=u.fabric;
   shader.uniforms.fieldworkRimFabricWidth=u.fabricWidth;
   shader.uniforms.fieldworkRimFabricBacklight=u.fabricBacklight;
   shader.uniforms.fieldworkRimSkin=u.skin;
   shader.uniforms.fieldworkRimSkinWidth=u.skinWidth;
   shader.uniforms.fieldworkRimSkinBacklight=u.skinBacklight;
   shader.uniforms.fieldworkRimSkinWarmth=u.skinWarmth;
   shader.uniforms.fieldworkRimRole=u.role;
   shader.uniforms.fieldworkRimDebug=u.debug;
   shader.uniforms.fieldworkRimKeyWorld=u.key;
  }
  injectStudioGraphicLighting(shader,{
   rim:config.rim,hard:role==='hard',gradient:config.gradient,litRim
  });
 };
 variant.customProgramCacheKey=()=>[
  'fieldwork-r79',useToon?'toon'+config.toon:'standard',
  litRim?'lit-rim':'no-rim',diag.celAA?'cel-aa':'cel-hard',
  diag.bakedVertexLighting?'baked-on':'baked-off',role,
  (hasViolet(config.gradient)||config.gradient.startsWith('piece'))?
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
 const rimOn=config.rim==='dual'&&(
  config.rimAmount>0||config.rimFabricOpacity>0||config.rimSkinOpacity>0);
 const shade=config.toon!==0||hasViolet(config.gradient)||
  config.gradient==='piece'||config.gradient==='piece-rose'||rimOn||
  !diagnostics().bakedVertexLighting;
 if(!shade){
  restoreStudioGraphicLighting(root);
  return {meshes:0,materials:0,weapons:0};
 }
 const diag=diagnostics();
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
  const hardSurface=studioContourEligible(node,src);
  const role=hardSurface?'hard':studioArtRole(node,src);
  // Every material role uses the same original surface shader and the same
  // authored geometry. No BackSide shell, transparent sprite or extra pass.
  const activeInk=hardSurface?config.rimAmount>0:
   role==='fabric'?config.rimFabricOpacity>0:
   role==='skin'?config.rimSkinOpacity>0:false;
  const litRim=rimOn&&activeInk&&ensureStudioRimBounds(node.geometry);
  if(config.toon===0&&gradient==='current'&&!litRim&&
     diag.bakedVertexLighting)return;
  if((gradient==='piece'||gradient==='piece-rose')&&
     !ensureStudioPieceGradient(node.geometry))return;
  active.add(src);
  const useToon=config.toon!==0&&canToon(src);
  const key=[config.toon,gradient,role,litRim?'rim':'matte',
   diag.celAA?'edge-aa':'hard-edge',
   diag.bakedVertexLighting?'baked':'no-bake',
   useToon?'toon':'standard'].join(':');
  let variants=cache!.get(src);
  if(!variants){variants=new Map();cache!.set(src,variants);}
  let entry=variants.get(key);
  if(!entry){
   entry={signature:key,material:makeVariant(src,{...config,gradient},
    role,useToon,litRim,diag)};
   variants.set(key,entry);
  }else if(entry.material instanceof THREE.MeshToonMaterial)
   copyToon(entry.material,src);
  else syncStandard(entry.material,src);
  if(!diag.bakedVertexLighting)entry.material.vertexColors=false;
  if(litRim){
   const u=entry.material.userData.fieldworkRimUniform as
    {strength:{value:number};width:{value:number};coverage:{value:number};
     angle:{value:number};fabric:{value:number};
     fabricWidth:{value:number};fabricBacklight:{value:number};
     skin:{value:number};skinWidth:{value:number};
     skinBacklight:{value:number};skinWarmth:{value:number};
     debug:{value:number};
     key:{value:THREE.Vector3}}|undefined;
   if(u){
    u.strength.value=config.rimAmount;
    u.width.value=config.rimWidth;
    u.coverage.value=config.rimCoverage;
    u.angle.value=config.rimAngleLooseness;
    u.fabric.value=config.rimFabricOpacity;
    u.fabricWidth.value=config.rimFabricWidth;
    u.fabricBacklight.value=config.rimFabricBacklight;
    u.skin.value=config.rimSkinOpacity;
    u.skinWidth.value=config.rimSkinWidth;
    u.skinBacklight.value=config.rimSkinBacklight;
    u.skinWarmth.value=config.rimSkinWarmth;
    u.debug.value=config.rimDebugMask?1:0;
    u.key.value.set(.46,.88,.07).normalize()
     .applyAxisAngle(new THREE.Vector3(0,1,0),
      THREE.MathUtils.degToRad(config.lightAzimuth));
   }
  }
  if(useToon&&diag.celAA){
   const u=entry.material.userData.fieldworkCelUniforms as
    {cutoff:{value:number};tone:{value:number}}|undefined;
   if(u){u.cutoff.value=config.celLow;
    u.tone.value=brightness[config.celProfile].shadow;}
  }
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
 let materials=0;for(const variants of cache.values())materials+=variants.size;
 return {meshes,materials,weapons};
}
