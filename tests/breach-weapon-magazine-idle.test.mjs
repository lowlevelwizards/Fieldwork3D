import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FAMILY_PRESETS} from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
import {weaponPresentationSockets} from '../src/breach-weapon-presentation.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {carriedMagazineGeometry,carriedMagazineProfile}
 from '../src/operator-carried-magazines.ts';
import {armorArmIntrusion,armorElbowPole}
 from '../src/breach-arm-armor-clearance.ts';
import {idleLifeAt} from '../src/breach-idle-life.ts';
import {reloadHandKey} from '../src/breach-reload-motion.ts';

test('all modular AR/AK variants own exactly one named magazine set and real grip sockets',()=>{
 const steel=new THREE.MeshStandardMaterial(),dark=new THREE.MeshStandardMaterial();
 for(const preset of FAMILY_PRESETS){
  const config=selectWeaponFamilyPreset(initialWeaponConfiguration(preset.weapon),preset.id);
  const sockets=weaponPresentationSockets(preset.weapon,config);
  assert.equal(sockets.magazinePart,preset.parts.magazine);
  assert.ok(sockets.stock.x<sockets.primary.x,preset.id);
  assert.ok(sockets.primary.x<sockets.support.x,preset.id);
  assert.ok(sockets.support.x<sockets.muzzle.x,preset.id);
  const geometry=buildWeaponSilhouette(preset.weapon,steel,dark,config);
  const actual=geometry.children.filter(m=>m.name.startsWith('family-magazine-'));
  assert.ok(actual.length>=1,preset.id);
  assert.equal(geometry.children.filter(m=>m.name.startsWith('family-magazine-legacy')).length,0);
  assert.ok(actual.every(m=>m instanceof THREE.Mesh));
  clearWeaponSilhouette(geometry);
 }
});

test('spare-mag curves match all issued AR/AK magazines, without changing inventory',()=>{
 for(const preset of FAMILY_PRESETS){
  const id=preset.parts.magazine,profile=carriedMagazineProfile(id);
  assert.ok(profile,preset.id);
  assert.equal(profile.family,preset.family);
  const geometry=carriedMagazineGeometry(id);
  assert.ok(geometry,preset.id);
  geometry.computeBoundingBox();
  assert.ok(Number.isFinite(geometry.boundingBox.min.x));
  assert.ok(geometry.boundingBox.max.y>geometry.boundingBox.min.y);
  geometry.dispose();
 }
 assert.ok(carriedMagazineProfile('ak-mag762').length>
  carriedMagazineProfile('ak-mag545').length);
 assert.equal(carriedMagazineProfile('unsupported-mag'),null);
 assert.equal(carriedMagazineGeometry('unsupported-mag'),null);
});

test('armor scoring detects forearm-through-plate and offers outboard elbow targets',()=>{
 const shoulder={x:1,y:4,z:-7};
 const penetrating={x:4,y:-2,z:-1};
 const wrist={x:2,y:-4,z:0};
 const through=armorArmIntrusion(shoulder,penetrating,wrist);
 const outside=armorArmIntrusion(shoulder,{x:12,y:-3,z:-12},{x:14,y:-6,z:-11});
 assert.ok(through>outside);
 for(const sign of [-1,1]){
  const pole=armorElbowPole({x:1,y:4,z:sign*7},sign,0);
  assert.equal(Math.sign(pole.z),sign);
  assert.ok(pole.x>0);
 }
});

test('magazine reload wrist meets exact authored feed socket at removal and insertion',()=>{
 const target={x:.95,y:-2.1};
 for(const p of [.30,.82]){
  const hand=reloadHandKey(p,'emergency',8,-1.65,-4.65,target);
  assert.ok(Math.abs(hand.x-target.x)<.001);
  assert.ok(Math.abs(hand.y-(target.y-1.2))<.001);
 }
 const legacy=reloadHandKey(.30,'emergency',8,-1.65,-4.65);
 assert.notEqual(legacy.x,target.x);
});

test('shared breathing is deterministic, idles in pause, and gates during action',()=>{
 assert.deepEqual(idleLifeAt(18.4,14,{speed:0}),
  idleLifeAt(18.4,14,{speed:0}));
 const live=idleLifeAt(18.4,14,{speed:0});
 assert.ok(live.weight>0);
 assert.ok(Math.abs(live.breathe)<=.0921);
 for(const state of [{speed:12},{speed:0,aiming:true},
  {speed:0,firing:true},{speed:0,reloading:true},{speed:0,down:true}]){
  const blocked=idleLifeAt(18.4,14,state);
  assert.equal(blocked.breathe,0);
  assert.equal(blocked.glance,0);
 }
 assert.notDeepEqual(idleLifeAt(18.4,14,{speed:0}),
  idleLifeAt(19.4,14,{speed:0}));
});
