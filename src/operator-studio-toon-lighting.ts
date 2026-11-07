/** R7.5: Studio-only, opt-in cel shading. Preserve authored pose cavities,
 * neutral baked vertex AO and the unmodified source materials. Never silently
 * discard an unfamiliar custom shader hook just to apply a toon ramp.
 * The GPU program count depends on feature roles, not individual camo prints.
 */
import * as THREE from 'three';

export type OperatorToonBands=0|2|3;
export type OperatorRimMode='off'|'hard'|'pixel';
const stops:Readonly<Record<2|3,readonly number[]>>={
 2:[.76,1],3:[.68,.86,1]
};
const ramps=new Map<2|3,THREE.DataTexture>();
export function requestedOperatorToonBands(search:string):OperatorToonBands{
 const v=new URLSearchParams(search).get('operatorLightingToon');
 return v==='2'?2:v==='3'?3:0;
}
/** A rim is a cel-shader audition only. Without cel the approved smooth
 * material is untouched; there is no surprise second material path. */
export function requestedOperatorRimMode(search:string):OperatorRimMode{
 const v=new URLSearchParams(search).get('operatorRim');
 return v==='hard'||v==='pixel'?v:'off';
}
export function operatorToonRamp(bands:2|3):THREE.DataTexture{
 const existing=ramps.get(bands);if(existing)return existing;
 const data=new Uint8Array(bands*4);
 stops[bands].forEach((brightness,index)=>{
  const byte=Math.round(brightness*255);
  data.set([byte,byte,byte,255],index*4);
 });
 const texture=new THREE.DataTexture(data,bands,1,THREE.RGBAFormat);
 texture.name='Fieldwork R7 '+bands+'-band Studio light';
 texture.colorSpace=THREE.NoColorSpace;
 texture.magFilter=texture.minFilter=THREE.NearestFilter;
 texture.generateMipmaps=false;
 texture.needsUpdate=true;
 ramps.set(bands,texture);
 return texture;
}
type CacheKey=string;
type ToonCache=Map<THREE.MeshStandardMaterial,Map<CacheKey,THREE.MeshToonMaterial>>;
type RimRole='none'|'hard-shell';
/** Mark semantic model assemblies instead of turning every pouch edge into
 * an outline. A child can opt out by setting fieldworkRimRegion to 'none'. */
export function operatorRimRole(node:THREE.Object3D):RimRole{
 let current:THREE.Object3D|null=node;
 while(current){
  const role=current.userData.fieldworkRimRegion as RimRole|undefined;
  if(role==='hard-shell'||role==='none')return role;
  current=current.parent;
 }
 return 'none';
}
function eligible(source:THREE.MeshStandardMaterial):boolean{
 if(source.userData.fieldworkBakedEquipmentAO!==true)return false;
 // Standard Toon intentionally does not implement PBR reflection/normal
 // semantics; preserve those surfaces in their original Standard shader.
 if(source.normalMap||source.bumpMap||source.metalnessMap||
    source.roughnessMap||source.envMap)return false;
 // The existing pose cavity is a reviewed, compatible shared shader hook.
 // Any other onBeforeCompile is left completely untouched for safety.
 return source.userData.fieldworkPoseCavity==='torso'||
  source.userData.fieldworkPoseCavity==='thigh'||
  source.onBeforeCompile===THREE.Material.prototype.onBeforeCompile;
}
function copySurface(
 target:THREE.MeshToonMaterial,source:THREE.MeshStandardMaterial
):void{
 const recompile=target.map!==source.map||
  target.aoMap!==source.aoMap||target.alphaMap!==source.alphaMap||
  target.transparent!==source.transparent||
  target.vertexColors!==source.vertexColors||
  target.alphaTest!==source.alphaTest||target.side!==source.side;
 target.color.copy(source.color);
 target.map=source.map;
 target.aoMap=source.aoMap;
 target.aoMapIntensity=source.aoMapIntensity;
 target.alphaMap=source.alphaMap;
 target.opacity=source.opacity;
 target.transparent=source.transparent;
 target.alphaTest=source.alphaTest;
 target.side=source.side;
 target.depthWrite=source.depthWrite;
 target.depthTest=source.depthTest;
 target.vertexColors=source.vertexColors;
 target.emissive.copy(source.emissive);
 target.emissiveIntensity=source.emissiveIntensity;
 if(recompile)target.needsUpdate=true;
}
/** Adds block-size highlight patches to illuminated silhouette edges.
 * Only a relative change to outgoingLight: it cannot create light where
 * the existing material is dark. No outline mesh, render pass or texture.
 * Local geometry position anchors the optional pixel-step threshold so
 * it does not crawl as the camera moves.
 */
