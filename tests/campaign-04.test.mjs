import test from 'node:test';import assert from 'node:assert/strict';
import {newCampaign,purchaseAmmo,purchaseMedical,resupplyOperator,treatOperator} from '../src/campaign-state.ts';
test('finite supplies are purchased and consumed without becoming negative',()=>{
 let c=newCampaign(33);
 const before=c.funds;
 c=purchaseAmmo(c);
 assert.equal(c.funds,before-120);assert.equal(c.supplies.ammo,300);
 c=purchaseMedical(c);assert.equal(c.supplies.medical,4);
 c={...c,supplies:{...c.supplies,ammo:5},operators:c.operators.map((m,i)=>i===0?{...m,magazine:0,reserve:0}:m)};
 const filled=resupplyOperator(c,'rook');
 assert.equal(filled.operators[0].magazine,5);
 assert.equal(filled.supplies.ammo,0);
 assert.deepEqual(resupplyOperator(filled,'rook'),filled);
});
test('recovery treatment is bounded and stops at zero',()=>{
 const c=newCampaign(2);
 const wounded={...c,operators:c.operators.map((m,i)=>i===0?{...m,recoveryDays:3,injuries:2}:m)};
 const treated=treatOperator(wounded,'rook');
 assert.equal(treated.operators[0].recoveryDays,1);
 assert.equal(treated.supplies.medical,wounded.supplies.medical-1);
 const healed=treatOperator(treated,'rook');
 assert.equal(healed.operators[0].recoveryDays,0);
 assert.equal(healed.operators[0].injuries,0);
 assert.deepEqual(treatOperator(healed,'rook'),healed);
});