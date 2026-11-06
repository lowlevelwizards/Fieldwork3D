/** R5.4-B: Studio-only, strictly opt-in directional banding experiment.
 * No extra shadow passes, no geometry changes and no gameplay integration.
 * Every operator's cloth/gear shares the same two or three band ramp.
 */
import * as THREE from 'three';

export type OperatorToonBands=0|2|3;
const stops:Readonly<Record<2|3,readonly number[]>>={
 2:[.76,1],3:[.68,.86,1]
};
const ramps=new Map<2|3,THREE.DataTexture>();
export function requestedOperatorToonBands(search:string):OperatorToonBands{
 const v=new URLSearchParams(search).get('operatorLightingToon');
 return v==='2'?2:v==='3'?3:0;
}
export function operatorToonRamp(bands:2|3):THREE.DataTexture{
 const existing=ramps.get(bands);if(existing)return existing;
 const data=new Uint8Array(bands*4);
 stops[bands].forEach((brightness,index)=>{
  const byte=Math.round(brightness*255);
  data.set([byte,byte,byte,255],index*4);
 });
 const texture=new THREE.DataTexture(data,bands,1,THREE.RGBAFormat);
 texture.name='Fieldwork R5 experimental '+bands+'-band studio light';
 texture.colorSpace=THREE.NoColorSpace;
 texture.magFilter=texture.minFilter=THREE.NearestFilter;
 texture.generateMipmaps=false;
 texture.needsUpdate=true;
 ramps.set(bands,texture);
 return texture;
}
type ToonCache=Map<THREE.MeshStandardMaterial,THREE.MeshToonMaterial>;
function copySurface(
 target:THREE.MeshToonMaterial,source:THREE.MeshStandardMaterial
):void{
 const textureChanged=target.map!==source.map||
  target.aoMap!==source.aoMap||target.alphaMap!==source.alphaMap;
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
 if(textureChanged)target.needsUpdate=true;
}
export function applyOperatorStudioToon(
 root:THREE.Object3D,bands:OperatorToonBands
):{meshes:number;materials:number}{
 if(!bands)return {meshes:0,materials:0};
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
  const source=original??node.material;
  if(!(source instanceof THREE.MeshStandardMaterial)||
     source.userData.fieldworkBakedEquipmentAO!==true)return;
  let target=cache!.get(source);
  if(!target){
   target=new THREE.MeshToonMaterial({
    color:source.color.clone(),map:source.map,vertexColors:source.vertexColors,
    aoMap:source.aoMap,aoMapIntensity:source.aoMapIntensity,
    alphaMap:source.alphaMap,alphaTest:source.alphaTest,
    opacity:source.opacity,transparent:source.transparent,
    side:source.side,depthWrite:source.depthWrite,
    depthTest:source.depthTest,
    gradientMap:operatorToonRamp(bands),
    emissive:source.emissive.clone(),
    emissiveIntensity:source.emissiveIntensity,
    fog:source.fog
   });
   target.userData.fieldworkStudioToonOnly=true;
   cache!.set(source,target);
  }else{
   copySurface(target,source);
  }
  node.userData.fieldworkStudioToonOriginal=source;
  node.material=target;
  meshes++;
 });
 return {meshes,materials:cache.size};
}
