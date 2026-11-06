/** R5.6-A: read-only mask statistics. No raycasts, GPU readbacks, new
 * textures or geometry mutations. Called ONLY by the opt-in Studio overlay.
 */
import * as THREE from 'three';
import {operatorHeightBrightness} from './operator-height-lighting.ts';
export type LightingChannel='self'|'external'|'contact'|'directional';
export type LightingChannelStats={
 samples:number;shadowed:number;max:number;mean:number
};
export type OperatorLightingReport={
 meshes:number;uniqueGeometries:number;vertices:number;
 logicalParts:number;maskBytes:number;
 channels:Record<LightingChannel,LightingChannelStats>
};
const FIELDS:Readonly<Record<LightingChannel,string>>={
 self:'fieldworkSelfOcclusionMask',
 external:'fieldworkExternalOcclusionMask',
 contact:'fieldworkInterContactMask',
 directional:'fieldworkDirectionalCastMask'
};
const empty=():LightingChannelStats=>({
 samples:0,shadowed:0,max:0,mean:0
});
export function inspectOperatorLighting(
 root:THREE.Object3D|null):OperatorLightingReport{
 const channels={
  self:empty(),external:empty(),contact:empty(),directional:empty()
 };
 const report:OperatorLightingReport={
  meshes:0,uniqueGeometries:0,vertices:0,logicalParts:0,maskBytes:0,
  channels
 };
 if(!root)return report;
 const seen=new Set<THREE.BufferGeometry>();
 const sums:Record<LightingChannel,number>={
  self:0,external:0,contact:0,directional:0
 };
 root.traverseVisible(node=>{
  if(!(node instanceof THREE.Mesh))return;
  report.meshes++;
  const geometry=node.geometry as THREE.BufferGeometry;
  if(seen.has(geometry))return;
  seen.add(geometry);
  report.uniqueGeometries++;
  const count=geometry.getAttribute('position')?.count??0;
  report.vertices+=count;
  const spans=geometry.userData.fieldworkLightingPartSpans as
   readonly {start:number;count:number}[]|undefined;
  report.logicalParts+=spans?.length??(count>0?1:0);
  for(const channel of Object.keys(FIELDS) as LightingChannel[]){
   const mask=geometry.userData[FIELDS[channel]];
   if(!(mask instanceof Uint8Array)||mask.length!==count)continue;
   const stats=channels[channel];
   stats.samples+=mask.length;
   report.maskBytes+=mask.byteLength;
   for(const v of mask){
    if(v>0)stats.shadowed++;
    if(v>stats.max)stats.max=v;
    sums[channel]+=v;
   }
  }
 });
 for(const channel of Object.keys(FIELDS) as LightingChannel[]){
  const stats=channels[channel];
  stats.mean=stats.samples>0?sums[channel]/stats.samples:0;
 }
 return report;
}
export function formatOperatorLightingReport(r:OperatorLightingReport):string{
 const lines=[
  'OPERATOR LIGHTING R5 / DEBUG',
  'Visible meshes: '+r.meshes+' | Geometries: '+r.uniqueGeometries,
  'Vertices: '+r.vertices+' | Logical parts: '+r.logicalParts,
  'CPU mask memory: '+(r.maskBytes/1024).toFixed(1)+' KiB'
 ];
 for(const name of Object.keys(r.channels) as LightingChannel[]){
  const s=r.channels[name];
  lines.push(name.padEnd(11)+' '+
   s.shadowed+'/'+s.samples+' shaded, max '+s.max+
   ', mean '+s.mean.toFixed(1));
 }
 return lines.join('\n');
}

/** Debug-only layer isolation preview. The source geometry is retained
 * byte-for-byte in a WeakMap, with precise restoration on reset and before
 * each wardrobe rebuild. Real lighting remains the authority outside debug.
 * Separate passes can overlap, so layer removal is an ARTISTIC DIAGNOSTIC,
 * not a reconstructed physical irradiance solution.
 */
