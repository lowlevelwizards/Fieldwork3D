/** M3.0A: read-only, production-builder weapon quality and GPU submission audit.
 * The body and accessories come from the SAME builders used by Arsenal,
 * operators and replay. These are CPU-side potential submission counts,
 * NOT WebGL profiler draw calls or measured frame performance.
 */
import * as THREE from 'three';
import {ARSENAL_REFERENCES} from '../src/arsenal/catalog.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {buildWeaponAccessories} from '../src/breach-weapon-accessories.ts';

const partOf=(name)=>/^family-(receiver|barrel|handguard|stock|grip|magazine)-/.exec(name)?.[1]??'other';
const round=(value)=>Math.round(value*1000)/1000;

/** Visible-only draw estimates: no shadow-pass, clipping, LOD, cull or shaders. */
export function measureWeaponVisual(root){
 const parts={},materialIds=new Set(),geometries=new Set();
 let meshObjects=0,instances=0,renderSubmissions=0,triangles=0;
 let instancedMeshes=0,protectedComponents=0,unnamedOpaqueCandidates=0;
 const walk=(node,visible)=>{
  const shown=visible&&node.visible;
  if(!shown)return;
  if(node instanceof THREE.Mesh){
   const position=node.geometry.getAttribute('position');
   if(!position)throw Error('Production weapon mesh has no positions: '+node.name);
   const count=node instanceof THREE.InstancedMesh?node.count:1;
   const part=partOf(node.name);
   const sub=parts[part]??={meshes:0,submissions:0,triangles:0};
   // A multi-material mesh emits one submission per nonempty group.
   const materialCount=Array.isArray(node.material)?
    (node.geometry.groups.length||1):1;
   const faces=(node.geometry.getIndex()?.count??position.count)/3*count;
   sub.meshes++;sub.submissions+=materialCount;sub.triangles+=faces;
   meshObjects++;instances+=count;triangles+=faces;
   renderSubmissions+=materialCount;geometries.add(node.geometry);
   for(const mat of Array.isArray(node.material)?node.material:[node.material])
    materialIds.add(mat);
   if(node instanceof THREE.InstancedMesh)instancedMeshes++;
   // Names, metadata and hierarchy are used by part picking, mounts,
   // visibility, light lenses and disposal. Do not silently merge them.
   if(node.name||Object.keys(node.userData).length||node.children.length)
    protectedComponents++;
   else if(!Array.isArray(node.material)&&
    node.material instanceof THREE.MeshStandardMaterial&&
    !node.material.transparent&&node.renderOrder===0)
    unnamedOpaqueCandidates++;
  }
  for(const child of node.children)walk(child,shown);
 };
 walk(root,true);
 return {meshes:meshObjects,instances,instancedMeshes,
  submissions:renderSubmissions,triangles:round(triangles),
  geometries:geometries.size,materials:materialIds.size,
  protectedComponents,unnamedOpaqueCandidates,parts};
}
/** M3.0C reconnaissance only. Named slots remain selectable; no geometry
 * merges happen here. Only direct siblings of one rigid, non-magazine slot
 * with matching material and shadow/depth state are potential candidates.
 */
