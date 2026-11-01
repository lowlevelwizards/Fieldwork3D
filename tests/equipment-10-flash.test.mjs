import test from 'node:test';
import assert from 'node:assert/strict';
import {initialEquipmentLoadout,setEquipmentChoice,equippedFlashCharges}
 from '../src/equipment-loadouts.ts';
import {initialRoster,equipRosterGear,applyRosterIdentity}
 from '../src/breach-roster.ts';
import {newSession,planFlash} from '../src/breach-game.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';

test('flashbang kit choice supplies one physical, not unlimited, usable charge',()=>{
 const base=initialEquipmentLoadout();
 assert.equal(equippedFlashCharges(base),1);
 assert.equal(equippedFlashCharges(setEquipmentChoice(base,'tactical','tactical-smoke')),0);
 assert.equal(equippedFlashCharges(setEquipmentChoice(base,'tactical','tactical-none')),0);
});
test('unarmed team cannot author a flash even if global sandbox budget remains',()=>{
 let r=initialRoster();
 for(const p of r.members)r=equipRosterGear(r,p.id,'tactical','tactical-none');
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
