/** One-time artwork audit: real emitted GPU triangles, mesh count and
 * face distribution. Avoid confusing control points or mesh counts for polys.
 * These totals include all visible slots in the same default assembly.
 */
import * as THREE from 'three';
import {buildWeaponSilhouette,clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
export function countGeometry(root){
 let triangles=0,meshes=0,vertices=0,geom=new Set(),byPart={};
 root.traverse(node=>{
  if(!(node instanceof THREE.Mesh))return;
  const p=node.geometry.getAttribute('position');
  const faces=(node.geometry.getIndex()?.count??p.count)/3;
  meshes++;triangles+=faces;vertices+=p.count;geom.add(node.geometry);
  const part=node.name.split('-')[1]||'other';
  const group=byPart[part]??={triangles:0,meshes:0};
  group.triangles+=faces;group.meshes++;
 });
 return {triangles,meshes,vertices,geometries:geom.size,byPart};
}
export function buildAuditReport(){
 const models=[['FNC','rifle','fnc-service'],['FAL','rifle','fal-5000'],
  ['G3A3','rifle','hk-g3a3'],
  ['M16A2','rifle','ar-m16a2'],['M4A1','carbine','ar-m4a1'],
  ['AKM','rifle','ak-akm']];
 const mat=new THREE.MeshBasicMaterial();
 const result=[];
 for(const [name,kind,preset] of models){
  const cfg=selectWeaponFamilyPreset(initialWeaponConfiguration(kind),preset);
  const model=buildWeaponSilhouette(kind,mat,mat,cfg);
  result.push({name,...countGeometry(model)});
  clearWeaponSilhouette(model);
 }
 mat.dispose();
 return result;
}
if(process.argv[1]?.endsWith('audit-weapon-geometry.mjs')){
 for(const rec of buildAuditReport()){
  console.log('POLY_AUDIT '+JSON.stringify(rec));
 }
}
