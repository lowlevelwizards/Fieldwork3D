import test from 'node:test';
import assert from 'node:assert/strict';
import {collectCustomArtCases} from '../src/arsenal/wa0-custom-reference-cases.ts';
import {collectWeaponArtInventory} from '../scripts/audit-weapon-art-inventory.mjs';
import * as THREE from 'three';
import {collectWeaponArtGeometry,inspectWeaponArt} from '../scripts/audit-weapon-art-geometry.mjs';
import {ARSENAL_REFERENCES} from '../src/arsenal/catalog.ts';
import {FAMILY_PARTS} from '../src/equipment-weapon-families.ts';
import {WEAPON_ATTACHMENTS} from '../src/equipment-weapon-assemblies.ts';
import {SIDEARM_PREVIEW_REFERENCES} from '../src/weapons/geometry/sidearm-preview.ts';
import {SECONDARY_CAPACITY} from '../src/secondary-equipment.ts';
import {createIntegratedArtAtlas,integratedArtUV,createIntegratedArtMaterialCache} from '../src/weapons/geometry/weapon-integrated-surface-atlas.ts';
import {weaponFinish,WEAPON_FINISH_SPECS} from '../src/weapons/geometry/weapon-material-registry.ts';
import {weaponFinishSubstrate,describeWeaponArtMaterial,weaponArtStudyColor,WA3_DARK_STUDY} from '../src/weapons/geometry/weapon-art-material-vocabulary.ts';
import {refs,construct} from '../src/arsenal/wa-art-models.ts';
import {arMagazineGraphicAtlas} from '../src/weapons/geometry/ar-magazine-graphic.ts';
import {AR_WA6_MAGAZINE_STEEL,AR_WA6_LOWER_STEEL} from '../src/weapons/geometry/weapon-visual-palette.ts';

// wa0-custom-art-coverage
{
test('non-factory artwork inventory is partitioned into accepted and unresolved cases',()=>{
 const source=collectWeaponArtInventory(),coverage=collectCustomArtCases();
 const ids=[...coverage.cases.map(c=>c.partId),...coverage.unresolved];
 assert.equal(new Set(ids).size,ids.length);
 assert.deepEqual(new Set(ids),new Set(source.parts.filter(p=>!p.appearsInFactory).map(p=>p.id)));
 for(const c of coverage.cases){
  const part=source.parts.find(p=>p.id===c.partId);
  assert.equal(c.config.build.parts[part.slot],c.partId);
 }
});
}

// wa0-weapon-art-geometry
{
test('WA0.2 counts real artwork across every reference and fallback',()=>{
 const report=collectWeaponArtGeometry();
 const inventory=collectWeaponArtInventory();
 assert.deepEqual(report.references.map(r=>r.id),inventory.references.map(r=>r.id));
 assert.deepEqual(report,collectWeaponArtGeometry(),'deterministic census without timing or UUID noise');
 for(const r of report.references){
  assert.ok(r.meshes>0&&r.triangles>0&&r.uniqueGeometries>0&&r.uniqueMaterials>0,r.id);
  assert.ok(r.visibleMeshes>0&&r.visibleMeshes<=r.meshes,r.id);
  assert.ok(r.visibleTriangles>0&&r.visibleTriangles<=r.triangles,r.id);
  assert.ok(r.bounds.size.every(v=>Number.isFinite(v)&&v>0),r.id);
  assert.equal(Object.values(r.owners).reduce((n,p)=>n+p.meshes,0),r.meshes,r.id);
  assert.equal(r.materials.length,r.uniqueMaterials);
  assert.equal(r.textures.length,r.uniqueTextures);
  assert.ok(r.knownCpuTextureBytes>=0);
  if(r.status==='preview-only'||r.status==='issued-sidearm-appearance')
   assert.match(r.scale.basis,/native-sidearm-preview/);
 }
 assert.equal(report.totals.references,inventory.references.length);
 assert.equal(report.totals.meshes,report.references.reduce((n,r)=>n+r.meshes,0));
 assert.equal(Object.values(report.byPlatform).reduce((n,p)=>n+p.references,0),report.totals.references);
});
test('WA0.2 distinguishes hidden meshes, instances, shared identities and CPU texture bytes',()=>{
 const root=new THREE.Group(),g=new THREE.BoxGeometry(1,1,1);
 const tex=new THREE.DataTexture(new Uint8Array(16),2,2);
 const mat=new THREE.MeshStandardMaterial({map:tex});
 const a=new THREE.Mesh(g,mat),b=new THREE.InstancedMesh(g,mat,3),hidden=new THREE.Group();
 for(let i=0;i<3;i++)b.setMatrixAt(i,new THREE.Matrix4().makeTranslation(i,0,0));
 hidden.visible=false;hidden.add(new THREE.Mesh(g,mat));root.add(a,b,hidden);
 try{
  const r=inspectWeaponArt(root);
  assert.equal(r.meshes,3);assert.equal(r.visibleMeshes,2);
  assert.equal(r.triangles,60);assert.equal(r.visibleTriangles,48);
  assert.equal(r.instances,3);assert.equal(r.estimatedVisibleSubmissions,2);
  assert.equal(r.uniqueGeometries,1);assert.equal(r.uniqueMaterials,1);assert.equal(r.uniqueTextures,1);
  assert.equal(r.knownCpuTextureBytes,16);assert.equal(r.unknownCpuTextureCount,0);
  assert.deepEqual(r.bounds.size,[3,1,1]);
 }finally{b.dispose();g.dispose();mat.dispose();tex.dispose();}
});
}

