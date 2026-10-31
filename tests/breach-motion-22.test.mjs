import test from 'node:test';
import assert from 'node:assert/strict';
import {operatorMotionTraits} from '../src/breach-operator-personality.ts';
import {bodyFromContacts} from '../src/breach-body-motion.ts';
const feet=[-1,1].map(sign=>({position:{x:0,y:sign*5.6},
  height:0,contact:true,worldYaw:0,phase:'planted',progress:1}));
test('operator identity changes restrained physical personality, never contact timing',()=>{
 const a=operatorMotionTraits('rook'),b=operatorMotionTraits('rook');
 const c=operatorMotionTraits('vale');
 assert.deepEqual(a,b);
 assert.notDeepEqual(a,c);
 assert.ok(a.looseness>=.94&&a.looseness<=1.06);
 assert.ok(a.packScale>=.93&&a.packScale<=1.07);
});
test('individual idle breathing is deterministic and fully suppressed in action',()=>{
 const a=operatorMotionTraits('rook'),b=operatorMotionTraits('vale');
 const motion=(traits,velocity=0)=>bodyFromContacts({feet,velocity,heading:0,
  travelYaw:0,turning:0,injury:0,posture:'stand',seconds:1.25,
  personalPhase:traits.phase,personalLooseness:traits.looseness,
  tacticalTension:velocity?1:0});
 const first=motion(a),second=motion(b);
 assert.deepEqual(first,motion(a));
 assert.notEqual(first.breath,second.breath);
 assert.equal(motion(a,30).breath,0);
});
