import test from 'node:test';
import assert from 'node:assert/strict';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 setWeaponAttachment} from '../src/equipment-weapon-assemblies.ts';
import {weaponHandlingModifiers,sightAcquisitionScale,sightSpreadScale}
 from '../src/equipment-weapon-handling.ts';
import {reloadMechanismFor,reloadAnimationCue}
 from '../src/breach-reload-performance.ts';

const issue=(weapon,id)=>selectWeaponFamilyPreset(
 initialWeaponConfiguration(weapon),id);
const handling=(weapon,id)=>weaponHandlingModifiers(issue(weapon,id));

test('H1 platform identity keeps class ballistics and old-save handling untouched',()=>{
 for(const weapon of ['carbine','smg','rifle','shotgun']){
  const config=initialWeaponConfiguration(weapon);
  const a=weaponHandlingModifiers(config);
  assert.equal(a.turn,1);
  assert.equal(a.acquisition,1);
  assert.equal(a.manipulation,1);
  assert.equal(a.clearanceLead,14);
  assert.equal(a.sightSystem,'irons');
  assert.equal(weaponHandlingModifiers(config),a,'immutable config is cached');
 }
 for(const [weapon,id] of [['rifle','hk-g3a3'],['rifle','g36-service'],
  ['carbine','ak-aks74u'],['smg','hk-mp5k']]){
  const config=issue(weapon,id);
  assert.equal(config.weapon,weapon,'identity does not migrate the ammo class');
  const a=weaponHandlingModifiers(config);
  for(const value of [a.turn,a.acquisition,a.recovery,a.recoilKick,
    a.stable,a.manipulation,a.clearanceLead])
   assert.ok(Number.isFinite(value)&&value>0,id);
  assert.ok(a.turn>=.82&&a.turn<=1.15);
  assert.ok(a.acquisition>=.84&&a.acquisition<=1.22);
 }
});

test('H1 weight, barrel and supported stock create distinctive tradeoffs',()=>{
 const m4=handling('carbine','ar-m4a1');
 const m16=handling('rifle','ar-m16a2');
 const g3=handling('rifle','hk-g3a3');
 const fal=handling('rifle','fal-5000');
 const fnc=handling('rifle','fnc-service');
 const ak=handling('rifle','ak-akm');
 const mp5=handling('smg','hk-mp5a3');
 const k=handling('smg','hk-mp5k');
 assert.ok(g3.turn<m16.turn&&g3.recovery<m16.recovery);
 assert.ok(fal.turn<fnc.turn&&fal.recoilKick>fnc.recoilKick);
 assert.ok(ak.manipulation>m4.manipulation);
 assert.ok(g3.manipulation>m16.manipulation);
 assert.ok(k.turn>mp5.turn&&k.recoilKick>mp5.recoilKick);
 assert.ok(k.acquisition>mp5.acquisition&&k.stable>mp5.stable,
  'stockless gun trades sight stability for compactness');
 assert.ok(m16.clearanceLead>m4.clearanceLead);
 assert.ok(handling('carbine','ak-aks74u').clearanceLead<
  handling('rifle','ak-ak74m').clearanceLead);
 assert.ok(k.clearanceLead<mp5.clearanceLead);
});

test('H1 native sight systems differ without erasing accessory optics',()=>{
 const ak=handling('rifle','ak-ak74');
 const g3=handling('rifle','hk-g3a3');
 const early=handling('rifle','hk-g3');
 const g36=handling('rifle','g36-service');
 assert.equal(ak.sightSystem,'open');
 assert.equal(g3.sightSystem,'diopter');
 assert.equal(early.sightSystem,'aperture');
 assert.equal(g36.sightSystem,'integrated');
 assert.ok(sightAcquisitionScale(ak,65)<sightAcquisitionScale(ak,230));
 assert.ok(sightAcquisitionScale(g36,65)<sightAcquisitionScale(g36,135));
 assert.ok(sightSpreadScale(g36,'ads',230)<
  sightSpreadScale(g36,'ads',135));
 const m4=issue('carbine','ar-m4a1');
 const optic=setWeaponAttachment(m4,'optic','optic-reflex');
 assert.equal(weaponHandlingModifiers(optic).sightSystem,'reflex');
 assert.ok(sightAcquisitionScale(weaponHandlingModifiers(optic),65)<
  sightAcquisitionScale(weaponHandlingModifiers(m4),65));
});

test('H1 reload hand action follows receiver controls, not HK brand shorthand',()=>{
 for(const [weapon,id,mechanism,gesture] of [
  ['rifle','fal-5000','fal-side-charge','fal-charge'],
  ['rifle','fnc-service','fnc-side-charge','fnc-charge'],
  ['rifle','g36-service','g36-top-charge','g36-charge'],
  ['rifle','hk-g3a3','hk-roller','hk-slap']]){
  const config=issue(weapon,id);
  assert.equal(reloadMechanismFor(weapon,config),mechanism);
  assert.equal(reloadAnimationCue(mechanism,'emergency',.88).gesture,gesture);
  assert.equal(reloadAnimationCue(mechanism,'retention',.88).gesture,'none');
 }
});
