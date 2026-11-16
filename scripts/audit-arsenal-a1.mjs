/** A1: read-only material and geometry inventory from the production mesh builders.
 * Run: node --experimental-strip-types scripts/audit-arsenal-a1.mjs
 * Output is intentionally gitignored: reports/arsenal-a1-manifest.json.
 */
import * as THREE from 'three';
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {ARSENAL_REFERENCES} from '../src/arsenal/catalog.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {buildWeaponAccessories} from '../src/breach-weapon-accessories.ts';
import {weaponVisualLayout} from '../src/weapons/geometry/weapon-visual-layout.ts';
import {visualMaterialRole} from '../src/rendering/material-identity.ts';

const finite=n=>Number.isFinite(n)?Number(n.toFixed(4)):null;
function describeMaterial(material){
 const role=visualMaterialRole(material);
 return {type:material.type,role,
  hex:material.color instanceof THREE.Color?'#'+material.color.getHexString():null,
  roughness:typeof material.roughness==='number'?finite(material.roughness):null,
  metalness:typeof material.metalness==='number'?finite(material.metalness):null,
  pixelMap:Boolean(material.map),transparent:Boolean(material.transparent)};
}
function geometryInventory(root){
 let meshes=0,triangles=0,vertices=0,drawCalls=0;
 const used=new Set(),materials=new Map(),bySlot={};
 root.updateMatrixWorld(true);
 root.traverse(node=>{
  if(!(node instanceof THREE.Mesh))return;
  const geometry=node.geometry,position=geometry.getAttribute('position');
  if(!position)throw Error('Weapon mesh lacks positions: '+node.name);
  const instances=node instanceof THREE.InstancedMesh?node.count:1;
  const tris=(geometry.getIndex()?.count??position.count)/3*instances;
  const slot=/^family-(receiver|barrel|handguard|stock|grip|magazine)-/.exec(node.name)?.[1]||
   (node.name.startsWith('family-art-')?'surface-mark':'accessory');
  const part=bySlot[slot]??={meshes:0,triangles:0};
  part.meshes++;part.triangles+=tris;
  meshes++;drawCalls++;triangles+=tris;vertices+=position.count*instances;
  used.add(geometry);
  const palette=Array.isArray(node.material)?node.material:[node.material];
  for(const material of palette){
   const info=describeMaterial(material),key=JSON.stringify(info);
   const entry=materials.get(key)??{...info,meshes:0,triangles:0};
   entry.meshes++;entry.triangles+=tris/palette.length;materials.set(key,entry);
  }
 });
 return {meshes,triangles:finite(triangles),vertices,
  uniqueGeometries:used.size,estimatedDrawCalls:drawCalls,
  bySlot:Object.fromEntries(Object.entries(bySlot).sort(([a],[b])=>a.localeCompare(b))),
  materials:[...materials.values()].sort((a,b)=>b.triangles-a.triangles||
   String(a.hex).localeCompare(String(b.hex)))};
}
export function collectArsenalA1Manifest(){
 const steel=new THREE.MeshStandardMaterial({color:0x707875,roughness:.78,flatShading:true});
 const dark=new THREE.MeshStandardMaterial({color:0x303a38,roughness:.84,flatShading:true});
 const presets=[],seen=new Set();
 try{
  for(const ref of ARSENAL_REFERENCES){
   if(seen.has(ref.id))throw Error('Duplicate Arsenal reference '+ref.id);
   seen.add(ref.id);
   const config=selectWeaponFamilyPreset(initialWeaponConfiguration(ref.legacy.weapon),ref.id);
   if(!config.build||config.build.parts.receiver!==ref.legacy.parts.receiver)
    throw Error('Factory recipe failed to resolve: '+ref.id);
   const root=new THREE.Group();
   const body=buildWeaponSilhouette(config.weapon,steel,dark,config);
   const accessories=buildWeaponAccessories(config,steel,dark);
   root.add(body,accessories);
   const longitudinalScale=weaponVisualLayout(config).longitudinalScale;
   root.scale.x=longitudinalScale;
   const bounds=new THREE.Box3().setFromObject(root);
   if(bounds.isEmpty())throw Error('Empty factory geometry: '+ref.id);
   const inventory=geometryInventory(root);
   presets.push({id:ref.id,name:ref.name,platformId:ref.platformId,
    family:ref.legacy.family,weapon:config.weapon,
    longitudinalScale:finite(longitudinalScale),
    bounds:{min:bounds.min.toArray().map(finite),
     max:bounds.max.toArray().map(finite)},
    parts:{...config.build.parts},accessories:{...config.slots},
    ...inventory});
   clearWeaponSilhouette(body);
   accessories.traverse(node=>{if(node instanceof THREE.Mesh)node.geometry.dispose();});
   accessories.clear();
  }
 }finally{steel.dispose();dark.dispose();}
 const totals={presets:presets.length,
  meshes:presets.reduce((n,p)=>n+p.meshes,0),
  triangles:finite(presets.reduce((n,p)=>n+p.triangles,0)),
  byPlatform:Object.fromEntries([...new Set(presets.map(p=>p.platformId))].sort()
   .map(id=>[id,presets.filter(p=>p.platformId===id).length]))};
 return {schema:'fieldwork-arsenal-a1',version:1,
  presentation:'Arsenal actual meshes, accessories and authored materials; weapon-local x scale applied',
  totals,presets};
}
function main(){
 const manifest=collectArsenalA1Manifest();
 const output=process.argv[2]??'reports/arsenal-a1-manifest.json';
 mkdirSync(dirname(output),{recursive:true});
 writeFileSync(output,JSON.stringify(manifest,null,2)+'\n');
 console.log('Arsenal A1 '+manifest.totals.presets+' factory presets, '+
  manifest.totals.meshes+' meshes, '+manifest.totals.triangles+' triangles: '+output);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main();
