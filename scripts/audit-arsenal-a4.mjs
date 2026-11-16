/** A4.0 surface-detail census from actual production mesh builders.
 * Non-mutating: counts active geometry, textures, shader/material signatures,
 * sidedness and lifetime ownership. One row per factory recipe.
 */
import * as THREE from 'three';
import {mkdirSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {ARSENAL_REFERENCES} from '../src/arsenal/catalog.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {buildWeaponAccessories} from '../src/breach-weapon-accessories.ts';
const round=n=>Math.round(n*100)/100;
function isDetail(o){
 return o.userData.weaponPixelArt===true||
  o.name.startsWith('family-art-')||
  o.userData.falMuzzleSlots===true||
  o.userData.fncP16MuzzleSlotStrip===true||
  o.userData.falStampedRib===true||
  o.userData.fncStampedMagazineRib===true||
  o.userData.hk556StampedRib===true;
}
export function auditA4(){
 const presetRows=[],textureSizes=new Map(),materialSignatures=new Set();
 const marks=new Map(),sharedMaterials=new Set(),uniqueGeometries=new Set();
 const steel=new THREE.MeshBasicMaterial({color:0x66746a}),
  dark=new THREE.MeshBasicMaterial({color:0x343d38});
 for(const ref of ARSENAL_REFERENCES){
  const c=selectWeaponFamilyPreset(initialWeaponConfiguration(ref.legacy.weapon),ref.id);
  const body=buildWeaponSilhouette(c.weapon,steel,dark,c);
  const accessories=buildWeaponAccessories(c,steel,dark);
  const result={id:ref.id,platform:ref.platformId,meshes:0,triangles:0,
   marks:0,markTriangles:0,overlays:0,pixelMeshes:0,atlasMeshes:0,
   markTypes:{},markNames:[],uniqueMaps:0};
  const presetMaps=new Set();
  for(const part of [body,accessories])part.traverse(o=>{
   if(!(o instanceof THREE.Mesh))return;
   const p=o.geometry.getAttribute('position');
   const tris=(o.geometry.index?.count??p.count)/3*
    (o instanceof THREE.InstancedMesh?o.count:1);
   result.meshes++;result.triangles+=tris;
   uniqueGeometries.add(o.geometry);
   const palette=Array.isArray(o.material)?o.material:[o.material];
   for(const m of palette){
    sharedMaterials.add(m);
    const texture=m.map;
    if(texture){
     presetMaps.add(texture);
     const img=texture.image,w=img?.width??0,h=img?.height??0;
     textureSizes.set(texture.uuid,{name:texture.name||'mark',w,h,
      estimatedRGBABytes:w*h*4});
    }
    materialSignatures.add([m.type,m.transparent,m.depthWrite,
     m.polygonOffset,Boolean(m.map),m.side].join(':'));
   }
   if(!isDetail(o)&&!o.userData.fncPixelDetailRegion)return;
   result.marks++;result.markTriangles+=tris;
   if(o.userData.weaponPixelArt)result.pixelMeshes++;
   if(o.userData.fncPixelDetailRegion)result.atlasMeshes++;
   if(o.userData.weaponPixelArt||o.userData.falMuzzleSlots||
    o.userData.fncP16MuzzleSlotStrip)result.overlays++;
   const mark=o.userData.fncPixelDetailRegion??o.name;
   result.markTypes[mark]=(result.markTypes[mark]||0)+1;
   result.markNames.push(mark);
   marks.set(mark,(marks.get(mark)||0)+1);
  });
  result.uniqueMaps=presetMaps.size;
  delete result.markNames;
  result.triangles=round(result.triangles);
  result.markTriangles=round(result.markTriangles);
  presetRows.push(result);
  clearWeaponSilhouette(body);
  accessories.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose()});
 }
 steel.dispose();dark.dispose();
 const total=key=>round(presetRows.reduce((n,p)=>n+p[key],0));
 return {schema:'fieldwork-arsenal-a4',version:1,
  totals:{presets:presetRows.length,meshes:total('meshes'),
   triangles:total('triangles'),markMeshes:total('marks'),
   overlayMeshes:total('overlays'),pixelMarkMeshes:total('pixelMeshes'),
   atlasBearingMeshes:total('atlasMeshes'),markTriangles:total('markTriangles'),
   mapIdentities:textureSizes.size,
   textureBytesEstimated:[...textureSizes.values()].reduce((n,x)=>n+x.estimatedRGBABytes,0),
   distinctMaterialStates:materialSignatures.size},
  activeMarkTypes:Object.fromEntries([...marks].sort(([a],[b])=>a.localeCompare(b))),
  textures:[...textureSizes.values()].sort((a,b)=>a.name.localeCompare(b.name)),
  factoryPresets:presetRows};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const report=auditA4(),out=process.argv[2]||'reports/arsenal-a4-surface-census.json';
 mkdirSync('reports',{recursive:true});
 writeFileSync(out,JSON.stringify(report,null,2)+'\n');
 console.log('A4 surface audit '+JSON.stringify(report.totals));
}
