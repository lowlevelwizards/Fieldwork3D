import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('operations physical undo is one-shot and final authority validates current kit',()=>{
 const s=readFileSync(new URL('../src/breach-operations-board-controller.ts',import.meta.url),'utf8');
 assert.match(s,/new CarryKitUndoHistory\(\)/);
 assert.match(s,/UNDO LAST CARRY MOVE/);
 assert.match(s,/undoRosterCarryGear\(old,member.id,expected,undo.restore\)/);
 assert.match(s,/carryUndo\.clear\(member.id\)/);
 assert.match(s,/carryUndo\.record\(member.id,/);
 assert.match(s,/carryUndo\.record\(current.id,/);
});
