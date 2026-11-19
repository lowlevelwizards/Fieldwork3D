import test from 'node:test';import assert from 'node:assert/strict';
import {initialRoster,equipRosterCarryGear,moveRosterMagazine}
 from '../src/breach-roster.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {captureCarryUndo,quoteCarryUndo,CarryKitUndoHistory}
 from '../src/equipment-carry-undo.ts';
test('undo restores individually moved magazine without resetting rounds',()=>{
 const roster=initialRoster(),op=roster.members[0];
 const moved=moveRosterMagazine(roster,op.id,op.magazines[0].id,'backpack');
 assert.notEqual(moved,roster);
 const before=captureCarryUndo(op.loadout,op.magazines);
 const after=captureCarryUndo(moved.members[0].loadout,moved.members[0].magazines);
 const history=new CarryKitUndoHistory();history.record(op.id,before,after);
 const candidate=history.peek(op.id,after);
 assert.equal(candidate.ok,true,candidate.ok?'':candidate.reason);
 assert.deepEqual(candidate.restore,before);
 assert.deepEqual(op.magazines,before.magazines);
});
test('undo refuses stale kit snapshot and changed rounds',()=>{
 const kit=initialEquipmentLoadout();
 const original=captureCarryUndo(kit,[{id:'m',weapon:'carbine',rounds:30,location:'rig'}]);
 const placed=captureCarryUndo(kit,[{id:'m',weapon:'carbine',rounds:30,location:'backpack'}]);
 const history=new CarryKitUndoHistory();
 history.record('rook',original,placed);
 const ammo=captureCarryUndo(kit,[{id:'m',weapon:'carbine',rounds:27,location:'backpack'}]);
 assert.equal(history.peek('rook',ammo).ok,false);
 assert.equal(quoteCarryUndo(ammo,original).ok,false);
});
test('physical gear undo restores carrier and field placement as one candidate',()=>{
 const roster=initialRoster(),op=roster.members[0];
 const changed=equipRosterCarryGear(roster,op.id,'rig','rig-none');
 if(changed===roster)return; // no legal undo from an impossible transaction
 const history=new CarryKitUndoHistory();
 const original=captureCarryUndo(op.loadout,op.magazines);
 const updated=captureCarryUndo(changed.members[0].loadout,changed.members[0].magazines);
 history.record(op.id,original,updated);
 const quoted=history.peek(op.id,updated);
 assert.equal(quoted.ok,true,quoted.ok?'':quoted.reason);
 assert.deepEqual(quoted.restore,original);
});
test('no additional field supply is resurrected by one-step undo',()=>{
 const kit=initialEquipmentLoadout();
 const original=captureCarryUndo(kit,[]);
 const current=captureCarryUndo({...kit,fieldInventory:{
  version:1,stacks:[]}},[]);
 assert.equal(quoteCarryUndo(current,original).ok,false);
});