// wa0-weapon-art-inventory
{
test('WA0 inventory covers all authoritative references, parts and attachments',()=>{
 const report=collectWeaponArtInventory();
 assert.deepEqual(report,collectWeaponArtInventory());
 assert.equal(report.totals.primary,ARSENAL_REFERENCES.length);
 assert.equal(report.totals.sidearms,SIDEARM_PREVIEW_REFERENCES.length);
 assert.equal(report.totals.authoredReferences,ARSENAL_REFERENCES.length+SIDEARM_PREVIEW_REFERENCES.length);
 assert.equal(report.totals.parts,Object.keys(FAMILY_PARTS).length);
 assert.equal(report.totals.attachments,Object.keys(WEAPON_ATTACHMENTS).length);
 assert.deepEqual(new Set(report.references.map(r=>r.id)),
  new Set([...ARSENAL_REFERENCES.map(r=>r.id),...SIDEARM_PREVIEW_REFERENCES.map(r=>r.id)]));
 assert.equal(report.references.length,report.totals.authoredReferences);
 for(const ref of report.references.filter(r=>r.status==='primary-reference'))
  for(const id of Object.values(ref.parts))
   assert.ok(report.parts.some(part=>part.id===id&&part.appearsInFactory));
});
test('WA0 distinguishes live issued sidearms from previews',()=>{
 const {references,totals}=collectWeaponArtInventory();
 assert.equal(totals.issuedSidearms,Object.keys(SECONDARY_CAPACITY).length);
 for(const ref of SIDEARM_PREVIEW_REFERENCES){
  const row=references.find(r=>r.id===ref.id);
  assert.equal(row.status,Object.hasOwn(SECONDARY_CAPACITY,ref.id)?
   'issued-sidearm-appearance':'preview-only');
 }
});
}

