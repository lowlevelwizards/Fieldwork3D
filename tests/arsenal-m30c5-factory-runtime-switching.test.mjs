/** M3.0C5B: production switch/undo across the second verified factory cohort. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ARSENAL_REFERENCES} from '../src/arsenal/catalog.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 setConfiguredFamilyPart,setWeaponAttachment,readWeaponConfiguration}
 from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {ArsenalWeaponGeometryPool} from '../src/arsenal/weapon-geometry-pool.ts';
import {compileArsenalRigidPartSiblings}
 from '../src/arsenal/weapon-part-batching.ts';
import {measureWeaponVisual}
 from '../scripts/audit-weapon-production-m30.mjs';
import {workbenchVisualAnchors,partVisualBounds}
 from '../src/weapons/geometry/weapon-visual-anchors.ts';

const cohort={
 'ak-ak74':{mag:'ak-mag545poly',saved:8},
 'ak-aks74':{mag:'ak-mag545poly',saved:9},
 'ak-rpk74':{mag:'ak-mag545',saved:9},
 'ar-m16a4':{mag:'ar-magpoly',saved:8}
};
const load=id=>{
 const ref=ARSENAL_REFERENCES.find(x=>x.id===id);
 assert.ok(ref,'factory ID '+id);
 return selectWeaponFamilyPreset(initialWeaponConfiguration(ref.legacy.weapon),id);
};
const model=(c,options)=>buildWeaponSilhouette(c.weapon,
 new THREE.MeshBasicMaterial(),new THREE.MeshBasicMaterial(),c,options);
const mags=g=>g.children.filter(x=>x.name.startsWith('family-magazine-'));

test('C5B all four factory builds compile, opt out and survive magazine swaps',()=>{
 for(const [id,proof] of Object.entries(cohort)){
  const factory=load(id),snapshot=JSON.stringify(factory);
  const uncompiled=model(factory,{rigidCompilation:'disabled'});
  const compiled=model(factory);
  try{
   assert.equal(compiled.userData.rigidCompilation.factoryId,id);
   assert.equal(compiled.userData.rigidCompilation.avoidedSubmissions,
    proof.saved);
   assert.equal(measureWeaponVisual(uncompiled).submissions-
    measureWeaponVisual(compiled).submissions,proof.saved);
   assert.equal(measureWeaponVisual(uncompiled).triangles,
    measureWeaponVisual(compiled).triangles);
   assert.ok(mags(compiled).length>0);
   assert.deepEqual(mags(compiled).map(x=>x.name),
    mags(uncompiled).map(x=>x.name));
   const before=workbenchVisualAnchors(factory,uncompiled,'body');
   const after=workbenchVisualAnchors(factory,compiled,'body');
   assert.deepEqual(before.map(x=>[x.slot,x.name]),
    after.map(x=>[x.slot,x.name]));
   for(let i=0;i<before.length;i++)
    for(const axis of ['x','y','z'])
     assert.ok(Math.abs(before[i][axis]-after[i][axis])<.0001,
      id+' Workbench '+before[i].slot+'/'+axis);
   for(const slot of ['magazine','receiver','stock','barrel']){
    const a=partVisualBounds(uncompiled,slot);
    const b=partVisualBounds(compiled,slot);
    assert.ok(a&&b);
    for(const [i,x] of [...a.min.toArray(),...a.max.toArray()].entries())
     assert.ok(Math.abs(x-[...b.min.toArray(),...b.max.toArray()][i])<.0001,
      id+' bounds '+slot+'/'+i);
   }
   assert.equal(JSON.stringify(factory),snapshot);
  }finally{clearWeaponSilhouette(uncompiled);clearWeaponSilhouette(compiled);}
  const changed=setConfiguredFamilyPart(factory,'magazine',proof.mag);
  assert.equal(changed.build?.parts.magazine,proof.mag,
   'alternative compatible magazine must be configurable');
  const variant=model(changed);
  try{
   assert.equal(variant.userData.rigidCompilation,undefined,
    'altered reload magazine must not silently inherit factory whitelist');
   assert.ok(mags(variant).length>0);
  }finally{clearWeaponSilhouette(variant);}
  const replay=readWeaponConfiguration(JSON.parse(JSON.stringify(changed)),
   changed.weapon);
  assert.deepEqual(replay,changed,'Campaign/replay roundtrip is immutable');
  const restored=setConfiguredFamilyPart(replay,'magazine',
   factory.build.parts.magazine);
  const factoryAgain=model(restored);
  try{
   assert.equal(factoryAgain.userData.rigidCompilation.factoryId,id,
    'exact factory identity re-enables compilation after loadout restore');
  }finally{clearWeaponSilhouette(factoryAgain);}
 }
});

test('C5B M16A4 muzzle/optic swaps report actual geometry and preserve independent magazines',()=>{
 let c=load('ar-m16a4');
 const versions=[c];
 for(const [slot,id] of [['optic','optic-reflex'],
  ['muzzle','muzzle-suppressor']]){
  const next=setWeaponAttachment(c,slot,id);
  assert.equal(next.slots[slot],id,'expected valid M16A4 '+slot);
  c=next;versions.push(c);
 }
 for(const config of versions){
  const live=model(config),raw=model(config,{rigidCompilation:'disabled'});
  try{
   const actual=measureWeaponVisual(raw).submissions-
    measureWeaponVisual(live).submissions;
   assert.equal(live.userData.rigidCompilation.factoryId,'ar-m16a4');
   assert.equal(actual,live.userData.rigidCompilation.avoidedSubmissions);
   assert.ok(actual>=5&&actual<=8);
   assert.deepEqual(mags(live).map(m=>m.name),mags(raw).map(m=>m.name));
   assert.deepEqual(JSON.parse(JSON.stringify(config)),config);
  }finally{clearWeaponSilhouette(live);clearWeaponSilhouette(raw);}
 }
});

/** Cross-branch gate: actual C5 live factory models with E6 pooling and
 * opt-in part siblings in the same order used by ArsenalViewport. */
