import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedReloadPouchSlot,v4ReloadPickupPhase,
 v4ReloadPouchReach,v4MagazineInHand,v4SelectedPouchVisible}
 ,v4AuthoredPouchAnchor
 from '../src/breach-reload-v4-magazine-handoff.ts';
import * as THREE from 'three';
const item=(id,location,kind='magazine')=>({id,location,kind});
test('B28 chosen magazine ID corresponds to its actual rig/belt/pocket cell',()=>{
 const ledger=[item('R0','rig'),item('medic','rig','medical'),
  item('B0','belt'),item('R1','rig'),item('P0','pocket'),
  item('R2','rig'),item('BACK','backpack')];
 assert.deepEqual(selectedReloadPouchSlot(ledger,'R1'),
  {id:'R1',location:'rig',index:1});
 assert.deepEqual(selectedReloadPouchSlot(ledger,'B0'),
  {id:'B0',location:'belt',index:0});
 assert.deepEqual(selectedReloadPouchSlot(ledger,'P0'),
  {id:'P0',location:'pocket',index:0});
 assert.equal(selectedReloadPouchSlot(ledger,'BACK'),null);
 assert.equal(selectedReloadPouchSlot(ledger,'not-in-inventory',true),null);
 assert.equal(selectedReloadPouchSlot(ledger,null),null);
 assert.deepEqual(selectedReloadPouchSlot(ledger,null,true),
  {id:'R0',location:'rig',index:0});
 assert.deepEqual(selectedReloadPouchSlot([
  item('B','belt'),item('P','pocket')],undefined,true),
  {id:'B',location:'belt',index:0});
});
test('B28 transport remains pure across every simulation magazine event',()=>{
 for(const t of [0,.19,.29,.35,.47,.51,.60,.70,.76,.82,1]){
  assert.equal(v4ReloadPouchReach(t),v4ReloadPouchReach(t));
  assert.ok(v4ReloadPouchReach(t)>=0&&v4ReloadPouchReach(t)<=1);
 }
 for(const t of [0,.35,.76,.82,1])
  assert.equal(v4ReloadPouchReach(t),0,t);
 for(const t of [.51,.57])assert.equal(v4ReloadPouchReach(t),1,t);
 assert.equal(v4ReloadPickupPhase(.28),'stowed');
 assert.equal(v4ReloadPickupPhase(.56),'retrieving');
 assert.equal(v4ReloadPickupPhase(.7),'held');
 assert.equal(v4ReloadPickupPhase(.82),'inserted');
 assert.equal(v4MagazineInHand(.4),true);
 assert.equal(v4MagazineInHand(.52),false);
 assert.equal(v4MagazineInHand(.70),true);
 assert.equal(v4MagazineInHand(.82),false);
 assert.equal(v4SelectedPouchVisible(.57),true);
 assert.equal(v4SelectedPouchVisible(.60),false);
});
test('B28 pouch reach has smooth endpoints for replay seek and interruption',()=>{
 for(const t of [.35,.51,.60,.76]){
  const lo=v4ReloadPouchReach(t-1e-6),
   hi=v4ReloadPouchReach(t+1e-6);
  assert.ok(Math.abs(lo-hi)<1e-5,'continuous '+t);
 }
});

test('B28 authored pouch socket is frame-history-independent for rig and belt',()=>{
 const legacy=new THREE.Group(),chest=new THREE.Group(),hip=new THREE.Group();
 legacy.add(chest,hip);chest.position.y=26;hip.position.y=20.2;
 const rig=new THREE.Group(),belt=new THREE.Group();chest.add(rig);hip.add(belt);
 rig.position.set(1,2,-3);
 const a=new THREE.Mesh();a.position.set(7,-2,-1);rig.add(a);
 const b=new THREE.Mesh();b.position.set(2,-4,5);belt.add(b);
 const beforeRig=v4AuthoredPouchAnchor(a,chest,hip);
 const beforeBelt=v4AuthoredPouchAnchor(b,chest,hip);
 assert.ok(beforeRig?.distanceTo(new THREE.Vector3(8,.75,-4))<1e-8);
 assert.ok(beforeBelt?.distanceTo(new THREE.Vector3(2,-9.05,5))<1e-8);
 chest.rotation.y=.7;chest.position.set(6,30,0);
 hip.rotation.z=.25;hip.position.set(2,19,0);
 assert.ok(beforeRig?.distanceTo(v4AuthoredPouchAnchor(a,chest,hip))<1e-12);
 assert.ok(beforeBelt?.distanceTo(v4AuthoredPouchAnchor(b,chest,hip))<1e-12);
 const floating=new THREE.Mesh();
 assert.equal(v4AuthoredPouchAnchor(floating,chest,hip),null);
});
