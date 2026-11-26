import test from 'node:test';import assert from 'node:assert/strict';
import {newCampaign,hireRecruit,retireOperator,assignOperatorToSlot,readCampaign} from '../src/campaign-state.ts';
test('retired reserve is retained in history and cannot be deployed',()=>{
 let c=hireRecruit(newCampaign(55));
 const recruit=c.operators.at(-1),stock=stockByPlatform(c)[recruit.weapon];
 c=retireOperator(c,recruit.id);
 assert.equal(c.operators.at(-1).status,'retired');
 assert.equal(stockByPlatform(c)[recruit.weapon],stock+1);
 assert.ok(c.journal.some(e=>e.operatorId===recruit.id&&e.kind==='retirement'));
 assert.deepEqual(assignOperatorToSlot(c,0,recruit.id),c);
 assert.deepEqual(readCampaign(JSON.stringify(c)),c);
});
test('active squad members cannot retire and save loader repairs retired assignments',()=>{
 const c=hireRecruit(newCampaign(61));
 assert.deepEqual(retireOperator(c,'rook'),c);
 const retired=retireOperator(c,c.operators.at(-1).id);
 const invalid={...retired,squadIds:[retired.operators.at(-1).id,'moss','ash','vale']};
 assert.deepEqual(readCampaign(JSON.stringify(invalid)).squadIds,['rook','moss','ash','vale']);
});
import {catalogOwnedStock} from '../src/equipment-weapon-ownership.ts';
const stockByPlatform=c=>Object.fromEntries(['carbine','smg','rifle','shotgun'].map(p=>[p,catalogOwnedStock(c).filter(w=>w.platform===p).length]));
