import test from 'node:test';
import assert from 'node:assert/strict';
import {initialWeaponConfiguration,setWeaponAttachment}
 from '../src/equipment-weapon-assemblies.ts';
import {weaponHandlingModifiers,sightAcquisitionScale,sightSpreadScale}
 from '../src/equipment-weapon-handling.ts';

test('20.07 unmodified firearms preserve the existing handling baseline',()=>{
 const neutral=weaponHandlingModifiers();
 for(const weapon of ['carbine','smg','rifle','shotgun']){
  const actual=weaponHandlingModifiers(initialWeaponConfiguration(weapon));
  assert.ok(Math.abs(actual.turn-neutral.turn)<.00001);
  assert.ok(Math.abs(actual.acquisition-neutral.acquisition)<.00001);
  assert.equal(actual.noise,1);
  assert.equal(actual.recoilKick,1);
 }
});
test('20.07 muzzle devices change recoil and AI-audible noise with tradeoffs',()=>{
 const c=initialWeaponConfiguration('carbine');
 const bare=weaponHandlingModifiers(c);
 const brake=weaponHandlingModifiers(setWeaponAttachment(c,'muzzle','muzzle-brake'));
 const suppressed=weaponHandlingModifiers(setWeaponAttachment(c,'muzzle','muzzle-suppressor'));
 assert.ok(brake.recoilKick<bare.recoilKick);
 assert.ok(brake.noise>bare.noise);
 assert.ok(suppressed.noise<bare.noise&&suppressed.noise>.5);
 assert.ok(suppressed.turn<bare.turn);
});
test('20.07 sights have range-dependent benefits, not universal magic accuracy',()=>{
 const base=initialWeaponConfiguration('rifle');
 const iron=weaponHandlingModifiers(base);
 const reflex=weaponHandlingModifiers(setWeaponAttachment(base,'optic','optic-reflex'));
 const magnified=weaponHandlingModifiers(setWeaponAttachment(base,'optic','optic-magnified'));
 assert.ok(sightAcquisitionScale(reflex,50)<sightAcquisitionScale(iron,50));
 assert.ok(sightAcquisitionScale(magnified,50)>sightAcquisitionScale(iron,50));
 assert.ok(sightSpreadScale(magnified,'ads',220)<sightSpreadScale(iron,'ads',220));
 assert.ok(sightSpreadScale(magnified,'point',40)>=1);
 assert.equal(weaponHandlingModifiers(base),weaponHandlingModifiers(base));
});
test('20.07 stock and foregrip preserve bounded handling',()=>{
 const c=initialWeaponConfiguration('carbine');
 const compact=weaponHandlingModifiers(setWeaponAttachment(c,'stock','stock-compact'));
 const extended=weaponHandlingModifiers(setWeaponAttachment(c,'stock','stock-extended'));
 const grip=weaponHandlingModifiers(setWeaponAttachment(c,'foregrip','foregrip-vertical'));
 assert.ok(compact.turn>extended.turn);
 assert.ok(grip.recovery>1);
 for(const v of [compact,extended,grip]){
  assert.ok(v.turn>=.82&&v.turn<=1.15);
  assert.ok(v.acquisition>=.84&&v.acquisition<=1.22);
  assert.ok(v.recoilKick>=.77&&v.recoilKick<=1.16);
 }
});
