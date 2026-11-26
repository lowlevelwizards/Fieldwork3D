import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createIntegratedArtAtlas,integratedArtUV,createIntegratedArtMaterialCache} from '../src/weapons/geometry/weapon-integrated-surface-atlas.ts';
import {weaponFinish,WEAPON_FINISH_SPECS} from '../src/weapons/geometry/weapon-material-registry.ts';
import {weaponFinishSubstrate,describeWeaponArtMaterial,weaponArtStudyColor,WA3_DARK_STUDY} from '../src/weapons/geometry/weapon-art-material-vocabulary.ts';
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
