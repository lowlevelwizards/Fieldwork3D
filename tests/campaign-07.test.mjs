import test from 'node:test';import assert from 'node:assert/strict';
import {newCampaign,hireRecruit,assignOperatorToSlot,tacticalSlotOperator,readCampaign} from '../src/campaign-state.ts';
test('recruitment expands unique careers and deployment slots map consistently',()=>{
 const first=newCampaign(41);
 const c=hireRecruit(first);
 assert.equal(c.operators.length,5);
 assert.equal(c.funds,first.funds-450);
 const recruit=c.operators.at(-1);
 assert.ok(!first.operators.some(o=>o.callsign===recruit.callsign));
 const chosen=assignOperatorToSlot(c,1,recruit.id);
 assert.equal(tacticalSlotOperator(chosen,'moss')?.id,recruit.id);
 assert.equal(new Set(chosen.squadIds).size,4);
 assert.equal(chosen.squadIds.includes('moss'),false);
 assert.equal(chosen.operators.find(o=>o.id==='moss').missions,0);
 assert.deepEqual(readCampaign(JSON.stringify(chosen)),chosen);
});
test('reassignment swaps existing members instead of duplicating careers',()=>{
 let c=newCampaign(20);
 c=assignOperatorToSlot(c,0,'moss');
 assert.deepEqual(c.squadIds.slice(0,2),['moss','rook']);
 assert.deepEqual(assignOperatorToSlot(c,1,'not-an-operator'),c);
 const legacy={...c};delete legacy.squadIds;
 assert.deepEqual(readCampaign(JSON.stringify(legacy))?.squadIds,['rook','moss','ash','vale']);
});
