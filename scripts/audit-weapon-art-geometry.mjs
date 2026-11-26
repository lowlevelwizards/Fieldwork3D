/** WA0.2 — read-only artwork census using the shared render builders.
 * Counts are scene-graph data, not a GPU benchmark or artistic grade.
 */
import * as THREE from 'three';
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {collectWeaponArtInventory} from './audit-weapon-art-inventory.mjs';
import {ARSENAL_REFERENCES} from '../src/arsenal/catalog.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset} from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';
import {buildWeaponAccessories} from '../src/breach-weapon-accessories.ts';
import {weaponVisualLayout} from '../src/weapons/geometry/weapon-visual-layout.ts';
import {buildSidearmPreview,clearSidearmPreview} from '../src/weapons/geometry/sidearm-preview.ts';
import {WEAPON_ACCESSORY_STEEL,WEAPON_ACCESSORY_POLYMER} from '../src/weapons/geometry/weapon-visual-palette.ts';
import {visualMaterialRole} from '../src/rendering/material-identity.ts';

const round=n=>Number.isFinite(n)?Number(n.toFixed(4)):null;
const sortObject=o=>Object.fromEntries(Object.entries(o).sort(([a],[b])=>a.localeCompare(b)));
const metric=()=>({meshes:0,visibleMeshes:0,triangles:0,visibleTriangles:0,vertices:0,instances:0,estimatedVisibleSubmissions:0});
const textureFields=['map','alphaMap','aoMap','bumpMap','normalMap','roughnessMap','metalnessMap','emissiveMap','lightMap','envMap','displacementMap'];
const isVisible=n=>{for(let p=n;p;p=p.parent)if(!p.visible)return false;return true;};
function materialInfo(m){
 return {type:m.type,role:visualMaterialRole(m),hex:m.color?.isColor?'#'+m.color.getHexString():null,
  roughness:round(m.roughness),metalness:round(m.metalness),opacity:round(m.opacity),
  visible:m.visible,transparent:m.transparent,side:m.side,flatShading:Boolean(m.flatShading),
  textureSlots:textureFields.filter(k=>m[k]?.isTexture)};
}
function textureInfo(t){
 const image=t.image;
 const w=image?.width??null,h=image?.height??null;
 // Only count actual CPU typed array payloads. No guessed GPU allocations.
 return {width:w,height:h,type:t.type,format:t.format,generateMipmaps:t.generateMipmaps,
  cpuDataBytes:ArrayBuffer.isView(image?.data)?image.data.byteLength:null};
}
function ownerFor(mesh){
 return /^family-(receiver|barrel|handguard|stock|grip|magazine)-/.exec(mesh.name)?.[1]
  ??(/^weapon-accessory-/.test(mesh.name)?'accessory':
   mesh.userData.weaponPixelArt||mesh.name.startsWith('family-art-')?'surface-mark':'unclassified');
}
export function inspectWeaponArt(root){
 root.updateMatrixWorld(true);
 const totals=metric(),owners={},geometries=new Set(),materials=new Map(),textures=new Map();
 let markedMeshes=0,transparentMeshes=0;
 const bounds=new THREE.Box3();
 root.traverse(n=>{
  if(!(n instanceof THREE.Mesh))return;
  const g=n.geometry,pos=g.getAttribute('position');
  if(!pos)throw Error('Missing position data: '+n.name);
  const copies=n instanceof THREE.InstancedMesh?n.count:1;
  const tris=(g.index?.count??pos.count)/3*copies;
  const palette=Array.isArray(n.material)?n.material:[n.material];
  const visible=isVisible(n)&&copies>0&&palette.some(m=>m.visible);
  const submissions=visible?(Array.isArray(n.material)?
   g.groups.filter(group=>group.count>0&&palette[group.materialIndex]?.visible).length:1):0;
  for(const count of [totals,owners[ownerFor(n)]??=metric()]){
   count.meshes++;count.triangles+=tris;count.vertices+=pos.count*copies;
   if(n instanceof THREE.InstancedMesh)count.instances+=copies;
   if(visible){count.visibleMeshes++;count.visibleTriangles+=tris;count.estimatedVisibleSubmissions+=submissions;}
  }
  if(n.userData.weaponPixelArt||n.name.startsWith('family-art-'))markedMeshes++;
  if(palette.some(m=>m.transparent))transparentMeshes++;
  geometries.add(g);
  if(visible){
   if(!g.boundingBox)g.computeBoundingBox();
   if(n instanceof THREE.InstancedMesh){n.computeBoundingBox();if(n.boundingBox)bounds.union(n.boundingBox.clone().applyMatrix4(n.matrixWorld));}
   else if(g.boundingBox)bounds.union(g.boundingBox.clone().applyMatrix4(n.matrixWorld));
  }
  for(const m of new Set(palette)){
   const entry=materials.get(m)??{...materialInfo(m),meshReferences:0};
   entry.meshReferences++;materials.set(m,entry);
   for(const k of textureFields)if(m[k]?.isTexture)textures.set(m[k],textureInfo(m[k]));
  }
 });
 if(bounds.isEmpty()||!Number.isFinite(totals.triangles)||totals.triangles<=0)
  throw Error('Empty or invalid artwork');
 const size=bounds.getSize(new THREE.Vector3());
 return {...totals,markedMeshes,transparentMeshes,uniqueGeometries:geometries.size,
  uniqueMaterials:materials.size,uniqueTextures:textures.size,
  knownCpuTextureBytes:[...textures.values()].reduce((sum,t)=>sum+(t.cpuDataBytes??0),0),
  unknownCpuTextureCount:[...textures.values()].filter(t=>t.cpuDataBytes===null).length,
  bounds:{min:bounds.min.toArray().map(round),max:bounds.max.toArray().map(round),size:size.toArray().map(round)},
  owners:sortObject(owners),materials:[...materials.values()],textures:[...textures.values()]};
}
export function collectWeaponArtGeometry(){
 const source=collectWeaponArtInventory(),references=[];
 for(const ref of source.references){
  let root,body,accessories;
  const isSidearm=ref.status==='issued-sidearm-appearance'||ref.status==='preview-only';
  try{
   let scale=1,slots=null,compilation=null;
   if(isSidearm)root=buildSidearmPreview(ref.id);
   else{
    const primary=ARSENAL_REFERENCES.find(r=>r.id===ref.id);
    const config=primary?selectWeaponFamilyPreset(initialWeaponConfiguration(primary.legacy.weapon),primary.id):initialWeaponConfiguration('shotgun');
    if(primary&&(!config.build||Object.entries(primary.legacy.parts).some(([k,v])=>config.build.parts[k]!==v)))throw Error('Reference resolution drift: '+ref.id);
    body=buildWeaponSilhouette(config.weapon,WEAPON_ACCESSORY_STEEL,WEAPON_ACCESSORY_POLYMER,config);
    accessories=buildWeaponAccessories(config,WEAPON_ACCESSORY_STEEL,WEAPON_ACCESSORY_POLYMER);
    scale=weaponVisualLayout(config).longitudinalScale;
    root=new THREE.Group();root.add(body,accessories);root.scale.x=scale;
    slots={...config.slots};
    compilation=body.userData.rigidCompilation??null;
   }
   references.push({...ref,slots,compilation,scale:{x:scale,y:1,z:1,
    basis:isSidearm?'native-sidearm-preview (not operator scale)':'primary-display-layout'},...inspectWeaponArt(root)});
  }finally{
   if(isSidearm&&root)clearSidearmPreview(ref.id,root);
   if(body)clearWeaponSilhouette(body);
   if(accessories){accessories.traverse(n=>{if(n instanceof THREE.InstancedMesh)n.dispose();if(n instanceof THREE.Mesh)n.geometry.dispose();});accessories.clear();}
  }
 }
 const byPlatform={};
 for(const r of references){
  const p=byPlatform[r.platform]??={references:0,meshes:0,triangles:0,estimatedVisibleSubmissions:0,markedMeshes:0,transparentMeshes:0};
  p.references++;for(const key of ['meshes','triangles','estimatedVisibleSubmissions','markedMeshes','transparentMeshes'])p[key]+=r[key];
 }
 return {schema:'fieldwork-wa0-geometry-census',version:1,
  evidence:'actual authored default render scene graphs; no visual grading',
  limits:['Submissions are visibility/material-group estimates, not measured WebGL calls; no shadows, culling, or double-sided transparent passes.',
   'Triangle counts use geometry topology and instance counts, not clipped draw ranges.',
   'Texture bytes are known CPU typed-array payloads per reference, not GPU memory; cross-model sums would double-count shared resources.',
   'Native sidearm previews are not operator-scale comparisons.',
   'Default primary configurations only: custom combinations, separate accessory samples, operator context and visual review remain later work.'],
  totals:{references:references.length,meshes:references.reduce((n,r)=>n+r.meshes,0),triangles:references.reduce((n,r)=>n+r.triangles,0),
   estimatedVisibleSubmissions:references.reduce((n,r)=>n+r.estimatedVisibleSubmissions,0)},
  byPlatform:sortObject(byPlatform),references};
}
function main(){
 const report=collectWeaponArtGeometry();
 const output=process.argv[2]??'reports/wa0-geometry-census.json';
 mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 console.log('WA0.2 totals: '+JSON.stringify(report.totals));
 console.log('WA0.2 platform summary: '+JSON.stringify(report.byPlatform));
 console.log('WA0.2 report: '+output);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main();
