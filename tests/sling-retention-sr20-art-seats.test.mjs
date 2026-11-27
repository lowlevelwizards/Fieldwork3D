import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {FAMILY_PARTS,FAMILY_PRESETS,proposeFamilyPartChange} from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,readWeaponConfiguration} from '../src/equipment-weapon-assemblies.ts';
import {alternateStockPosition} from '../src/weapon-stock-position.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';
import {RECEIVER_ART_SEATS,STOCK_ART_SEATS,FOREND_ART_SEATS,authoredRetentionArtSeats} from '../src/weapons/geometry/weapon-retention-art-seats.ts';
test('every authored receiver, stock and fore-end in the catalog has an explicit artist marker',()=>{
 const tables={receiver:RECEIVER_ART_SEATS,stock:STOCK_ART_SEATS,handguard:FOREND_ART_SEATS};
 for(const p of Object.values(FAMILY_PARTS))if(tables[p.slot])
  assert.ok(Object.hasOwn(tables[p.slot],p.id),p.id);
});
test('all factory silhouettes and alternate stock positions resolve artist seats to visible art',()=>{
 const mat=new THREE.MeshBasicMaterial(),fail=[],misses=[];
 const inspect=(cfg,label)=>{
  const body=buildWeaponSilhouette(cfg.weapon,mat,mat,cfg,{rigidCompilation:'disabled'});
  try{
   const s=body.userData.retentionSockets,review=body.userData.retentionArtReview;
   if(!s?.front||review?.source!=='authored'||!s.supported.includes('two'))fail.push(label);
   if(review?.misses.length)misses.push(label+': '+review.misses.join(','));
   for(const p of [s?.rear,s?.front,s?.single])if(!p||![p.x,p.y,p.z].every(Number.isFinite))fail.push(label+' nonfinite');
  }finally{clearWeaponSilhouette(body);}
 };
 try{
  for(const ref of FAMILY_PRESETS){
   const cfg=selectWeaponFamilyPreset(initialWeaponConfiguration(ref.weapon),ref.id);
   inspect(cfg,ref.id);
   const alt=alternateStockPosition(ref.parts.stock);
   if(alt)inspect(readWeaponConfiguration({...cfg,stockPosition:alt},cfg.weapon),ref.id+'/'+alt);
  }
 }finally{mat.dispose();}
 assert.deepEqual(fail,[]);
 assert.deepEqual(misses,[]);
});
test('custom legal part swaps retain explicit authored marker coverage',()=>{
 const seen=new Set();
 for(const preset of FAMILY_PRESETS){
  const base={family:preset.family,parts:preset.parts};
  for(const part of Object.values(FAMILY_PARTS)){
   if(!['stock','receiver','handguard','barrel','magazine'].includes(part.slot))continue;
   if(part.family!==base.family)continue;
   const result=proposeFamilyPartChange(base,preset.weapon,part.slot,part.id);
   if(!result.valid)continue;
   const art=authoredRetentionArtSeats(result.build);
   assert.ok(art,preset.id+'/'+part.id);
   seen.add(part.id);
  }
 }
 assert.ok(seen.size>80);
});
