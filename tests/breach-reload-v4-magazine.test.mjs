import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedReloadPouchSlot,v4ReloadPickupPhase,
 v4ReloadPouchReach,v4MagazineInHand,v4SelectedPouchVisible}
 from '../src/breach-reload-v4-magazine-handoff.ts';
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