export function injectOperatorRim(
 shader:{vertexShader:string;fragmentShader:string},
 mode:Exclude<OperatorRimMode,'off'>
):void{
 const key='#include <opaque_fragment>';
 if(!shader.fragmentShader.includes(key)||
    !shader.vertexShader.includes('#include <begin_vertex>'))return;
 shader.vertexShader='varying vec3 vFWRimLocal;\n'+
  shader.vertexShader.replace('#include <begin_vertex>',
   '#include <begin_vertex>\nvFWRimLocal=position;');
 const stepping=mode==='pixel'?
  'float cell=floor((vFWRimLocal.x+vFWRimLocal.z*.35)*.45);\n'+
  'float row=floor(vFWRimLocal.y*.55);\n'+
  'float stagger=mod(cell+row,3.0);\n'+
  'float threshold=mix(.56,.69,step(.5,stagger));\n':
  'float threshold=.61;\n';
 const code='float fwFacing=abs(dot(normalize(normal),'+
  'normalize(vViewPosition)));\n'+
  'float fwEdge=pow(1.0-clamp(fwFacing,0.0,1.0),2.0);\n'+
  stepping+
  'float fwHighlight=step(threshold,fwEdge);\n'+
  'outgoingLight*=1.0+0.17*fwHighlight;\n';
 shader.fragmentShader='varying vec3 vFWRimLocal;\n'+
  shader.fragmentShader.replace(key,code+key);
}
function makeToon(source:THREE.MeshStandardMaterial,bands:2|3,
 rim:OperatorRimMode):THREE.MeshToonMaterial{
 const material=new THREE.MeshToonMaterial({
  color:source.color.clone(),map:source.map,vertexColors:source.vertexColors,
  aoMap:source.aoMap,aoMapIntensity:source.aoMapIntensity,
  alphaMap:source.alphaMap,alphaTest:source.alphaTest,
  opacity:source.opacity,transparent:source.transparent,
  side:source.side,depthWrite:source.depthWrite,
  depthTest:source.depthTest,gradientMap:operatorToonRamp(bands),
  emissive:source.emissive.clone(),
  emissiveIntensity:source.emissiveIntensity,fog:source.fog
 });
 material.userData.fieldworkStudioToonOnly=true;
 const cavity=source.userData.fieldworkPoseCavity;
 const hasCavity=cavity==='torso'||cavity==='thigh';
 if(hasCavity||rim!=='off'){
  const sourceHook=hasCavity?source.onBeforeCompile:null;
  material.onBeforeCompile=(shader,renderer)=>{
   if(sourceHook)sourceHook.call(source,shader,renderer);
   if(rim!=='off')injectOperatorRim(shader,rim);
  };
  material.customProgramCacheKey=()=> 'fieldwork-r7-toon-'+bands+
   '-cavity-'+(hasCavity?cavity:'none')+'-rim-'+rim;
 }
 return material;
}
function restoreMeshes(root:THREE.Object3D):void{
 root.traverse(node=>{
  if(!(node instanceof THREE.Mesh)||Array.isArray(node.material))return;
  const original=node.userData.fieldworkStudioToonOriginal as
   THREE.MeshStandardMaterial|undefined;
  if(!original)return;
  if(node.material instanceof THREE.MeshToonMaterial&&
     node.material.userData.fieldworkStudioToonOnly)node.material=original;
  delete node.userData.fieldworkStudioToonOriginal;
 });
}
/** Disposing a rig must not leak cached alternative toon programs. */
export function disposeOperatorStudioToon(root:THREE.Object3D):void{
 restoreMeshes(root);
 const cache=root.userData.fieldworkStudioToonCache as ToonCache|undefined;
 if(cache)for(const variants of cache.values())
  for(const target of variants.values())target.dispose();
 delete root.userData.fieldworkStudioToonCache;
}
export function applyOperatorStudioToon(
 root:THREE.Object3D,bands:OperatorToonBands,
 rimMode:OperatorRimMode='off'
):{meshes:number;materials:number}{
 if(!bands){restoreMeshes(root);return {meshes:0,materials:0};}
 let cache=root.userData.fieldworkStudioToonCache as ToonCache|undefined;
 if(!cache){
  cache=new Map();
  root.userData.fieldworkStudioToonCache=cache;
 }
 let meshes=0;
 root.traverseVisible(node=>{
  if(!(node instanceof THREE.Mesh)||Array.isArray(node.material))return;
  const original=node.userData.fieldworkStudioToonOriginal as
   THREE.MeshStandardMaterial|undefined;
  const source=node.material instanceof THREE.MeshStandardMaterial?
   node.material:original;
  if(!(source instanceof THREE.MeshStandardMaterial)||!eligible(source)){
   if(original&&node.material!==source)node.material=source??node.material;
   delete node.userData.fieldworkStudioToonOriginal;
   return;
  }
  const rim:OperatorRimMode=operatorRimRole(node)==='hard-shell'?
   rimMode:'off';
  const key=bands+':'+rim;
  let variants=cache!.get(source);
  if(!variants){variants=new Map();cache!.set(source,variants);}
  let target=variants.get(key);
  if(!target){
   target=makeToon(source,bands,rim);
   variants.set(key,target);
  }else copySurface(target,source);
  node.userData.fieldworkStudioToonOriginal=source;
  node.material=target;
  meshes++;
 });
 let materials=0;
 for(const variants of cache.values())materials+=variants.size;
 return {meshes,materials};
}
