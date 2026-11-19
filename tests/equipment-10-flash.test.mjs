import test from 'node:test';
import assert from 'node:assert/strict';
import {initialEquipmentLoadout,setEquipmentChoice,equippedFlashCharges}
 from '../src/equipment-loadouts.ts';
import {initialRoster,equipRosterGear,equipRosterFieldInventory,applyRosterIdentity}
 from '../src/breach-roster.ts';
import {newSession,planFlash} from '../src/breach-game.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';

test('physical flash inventory is distinct from the legacy tactical selector',()=>{
 const base=initialEquipmentLoadout();
 assert.equal(equippedFlashCharges(base),1);
 assert.equal(equippedFlashCharges(setEquipmentChoice(base,'tactical','tactical-smoke')),1);
 assert.equal(equippedFlashCharges(setEquipmentChoice(base,'tactical','tactical-none')),1);
 assert.equal(equippedFlashCharges({...base,fieldInventory:{version:1,stacks:[]}}),0,
  'physical removal, not changing a legacy selector, actually unissues a flash');
});
test('unarmed team cannot author a flash even if global sandbox budget remains',()=>{
 let r=initialRoster();
 for(const p of r.members){
  r=equipRosterGear(r,p.id,'tactical','tactical-none');
  r=equipRosterFieldInventory(r,p.id,{version:1,stacks:[]});
 }
 const s=newSession();
 applyRosterIdentity(s,r);
 assert.equal(s.flashRemaining,0);
 assert.equal(s.operators.find(x=>x.id==='rook').flashCharges,0);
 assert.equal(planFlash(s,'rook',{x:200,y:300}),false);
});
test('existing mission global cap remains two and consumption persists in replay',()=>{
 const s=newSession();
 applyRosterIdentity(s,initialRoster());
 assert.equal(s.flashRemaining,2);
 assert.equal(s.operators.find(x=>x.id==='rook').flashCharges,1);
 const frame=snapshot(s);
 s.operators.find(x=>x.id==='rook').flashCharges=0;
 applyReplayFrame(s,frame);
 assert.equal(s.operators.find(x=>x.id==='rook').flashCharges,1);
});
