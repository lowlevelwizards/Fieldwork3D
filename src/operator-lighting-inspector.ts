/** R5.6-A: read-only mask statistics. No raycasts, GPU readbacks, new
 * textures or geometry mutations. Called ONLY by the opt-in Studio overlay.
 */
import * as THREE from 'three';
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