test('C5B four factory models survive E6.26 pooling and E6.27 rigid part batching',()=>{
 const steel=new THREE.MeshStandardMaterial(),dark=new THREE.MeshStandardMaterial();
 const slots=['receiver','barrel','handguard','stock','grip','magazine'];
 const near=(a,b,label)=>assert.ok(Number.isFinite(a)&&Number.isFinite(b)&&
  Math.abs(a-b)<.0001,label+': '+a+' vs '+b);
 const boxParity=(a,b,label)=>{
  assert.ok(a&&b,label+' must stay measurable');
  const lhs=[...a.min.toArray(),...a.max.toArray()];
  const rhs=[...b.min.toArray(),...b.max.toArray()];
  for(let i=0;i<6;i++)near(lhs[i],rhs[i],label+' axis '+i);
 };
 try{
  for(const [id,proof] of Object.entries(cohort)){
   const config=load(id),snapshot=JSON.stringify(config);
   const root=buildWeaponSilhouette(config.weapon,steel,dark,config);
   const pool=new ArsenalWeaponGeometryPool();
   let adopted=false;
   try{
    assert.equal(root.userData.rigidCompilation?.factoryId,id);
    assert.equal(root.userData.rigidCompilation?.avoidedSubmissions,proof.saved);
    const original=new THREE.Box3().setFromObject(root);
    const partBoxes=Object.fromEntries(slots.map(slot=>[
     slot,partVisualBounds(root,slot)?.clone()]));
    const anchors=workbenchVisualAnchors(config,root,'body');
    const magsBefore=mags(root).map(x=>x.name);
    const drawsBefore=root.children.filter(x=>x instanceof THREE.Mesh&&x.visible).length;
    pool.adopt(root);adopted=true;
    const baked=compileArsenalRigidPartSiblings(root);
    assert.ok(baked.avoidedDraws>=0,id+' cannot increase same-part draws');
    assert.ok(root.children.filter(x=>x instanceof THREE.Mesh&&x.visible).length<=
     drawsBefore,id+' no new visible draw submissions');
    boxParity(original,new THREE.Box3().setFromObject(root),id+' overall');
    for(const [slot,originalBox] of Object.entries(partBoxes))
     boxParity(originalBox,partVisualBounds(root,slot),id+'/'+slot);
    const after=workbenchVisualAnchors(config,root,'body');
    assert.equal(after.length,6,id+' six editable sockets');
    assert.deepEqual(after.map(x=>[x.slot,x.name]),
     anchors.map(x=>[x.slot,x.name]),id+' socket identities unchanged');
    for(let i=0;i<anchors.length;i++)
     for(const axis of ['x','y','z'])
      near(anchors[i][axis],after[i][axis],id+' '+anchors[i].slot+'/'+axis);
    assert.deepEqual(mags(root).map(x=>x.name),magsBefore,
     id+' magazine retained as independently selectable part');
    assert.equal(JSON.stringify(config),snapshot,id+' serialized factory untouched');
   }finally{
    if(adopted){pool.release(root);pool.clear();
     assert.equal(pool.stats().geometries,0,id+' pool fully retired');}
    else clearWeaponSilhouette(root);
   }
  }
 }finally{steel.dispose();dark.dispose();}
});