export type LightingDiagnosticLayers={
 self:boolean;external:boolean;contact:boolean;
 directional:boolean;height:boolean
};
export const DEFAULT_LIGHTING_LAYERS:Readonly<LightingDiagnosticLayers>={
 self:true,external:true,contact:true,directional:true,height:true
};
type PreviewBaseline={colors:Uint8Array;appliedVersion:number};
const originals=new WeakMap<THREE.BufferGeometry,PreviewBaseline>();
const previewChannels=['self','external','contact','directional'] as const;
const inverse=new THREE.Matrix4(),transform=new THREE.Matrix4(),
 point=new THREE.Vector3();
const isDefault=(layers:LightingDiagnosticLayers)=>
 Object.keys(DEFAULT_LIGHTING_LAYERS).every(k=>
  layers[k as keyof LightingDiagnosticLayers]);
export function restoreOperatorLightingPreview(root:THREE.Object3D|null):number{
 if(!root)return 0;
 const visited=new Set<THREE.BufferGeometry>();
 let restored=0;
 root.traverseVisible(node=>{
  if(!(node instanceof THREE.Mesh)||visited.has(node.geometry))return;
  const geometry=node.geometry as THREE.BufferGeometry;
  visited.add(geometry);
  const base=originals.get(geometry);
  const attr=geometry.getAttribute('color');
  if(!base||!attr||!(attr.array instanceof Uint8Array)||
    attr.array.length!==base.colors.length)return;
  (attr.array as Uint8Array).set(base.colors);
  attr.needsUpdate=true;
  originals.delete(geometry);
  restored++;
 });
 return restored;
}
export function previewOperatorLightingLayers(
 root:THREE.Object3D|null,layers:LightingDiagnosticLayers
):number{
 if(!root)return 0;
 if(isDefault(layers))return restoreOperatorLightingPreview(root);
 root.updateWorldMatrix(true,true);
 inverse.copy(root.matrixWorld).invert();
 const visited=new Set<THREE.BufferGeometry>();
 let modified=0;
 root.traverseVisible(node=>{
  if(!(node instanceof THREE.Mesh))return;
  const geometry=node.geometry as THREE.BufferGeometry;
  if(visited.has(geometry))return;
  visited.add(geometry);
  const attr=geometry.getAttribute('color');
  if(!attr||attr.itemSize!==3||!attr.normalized||
   !(attr.array instanceof Uint8Array))return;
  const count=attr.count;
  const pixels=attr.array as Uint8Array;
  let baseline=originals.get(geometry);
  // Independent clothing re-bake changed the color version.
  if(!baseline||baseline.appliedVersion!==attr.version){
   baseline={colors:new Uint8Array(pixels),appliedVersion:attr.version};
   originals.set(geometry,baseline);
  }
  const source=baseline.colors;
  const masks=previewChannels.map(k=>{
   const value=geometry.userData[FIELDS[k]];
   return value instanceof Uint8Array&&value.length===count?value:null;
  });
  const position=geometry.getAttribute('position');
  if(!position||position.count!==count)return;
  transform.copy(inverse).multiply(node.matrixWorld);
  for(let i=0;i<count;i++){
   let full=0,selected=0;
   for(let k=0;k<masks.length;k++){
    const occlusion=(masks[k]?.[i]??0)/255;
    full=Math.max(full,occlusion);
    if(layers[previewChannels[k]])selected=Math.max(selected,occlusion);
   }
   // Only disabling a truly contributing channel can brighten a sample.
   const gain=full>selected?
    Math.min(2,(1-selected)/Math.max(.2,1-full)):1;
   let heightGain=1;
   if(!layers.height){
    point.fromBufferAttribute(position,i).applyMatrix4(transform);
    heightGain=1/operatorHeightBrightness(point.y);
   }
   for(let c=0;c<3;c++){
    const n=i*3+c;
    pixels[n]=Math.min(255,Math.round(source[n]*gain*heightGain));
   }
  }
  attr.needsUpdate=true;
  baseline.appliedVersion=attr.version;
  modified++;
 });
 return modified;
}
