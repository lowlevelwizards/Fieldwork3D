import test from 'node:test';import assert from 'node:assert/strict';
import {newSession} from '../src/breach-game.ts';
import {equipmentTrainingSite} from '../src/equipment-training-range.ts';
import {captureRangeTrial,rangeTrialLabel} from '../src/equipment-training-diagnostics.ts';
import {setWeaponAttachment,initialWeaponConfiguration}
 from '../src/equipment-weapon-assemblies.ts';
test('25.02 captures only actual measured training metrics for comparison',()=>{
 const s=newSession(0,undefined,'floor-plan','small',undefined,equipmentTrainingSite());
 const a=s.operators.find(a=>a.id==='rook');
 a.weaponConfiguration=initialWeaponConfiguration('carbine');
 a.shots=10;s.seconds=14.3;
 const base=captureRangeTrial(s,'rook');
 a.weaponConfiguration=setWeaponAttachment(a.weaponConfiguration,'muzzle','muzzle-suppressor');
 a.shots=5;s.seconds=7.8;
 const compared=captureRangeTrial(s,'rook');
 assert.ok(compared.massKg>base.massKg);
 assert.equal(base.shots,10);
 assert.equal(compared.shots,5);
 assert.equal(base.durationSeconds,14.3);
 assert.match(rangeTrialLabel(base),/FIRED 10/);
});
test('25.02 comparison never records regular mission or unknown operators',()=>{
 const regular=newSession();
 assert.equal(captureRangeTrial(regular,'rook'),null);
 assert.equal(captureRangeTrial(regular,'no-such-operator'),null);
 const practice=newSession(0,undefined,'floor-plan','small',undefined,equipmentTrainingSite());
 assert.equal(captureRangeTrial(practice,'bad'),null);
});
