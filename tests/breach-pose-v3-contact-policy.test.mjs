import test from 'node:test';
import assert from 'node:assert/strict';
import {poseClearanceEnvelope,LOW_READY_CONTACT_LIMITS}
 from '../src/breach-pose-clearance-envelope.ts';
import {poseContactBudget} from '../src/breach-pose-contact-policy.ts';
const env=poseClearanceEnvelope('plate-heavy','full-chest','smock-jacket');
const byRegion=(region,mat,kit=env)=>({region,material:mat,
 label:region==='side-insert'?'side-plate':'side-armor',
 min:{x:0,y:0,z:0},max:{x:1,y:1,z:1}});
test('A2: hard structures cannot use any soft/attachment allowance',()=>{
 for(const region of ['side-insert','torso-upper','front-lower','side-flank'])
  for(const scale of [0,1,3,99]){
   const r=poseContactBudget(byRegion(region,'rigid'),env,scale);
   assert.deepEqual(r,{upper:.12,lower:.12});
  }
 assert.equal(LOW_READY_CONTACT_LIMITS.rigid,.12);
});
test('A2: side carrier contact is flexible but separate hard insert stays rigid',()=>{
 const flank=poseContactBudget(byRegion('side-flank','structured'),env,1);
 assert.ok(flank.lower>.34&&flank.lower<=.8);
 assert.ok(flank.upper<flank.lower);
 const plate=poseContactBudget(byRegion('side-insert','rigid'),env,100);
 assert.equal(plate.lower,.12);
});
test('A2: shoulder-wrap allowance never propagates to forearm or plate',()=>{
 const legacy=poseClearanceEnvelope('plate-legacy','full-chest','smock-jacket');
 const soft=poseContactBudget(byRegion('side-flank','soft'),legacy,1);
 assert.equal(soft.upper,2.88);
 assert.ok(soft.lower<=1.35);
 const front=poseContactBudget(byRegion('front-lower','soft'),legacy,1);
 assert.ok(front.upper<soft.upper);
 assert.ok(front.lower<soft.lower);
 const returnJoint=poseContactBudget(
  byRegion('side-front-return','soft'),legacy,1);
 assert.equal(returnJoint.upper,1.23);
 assert.equal(poseContactBudget(
  byRegion('side-insert','rigid'),legacy,10).upper,.12);
});
test('A2: regional contact budget never increases without a known region',()=>{
 const unspecified=poseContactBudget(byRegion(undefined,'soft'),env,10);
 assert.equal(unspecified.lower,.56*1.65);
 const angled=poseContactBudget(byRegion('chest-rig','soft'),env,1);
 assert.ok(angled.lower>unspecified.lower/1.65);
});
