import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveTacticalPick} from '../src/ui/tactical-target-resolver.ts';
import {medicalStatusMarker} from '../src/ui/tactical-person-status.ts';
import {newMedicalCondition,registerWound,stabilizeWound} from '../src/breach-medical-wounds.ts';
import {impactFinishScale,PLASTER_IMPACT_SCALE} from '../src/rendering/breach-impact-finish-scale.ts';

test('a visible person directly tapped over a route wins without route ownership',()=>{
 const person={kind:'person',personId:'civilian-1',distancePx:8,corePx:20};
 assert.equal(resolveTacticalPick([
   {kind:'route',owner:'rook',distancePx:0,corePx:14},person
 ],'rook'),person);
 assert.equal(resolveTacticalPick([{...person,distancePx:21}],'rook'),null);
});
test('clinical badge tracks existing loss and stops progress when stabilized',()=>{
 const medical=newMedicalCondition();
 const a={health:1,medical};
 assert.equal(medicalStatusMarker(a),null);
 registerWound(medical,1,'head',2,0);
 medical.bloodLoss=1;
 assert.equal(medicalStatusMarker(a).label,'BLEEDING');
 assert.equal(medicalStatusMarker(a).remaining,.75);
 a.health=0;a.downedAt=1;medical.bloodLoss=3;
 assert.equal(medicalStatusMarker(a).label,'CRITICAL');
 assert.equal(medicalStatusMarker(a).remaining,.25);
 stabilizeWound(medical,1);
 assert.equal(medicalStatusMarker(a),null);
 a.deathAt=2;assert.equal(medicalStatusMarker(a),null);
});
test('unverified down state never claims a bleed-out countdown',()=>{
 const a={health:0,medical:newMedicalCondition()};
 assert.equal(medicalStatusMarker(a),null);
});
test('surface adjustment is cosmetic and does not scale unknown or non-wall marks',()=>{
 assert.equal(PLASTER_IMPACT_SCALE,.85);
 assert.equal(impactFinishScale(null,undefined),1);
 assert.equal(impactFinishScale(null,{kind:'door'}),1);
});
