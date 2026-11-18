import test from 'node:test';
import assert from 'node:assert/strict';
import {noteCompletedGeneratedEntry,releaseCompletedGeneratedEntry,
 legalCompletedEntryIdleYield} from '../src/breach-completed-entry-yield.ts';

test('D3.20B completed ENTRY permits real local yielding but not loss of physical arrival',()=>{
 const moss={id:'moss'};
 const goal={x:319,y:570};
 assert.equal(legalCompletedEntryIdleYield(moss,{x:400,y:600}),true,
  'unanchored actors retain the original passage behavior');
 noteCompletedGeneratedEntry(moss,12,goal);
 goal.x=999;
 assert.equal(legalCompletedEntryIdleYield(moss,{x:319,y:570}),true);
 assert.equal(legalCompletedEntryIdleYield(moss,{x:333.8,y:570}),true,
  'a completed actor can still physically yield almost a body diameter');
 assert.equal(legalCompletedEntryIdleYield(moss,{x:334.6,y:570}),false,
  'idle traffic may not silently undo a real completed ENTRY arrival');
 assert.equal(legalCompletedEntryIdleYield(moss,{x:332.0784,y:583.9473}),false,
  'the actual failed Motel endpoint is outside allowed physical arrival');
});

test('D3.20B a new order releases the previous generated rest anchor',()=>{
 const actor={id:'rook'};
 noteCompletedGeneratedEntry(actor,10,{x:50,y:50});
 releaseCompletedGeneratedEntry(actor,10);
 assert.equal(legalCompletedEntryIdleYield(actor,{x:66,y:50}),false,
  'the same currently completing order retains its anchor');
 releaseCompletedGeneratedEntry(actor,11);
 assert.equal(legalCompletedEntryIdleYield(actor,{x:100,y:100}),true,
  'a new authored MOVE, WATCH or other order is never constrained by old GO');
});

test('D3.20B anchors remain per actor and never move any body',()=>{
 const a={id:'a',p:{x:2,y:3}},b={id:'b',p:{x:7,y:9}};
 noteCompletedGeneratedEntry(a,1,{x:10,y:12});
 assert.equal(legalCompletedEntryIdleYield(b,{x:500,y:500}),true);
 assert.deepEqual(a.p,{x:2,y:3});
 assert.deepEqual(b.p,{x:7,y:9});
});
