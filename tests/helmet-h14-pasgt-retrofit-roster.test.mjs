import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHelmetFieldLayers,updateHelmetFieldLayers}
 from '../src/operator-helmet-field-visuals.ts';
import {resolveHelmetField,HELMET_FIELD_DEFAULTS,
 helmetFieldCompatibilityIssues} from '../src/operator-helmet-field-policy.ts';
import {HELMET_MOUNT_PROFILES} from '../src/operator-helmet-attachment-frames.ts';
import {headwearCuboidVolumes,HEAD_SILHOUETTE_METRICS}
 from '../src/operator-headwear-silhouettes.ts';

test('H14: original PASGT is not silently equipped with a modern rail kit',()=>{
 const s=resolveHelmetField('pasgt',HELMET_FIELD_DEFAULTS,{covered:true});
 for(const key of ['rails','bungees','velcro','camera','light','strobe',
  'counterweight','battery','patches'])assert.equal(s[key],false,key);
 const kit=createHelmetFieldLayers(new THREE.Group(),'pasgt');
 updateHelmetFieldLayers(kit,s,0x74634b,true);
 for(const key of ['rails','bungees','velcro','camera','light','patches'])
  assert.equal(kit.modules[key].visible,false,key);
 assert.ok(kit.modules.shroud.getObjectByName('pasgt-period-bracket'));
});

test('H14: legitimate PASGT rail kit supports every fitted accessory family',()=>{
 const kit=createHelmetFieldLayers(new THREE.Group(),'pasgt');
 const p=HELMET_MOUNT_PROFILES.pasgt;
 for(const key of ['rails','bungees','velcro','patches']){
  const module=kit.modules[key];
  assert.equal(module.userData.h14CoverAware,true);
  assert.ok(module.getObjectByName('pasgt-'+key+'-covered'));
  assert.ok(module.getObjectByName('pasgt-'+key+'-bare'));
 }
 assert.equal(kit.modules.rails.userData.h14PasgtRailSides,2);
 assert.equal(kit.modules.bungees.userData.h14DiagonalBreak,true);
 const all={rails:true,shroud:true,bungees:true,velcro:true,
  camera:true,cameraSide:'right',light:true,lightSide:'left',
  patches:true,goggles:'front',goggleSleeve:true,
  strobe:true,counterweight:true,chemlight:false,battery:false};
 const ids=Object.fromEntries(Object.entries(kit.modules).map(([k,v])=>[k,v.uuid]));
 const preMeshes=[];
 kit.root.traverse(o=>{if(o instanceof THREE.Mesh)preMeshes.push(o)});
 for(const covered of [true,false]){
  updateHelmetFieldLayers(kit,all,0x786550,covered);
  for(const key of ['rails','bungees','velcro','patches']){
   assert.equal(kit.modules[key].visible,true,key);
   assert.equal(kit.modules[key].getObjectByName('pasgt-'+key+'-covered').visible,
    covered,key);
   assert.equal(kit.modules[key].getObjectByName('pasgt-'+key+'-bare').visible,
    !covered,key);
  }
  assert.equal(kit.modules.camera.visible,true);
  assert.equal(kit.modules.light.visible,true);
  assert.equal(kit.modules.counterweight.visible,true);
  for(const key of ['camera','light','counterweight','strobe']){
   const anchor=kit.modules[key].getObjectByName('helmet-addon-fitted-socket');
   assert.equal(anchor.userData.h14PasgtRetrofitSocket===true||
    anchor.userData.h14PasgtRetrofit===true,true,key);
   assert.ok(anchor.position.toArray().every(Number.isFinite));
  }
  assert.equal(kit.modules.camera.getObjectByName(
   'helmet-addon-fitted-socket').userData.h13RailAttached,true);
 }
 for(const bungees of kit.modules.bungees.children){
  const meshes=[];bungees.traverse(o=>{
   if(o instanceof THREE.Mesh&&o.geometry.userData.h14FlatSegments)meshes.push(o);
  });
  assert.equal(meshes.length,2);
  for(const m of meshes)assert.equal(m.geometry.userData.h14FlatSegments,3);
 }
 const afterMeshes=[];kit.root.traverse(o=>{
  if(o instanceof THREE.Mesh)afterMeshes.push(o);
 });
 assert.equal(afterMeshes.length,preMeshes.length,
  'PASGT customization must not allocate new meshes at update');
 assert.deepEqual(Object.fromEntries(Object.entries(kit.modules)
  .map(([k,v])=>[k,v.uuid])),ids);
 assert.ok(p.ear<3,'original PASGT ear coverage must remain deep');
});

test('H14: conflicts are resolved without erasing saved PASGT preferences',()=>{
 const raw={rails:true,shroud:true,bungees:true,camera:true,light:true,
  cameraSide:'right',lightSide:'right',goggles:'rear',
  counterweight:true,battery:true,strobe:true,chemlight:true};
 const s=resolveHelmetField('pasgt',raw,{covered:true});
 assert.equal(s.rails,true);assert.equal(s.bungees,true);
 assert.equal(s.camera,true);assert.equal(s.light,false);
 assert.equal(s.counterweight,false);assert.equal(s.battery,false);
 assert.equal(s.strobe,true);assert.equal(s.chemlight,false);
 assert.equal(raw.counterweight,true);
 assert.equal(raw.light,true);
 const notes=helmetFieldCompatibilityIssues('pasgt',raw,true);
 assert.ok(notes.some(x=>x.includes('PASGT side rails')));
 const bare=resolveHelmetField('pasgt',{velcro:false,patches:true},
  {covered:false});
 assert.equal(bare.patches,false);
 assert.equal(resolveHelmetField('pasgt',{rails:false,light:true}).light,false);
});

test('H14 roster: each family keeps its authored independent lower-ear profile',()=>{
 const ids=['pasgt','ach','mich-2001','mich-2002','high-cut',
  'fast-sf','fast-xp-mid','m1-steel','ddr-m56','soviet-steel'];
 const cuts=ids.map(id=>HEAD_SILHOUETTE_METRICS[id].earEdge);
 assert.ok(new Set(cuts).size>=8);
 assert.ok(HEAD_SILHOUETTE_METRICS.pasgt.earEdge<
  HEAD_SILHOUETTE_METRICS.ach.earEdge);
 assert.ok(HEAD_SILHOUETTE_METRICS['mich-2001'].earEdge>
  HEAD_SILHOUETTE_METRICS['mich-2002'].earEdge);
 assert.ok(HEAD_SILHOUETTE_METRICS['fast-sf'].earEdge>
  HEAD_SILHOUETTE_METRICS['fast-xp-mid'].earEdge);
 for(const id of ids)assert.ok(headwearCuboidVolumes(id).length>=3);
});
