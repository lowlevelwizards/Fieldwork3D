import test from 'node:test';
import assert from 'node:assert/strict';
import {recordCompletedGeneratedEntry,clearCompletedEntryOnNewOrder,
 allowOpeningYieldAtCompletedEntry,COMPLETED_ENTRY_REST_RADIUS}
 from '../src/breach-completed-entry-leaf-yield.ts';

test('D3.20B accepts genuine physical entry, limits repeated same-leaf displacement',()=>{
 const moss={id:'moss',plan:[]};
 const original={x:319,y:570};
 assert.equal(allowOpeningYieldAtCompletedEntry(moss,'FRONT',{x:500,y:500}),true);
 recordCompletedGeneratedEntry(moss,{id:12,entryDoorId:'FRONT',p:original});
 original.x=999; // anchor copied, never mutates authored node
 assert.equal(allowOpeningYieldAtCompletedEntry(moss,'FRONT',{x:332,y:570}),true);
 assert.equal(allowOpeningYieldAtCompletedEntry(moss,'FRONT',{x:332.078400773506,y:583.9473184970544}),false);
 assert.equal(allowOpeningYieldAtCompletedEntry(moss,'FRONT',{x:319+COMPLETED_ENTRY_REST_RADIUS,y:570}),true);
 assert.equal(allowOpeningYieldAtCompletedEntry(moss,'OTHER',{x:500,y:500}),true,
  'unrelated door arbitration remains untouched');
 assert.equal(moss.plan.length,0);
});

test('D3.20B never holds back active authored orders or another actor',()=>{
 const moss={id:'moss',plan:[]},rook={id:'rook',plan:[]};
 recordCompletedGeneratedEntry(moss,{id:12,entryDoorId:'FRONT',p:{x:319,y:570}});
 assert.equal(allowOpeningYieldAtCompletedEntry(rook,'FRONT',{x:700,y:700}),true);
 clearCompletedEntryOnNewOrder(moss,12);
 assert.equal(allowOpeningYieldAtCompletedEntry(moss,'FRONT',{x:500,y:500}),false);
 clearCompletedEntryOnNewOrder(moss,13);
 assert.equal(allowOpeningYieldAtCompletedEntry(moss,'FRONT',{x:500,y:500}),true);
 recordCompletedGeneratedEntry(moss,{id:14,entryDoorId:'FRONT',p:{x:319,y:570}});
 moss.plan=[{id:15,kind:'move',p:{x:600,y:500}}];
 assert.equal(allowOpeningYieldAtCompletedEntry(moss,'FRONT',{x:500,y:500}),true);
});
