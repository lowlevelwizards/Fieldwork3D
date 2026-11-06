import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {poseClearanceEnvelope,evaluateSleeveArmorContact,
 evaluateTwoArmClearance,LOW_READY_CONTACT_LIMITS} from
 '../src/breach-pose-clearance-envelope.ts';
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
test('fitted box materials retain rigid torso, soft flak and rig shells',()=>{
 const heavy=poseClearanceEnvelope('plate-heavy','full-chest','smock-jacket');
 const flak=poseClearanceEnvelope('soft-flak','full-chest','smock-jacket');
 assert.ok(heavy.boxes.some(b=>b.label==='front-armor'&&b.material==='rigid'));
 assert.ok(heavy.boxes.some(b=>b.label==='chest-rig'&&b.material==='soft'));
 assert.ok(flak.boxes.some(b=>b.label==='front-armor'&&b.material==='soft'));
 assert.ok(LOW_READY_CONTACT_LIMITS.rigid<LOW_READY_CONTACT_LIMITS.soft);
});
test('oriented rectangular sleeves reject obvious plate/torso penetration',()=>{
 const envelope=poseClearanceEnvelope('plate-heavy','no-rig','bdu-shirt');
 const crossing=evaluateSleeveArmorContact(
  V(1,4,7),V(6,-2,1),V(12,-5,-1),envelope);
 const outside=evaluateSleeveArmorContact(
  V(1,4,7),V(4,-4,13),V(10,-9,14),envelope);
 assert.equal(crossing.valid,false);
 assert.ok(crossing.hardDepth>LOW_READY_CONTACT_LIMITS.rigid);
 assert.ok(outside.hardDepth<crossing.hardDepth);
});
test('cheat budget never applies to rigid core and is clamped',()=>{
 const envelope=poseClearanceEnvelope('plate-heavy','full-chest','smock-jacket');
 const inputs=[V(1,4,7),V(6,-2,2),V(11,-4,-1)];
 const conservative=evaluateSleeveArmorContact(...inputs,envelope,1);
 const permissive=evaluateSleeveArmorContact(...inputs,envelope,10);
 assert.equal(conservative.hardDepth,permissive.hardDepth);
 assert.equal(conservative.contacts.filter(c=>c.material==='rigid').length,
  permissive.contacts.filter(c=>c.material==='rigid').length);
 const two=evaluateTwoArmClearance(
  [V(1,4,-7),V(1,4,7)],[V(4,-3,-9),V(4,-3,9)],
  [V(8,-6,-9),V(8,-6,9)],envelope,1.4);
 assert.equal(two.hardDepth,Math.max(two.left.hardDepth,two.right.hardDepth));
});
