import test from 'node:test';
import assert from 'node:assert/strict';
import {passageWaitMessage} from '../src/breach-motor-passage.ts';

test('R1.07: occupied throat and real counterflow explain long solo waits',()=>{
 assert.equal(passageWaitMessage('opposing',2.99),null);
 assert.match(passageWaitMessage('opposing',3),/COUNTERFLOW/);
 assert.equal(passageWaitMessage('occupied',4.49),null);
 assert.match(passageWaitMessage('occupied',4.5),/OCCUPIED/);
});
test('R1.07: ordinary rank and spacing waits do not fake deadlocks',()=>{
 for(const status of ['free','sequence','spacing'])
  assert.equal(passageWaitMessage(status,8,false),null);
 assert.equal(passageWaitMessage('spacing',5.49,true),null);
 assert.match(passageWaitMessage('spacing',5.5,true),/SQUAD ENTRY QUEUED/);
});
