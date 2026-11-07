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

test('A3: only the protective insert is rigid, not the outer sewn carrier',()=>{
 for(const name of ['plate-jpc','plate-slick','plate-standard','plate-heavy']){
  const e=poseClearanceEnvelope(name,'no-rig','smock-jacket');
  const hard=e.boxes.filter(b=>b.region==='front-insert');
  const bag=e.boxes.filter(b=>b.region==='front-lower'||b.region==='front-taper');
  assert.equal(hard.length,1,name);
  assert.equal(hard[0].material,'rigid',name);
  assert.ok(bag.every(x=>x.material==='structured'),name);
  assert.ok(hard[0].max.z<bag[0].max.z,
   name+' insert must not fill compressible fabric edge');
 }
 const heavy=poseClearanceEnvelope('plate-heavy','no-rig','smock-jacket');
 const p=heavy.boxes.find(v=>v.region==='front-insert');
 assert.ok(p.max.x>p.min.x&&p.max.y>p.min.y);
 const middle=evaluateSleeveArmorContact(
  V(1,4,7),V(7,1,0),V(9,-3,0),heavy,10);
 assert.equal(middle.valid,false,
  'rigid plate core must still reject a crossing sleeve');
 assert.ok(middle.hardDepth>LOW_READY_CONTACT_LIMITS.rigid);
});

test('B9: torso shoulder seam is localized; plate/forearm collision unchanged',()=>{
 const e=poseClearanceEnvelope('plate-heavy','full-chest','smock-jacket');
 const shoulder=V(1,4,-7),elbow=V(3,2,-4),wrist=V(7,-3,0);
 const current=evaluateSleeveArmorContact(shoulder,elbow,wrist,e);
 const strict={...e,boxes:e.boxes.map(v=>v.region==='torso-upper'?
  {...v,region:undefined}:v)};
 const previous=evaluateSleeveArmorContact(shoulder,elbow,wrist,strict);
 assert.ok(current.hardDepth<=previous.hardDepth+1e-6,
  'anatomical seam must not make hard contact worse');
 const center=evaluateSleeveArmorContact(
  V(1,4,-7),V(3,0,0),V(6,-3,0),e);
 assert.equal(center.valid,false,
  'central upper-arm and forearm penetration remains forbidden');
 assert.ok(center.hardDepth>LOW_READY_CONTACT_LIMITS.rigid);
 assert.equal(LOW_READY_CONTACT_LIMITS.rigid,.12);
});
