import test from 'node:test';
import assert from 'node:assert/strict';
import {FieldInventoryUndoHistory} from '../src/equipment-field-undo.ts';
const kit=(quantity)=>({version:1,stacks:[{itemId:'flashbang',quantity,location:'rig'}]});
test('undo restores the immediately preceding physical equipment snapshot',()=>{
 const history=new FieldInventoryUndoHistory();
 history.record('rook',kit(1),kit(2));
 const undo=history.peek('rook',kit(2));
 assert.equal(undo.stacks[0].quantity,1);
 undo.stacks[0].quantity=99;
 assert.equal(history.peek('rook',kit(2)).stacks[0].quantity,1);
 history.clear('rook');
 assert.equal(history.peek('rook',kit(2)),null);
});
test('undo never applies against a stale inventory from another operation',()=>{
 const history=new FieldInventoryUndoHistory();
 history.record('rook',kit(1),kit(3));
 assert.equal(history.peek('rook',kit(2)),null);
 assert.equal(history.peek('moss',kit(3)),null);
});