// wa3-shared-art-vocabulary
{
test('integrated atlas is deterministic, neutral, opaque and face padded',()=>{
 const grid={tile:4,cols:2,rows:1},tile={col:0,row:0,bounds:[0,1,0,1]};
 const atlas=createIntegratedArtAtlas('study',grid,{blank:tile,mark:{...tile,col:1}},id=>id==='blank'?255:96);
 assert.deepEqual([...atlas.image.data.slice(0,4)],[255,255,255,255]);
 assert.deepEqual([...atlas.image.data.slice(16,20)],[96,96,96,255]);
 assert.equal(atlas.minFilter,THREE.NearestFilter);assert.equal(atlas.generateMipmaps,false);
 assert.deepEqual(integratedArtUV(tile,grid,-1,2,.01),[.005,.99]);
 const source=new THREE.MeshStandardMaterial({color:0x414845}),map=createIntegratedArtMaterialCache(()=>atlas,'study',{idempotent:true});
 const m=map(source);assert.notEqual(m,source);assert.equal(map(source),m);assert.equal(map(m),m);assert.equal(source.map,null);assert.equal(m.map,atlas);assert.equal(m.color.getHex(),source.color.getHex());m.dispose();source.dispose();atlas.dispose();
});
test('every registered finish has a semantic identity without palette mutation',()=>{
 for(const id of Object.keys(WEAPON_FINISH_SPECS)){
  const spec=WEAPON_FINISH_SPECS[id],m=weaponFinish(id);
  assert.notEqual(weaponFinishSubstrate(id),'unclassified',id);
  assert.ok(describeWeaponArtMaterial(m).matches.includes(id),id);
  assert.equal(m.color.getHex(),spec.color);assert.equal(m.roughness,spec.roughness);
  if(Object.hasOwn(WA3_DARK_STUDY,id))assert.equal(weaponArtStudyColor(m),WA3_DARK_STUDY[id],id);
 }
 assert.equal(weaponFinishSubstrate('ak-resin'),'resin');
 assert.equal(weaponFinishSubstrate('g36-lens'),'lens');
 assert.equal(weaponArtStudyColor(weaponFinish('ak-wood-amber')),undefined);
});
}

// wa6-ar-graphic-detail
{
test('WA6 opaque artwork atlas retains blank edges and shared authored marks',()=>{
 const t=arMagazineGraphicAtlas(),{width,height,data}=t.image;
 assert.equal(t,arMagazineGraphicAtlas());
 assert.equal(width,192);assert.equal(height,64);
 assert.equal(t.minFilter,THREE.NearestFilter);
 assert.equal(t.generateMipmaps,false);
 let short=0,long=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=(y*width+x)*4;
  assert.equal(data[i+3],255);
  assert.equal(data[i],data[i+1]);assert.equal(data[i],data[i+2]);
  if(x>=128)assert.equal(data[i],255);
  else if(data[i]===168){if(x<64)short++;else long++;}
 }
 assert.ok(short>100&&long>100);
 assert.equal(AR_WA6_MAGAZINE_STEEL.map,null,'unmapped base material stays pristine');
});
test('WA6 factory graphic details remain on actual body, independent of owner or variant',()=>{
 const mapped=new Set(),t=arMagazineGraphicAtlas();
 for(const e of refs.filter(e=>e.platform==='ar15')){
  const m=construct(e);
  try{
   const mags=[];let lower=0;
   m.model.traverse(n=>{if(n instanceof THREE.Mesh){
    if(n.name.startsWith('family-magazine-'))mags.push(n);
    if(n.material===AR_WA6_LOWER_STEEL)lower++;
   }});
   assert.ok(lower>0,e.id+' broad lower metal mass');
   if(e.id==='ar-mk18'){assert.equal(mags.length,2);assert.ok(mags.every(n=>!n.userData.arWA6IntegratedMagazineArt));continue;}
   assert.equal(mags.length,1,e.id);
   const n=mags[0];assert.ok(n.userData.arWA6IntegratedMagazineArt);
   assert.equal(n.material.map,t);assert.equal(n.material.transparent,false);
   assert.equal(n.material.color.getHex(),AR_WA6_MAGAZINE_STEEL.color.getHex());
   mapped.add(n.material);
   const uv=n.geometry.getAttribute('uv'),normal=n.geometry.getAttribute('normal');
   let face=0,edge=0;
   for(let i=0;i<uv.count;i++){
    if(Math.abs(normal.getZ(i))>.99){assert.ok(uv.getX(i)<2/3);face++;}
    else{assert.ok(uv.getX(i)>2/3);edge++;}
   }
   assert.ok(face>0&&edge>0);
  }finally{m.cleanup();}
 }
 assert.equal(mapped.size,1,'one app-owned mapped material, no per-model texture allocation');
});
}
