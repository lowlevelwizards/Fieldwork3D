import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../src/'+name,import.meta.url),'utf8');
test('Campaign armory records carry transactions and passes undo to final owner',()=>{
 const s=read('campaign-ui.ts'),flow=read('breach-campaign-flow.ts');
 assert.match(s,/private readonly carryUndo=new CarryKitUndoHistory\(\)/);
 assert.match(s,/this\.carryUndo\.record\(id,captureCarryUndo/);
 assert.match(s,/UNDO LAST CARRY MOVE/);
 assert.match(s,/this\.handlers\.undoCarryGear\(id,expected,undo.restore\)/);
 assert.match(flow,/undoCampaignCarryGear\(c,id,expected,before\)/);
});
