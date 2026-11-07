import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {poseClearanceEnvelope,evaluateSleeveArmorContact,
 LOW_READY_CONTACT_LIMITS} from '../src/breach-pose-clearance-envelope.ts';
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
test('A1: side-wrap is physical flank plus short returns, not solid space',()=>{
 const e=poseClearanceEnvelope('soft-flak','no-rig','smock-jacket');
 const flank=e.boxes.filter(b=>b.region==='side-flank');
 const front=e.boxes.filter(b=>b.region==='side-front-return');
 const rear=e.boxes.filter(b=>b.region==='side-rear-return');
 assert.equal(flank.length,2);
 assert.equal(front.length,2);
 assert.equal(rear.length,2);
 for(const v of flank)
  assert.ok(v.max.z-v.min.z<2.5,'thin lateral flank instead of phantom wall');
 for(const v of [...front,...rear])
  assert.ok(v.max.x-v.min.x<2.5,'short return not solid body-width block');
});
test('A1: actual skeletal carrier side has two separate narrow bands',()=>{
 const e=poseClearanceEnvelope('plate-jpc','no-rig','combat-shirt');
 assert.equal(e.boxes.filter(v=>v.region==='side-flank').length,4);
 assert.ok(e.boxes.filter(v=>v.region==='side-flank')
  .every(v=>v.max.y-v.min.y<1.1));
 const upper=e.boxes.find(v=>v.region==='front-taper');
 const lower=e.boxes.find(v=>v.region==='front-lower');
 assert.ok(upper.max.z<lower.max.z,'front shoulder silhouette must taper');
});
test('A1: heavy armor retains an independent rigid ballistic side insert',()=>{
 const heavy=poseClearanceEnvelope('plate-heavy','no-rig','smock-jacket');
 const rigid=heavy.boxes.filter(v=>v.region==='side-insert');
 assert.equal(rigid.length,2);
 assert.ok(rigid.every(v=>v.material==='rigid'));
 assert.equal(LOW_READY_CONTACT_LIMITS.rigid,.12);
 const result=evaluateSleeveArmorContact(
  V(1,4,7),V(1,-2,8),V(2,-5,9),heavy,10);
 assert.equal(result.hardDepth,
  evaluateSleeveArmorContact(V(1,4,7),V(1,-2,8),V(2,-5,9),heavy,1).hardDepth);
});
test('A1: chest center remains a real rigid obstacle after shoulder shaping',()=>{
 const e=poseClearanceEnvelope('plate-heavy','no-rig','bdu-shirt');
 assert.equal(e.boxes.filter(v=>v.label==='torso').length,2);
 const invalid=evaluateSleeveArmorContact(
  V(1,4,7),V(3,0,0),V(6,-3,0),e);
 assert.equal(invalid.valid,false);
 assert.ok(invalid.hardDepth>LOW_READY_CONTACT_LIMITS.rigid);
});
