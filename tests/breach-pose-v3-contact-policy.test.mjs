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
 assert.ok(flank.lower>=1.5&&flank.lower<=1.55);
 assert.ok(flank.upper<flank.lower);
 const front=poseContactBudget(byRegion('side-front-return','structured'),env,1);
 assert.equal(front.lower,1.52);
 const soft=poseContactBudget(byRegion('side-flank','soft'),env,1);
 assert.equal(soft.lower,1.55);
 assert.equal(poseContactBudget(byRegion('side-front-return','soft'),env,1).lower,1.45);
 const plate=poseContactBudget(byRegion('side-insert','rigid'),env,100);
 assert.equal(plate.lower,.12);
});
test('A2: shoulder-wrap allowance never propagates to forearm or plate',()=>{
 const legacy=poseClearanceEnvelope('plate-legacy','full-chest','smock-jacket');
 const soft=poseContactBudget(byRegion('side-flank','soft'),legacy,1);
 assert.equal(soft.upper,2.88);
 assert.equal(soft.lower,1.55);
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

test('B2: larger forearm fabric clearance cannot affect a real side plate',()=>{
 const heavy=poseClearanceEnvelope('plate-heavy','full-chest','smock-jacket');
 const fabric=heavy.boxes.filter(x=>x.region==='side-flank'&&
  x.material==='structured');
 const plate=heavy.boxes.filter(x=>x.region==='side-insert');
 assert.ok(fabric.length>0);
 assert.equal(plate.length,2);
 for(const box of plate){
  const budget=poseContactBudget(box,heavy,99);
  assert.equal(budget.lower,.12);
  assert.equal(budget.upper,.12);
 }
 for(const x of heavy.boxes.filter(x=>x.region==='torso-core'||
  x.region==='torso-upper')){
  assert.deepEqual(poseContactBudget(x,heavy,99),{upper:.12,lower:.12});
 }
});