export function auditRigidPartCandidates(root){
 const matches=new Map(),allowed=new Set([
  'receiver','barrel','handguard','stock','grip'
 ]);
 for(const node of root.children){
  if(!(node instanceof THREE.Mesh)||
   node instanceof THREE.InstancedMesh||node instanceof THREE.SkinnedMesh||
   !node.visible||node.children.length||Object.keys(node.userData).length||
   node.customDepthMaterial||node.customDistanceMaterial||
   !(node.material instanceof THREE.MeshStandardMaterial)||
   node.material.transparent||node.material.alphaTest!==0||
   !node.material.depthTest||!node.material.depthWrite||
   node.renderOrder!==0)continue;
  const match=/^family-(receiver|barrel|handguard|stock|grip|magazine)-(.+)-(\d+)$/
   .exec(node.name);
  if(!match||!allowed.has(match[1]))continue;
  const names=Object.keys(node.geometry.attributes).sort();
  const layout=names.map(name=>{
   const attribute=node.geometry.attributes[name];
   return name+':'+attribute.itemSize+':'+attribute.normalized;
  }).join('/');
  const key=[match[1],match[2],node.material.uuid,
   node.castShadow,node.receiveShadow,node.layers.mask,
   node.frustumCulled,Boolean(node.geometry.index),layout].join('|');
  const group=matches.get(key)??{slot:match[1],partId:match[2],meshes:0};
  group.meshes++;matches.set(key,group);
 }
 const groups=[...matches.values()].filter(g=>g.meshes>=2)
  .sort((a,b)=>b.meshes-a.meshes||a.partId.localeCompare(b.partId));
 return {groups,mergeableMeshes:groups.reduce((n,g)=>n+g.meshes,0),
  potentialSavedSubmissions:groups.reduce((n,g)=>n+g.meshes-1,0)};
}
function boundingSummary(body,accessories){
 const root=new THREE.Group();root.add(body,accessories);
 root.updateMatrixWorld(true);
 const box=new THREE.Box3().setFromObject(root);
 const b={min:[round(box.min.x),round(box.min.y),round(box.min.z)],
  max:[round(box.max.x),round(box.max.y),round(box.max.z)]};
 root.remove(body,accessories);
 return b;
}
export function auditWeaponProduction(config,id){
 const metal=new THREE.MeshBasicMaterial(),polymer=new THREE.MeshBasicMaterial();
 const body=buildWeaponSilhouette(config.weapon,metal,polymer,config);
 const accessories=buildWeaponAccessories(config,metal,polymer);
 try{
  const bodyStats=measureWeaponVisual(body);
  const accessoryStats=measureWeaponVisual(accessories);
  return {id,family:config.build?.family??'legacy',
   body:bodyStats,accessories:accessoryStats,
   rigidPartCandidates:auditRigidPartCandidates(body),
   totalSubmissions:bodyStats.submissions+accessoryStats.submissions,
   bounds:boundingSummary(body,accessories)};
 }finally{
  clearWeaponSilhouette(body);
  accessories.traverse(o=>{
   if(o instanceof THREE.InstancedMesh)o.dispose();
   if(o instanceof THREE.Mesh)o.geometry.dispose();
  });
  accessories.clear();metal.dispose();polymer.dispose();
 }
}
export function auditAllFactoryWeapons(){
 const results=[];
 for(const ref of ARSENAL_REFERENCES){
  const config=selectWeaponFamilyPreset(
   initialWeaponConfiguration(ref.legacy.weapon),ref.id);
  if(config.build?.parts.receiver!==ref.legacy.parts.receiver)
   throw Error('Factory weapon failed to load: '+ref.id);
  results.push(auditWeaponProduction(config,ref.id));
 }
 return results;
}
if(process.argv[1]?.endsWith('audit-weapon-production-m30.mjs')){
 const report=auditAllFactoryWeapons();
 for(const item of report)console.log('WEAPON_M30_AUDIT '+JSON.stringify(item));
 const totals=report.reduce((s,item)=>({
  models:s.models+1,bodyMeshes:s.bodyMeshes+item.body.meshes,
  accessoryMeshes:s.accessoryMeshes+item.accessories.meshes,
  submissions:s.submissions+item.totalSubmissions,
  instancedBodies:s.instancedBodies+item.body.instancedMeshes
 }),{models:0,bodyMeshes:0,accessoryMeshes:0,submissions:0,instancedBodies:0});
 console.log('WEAPON_M30_SUMMARY '+JSON.stringify(totals));
 const ranked=report.map(x=>({id:x.id,family:x.family,
  candidateGroups:x.rigidPartCandidates.groups.length,
  eligibleMeshes:x.rigidPartCandidates.mergeableMeshes,
  potentialSavedSubmissions:x.rigidPartCandidates.potentialSavedSubmissions,
  bodySubmissions:x.body.submissions}))
  .sort((a,b)=>b.potentialSavedSubmissions-a.potentialSavedSubmissions||
   a.id.localeCompare(b.id));
 console.log('WEAPON_M30_CANDIDATES '+JSON.stringify(ranked.slice(0,15)));
}
