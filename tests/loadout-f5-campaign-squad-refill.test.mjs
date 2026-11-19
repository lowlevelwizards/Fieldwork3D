import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newCampaign,readCampaign,acceptContract,
 resupplyOperator,resupplyMedicalOperator,hireRecruit}
 from '../src/campaign-state.ts';
import {quoteCampaignSquadRefill,refillCampaignSquad,quoteCampaignOperatorRefill}
 from '../src/equipment-campaign-squad-refill.ts';

const depleted=()=>{
 let c=newCampaign(981);
 c={...c,operators:c.operators.map((op,index)=>({
  ...op,magazine:Math.max(0,op.magazine-5-index),
  reserve:Math.max(0,op.reserve-9-index),
  medicalSupplies:op.id==='rook'?
   {'tourniquet':0,'field-dressing':0,'trauma-dressing':0}:op.medicalSupplies
 }))};
 return c;
};
const manual=c=>c.squadIds.reduce((state,id)=>
 resupplyMedicalOperator(resupplyOperator(state,id),id),c);
test('F5: quote and one transaction exactly match existing sequential stock authority',()=>{
 const c=depleted(),original=structuredClone(c),q=quoteCampaignSquadRefill(c);
 assert.equal(q.available,true);assert.equal(q.lines.length,4);
 assert.ok(q.roundsWanted>0&&q.medicalWanted===1);
 assert.equal(q.partial,false);
 const next=refillCampaignSquad(c);
 assert.deepEqual(next,manual(c));
 assert.equal(c.supplies.ammo-next.supplies.ammo,q.cost.ammo);
 assert.equal(c.supplies.medical-next.supplies.medical,q.cost.medical);
 assert.equal(q.roundsIssued,q.cost.ammo);
 assert.equal(q.medicalIssued,q.cost.medical);
 assert.deepEqual(c,original,'preview and commit never mutate their input');
 assert.deepEqual(readCampaign(JSON.stringify(next)),next);
 assert.equal(refillCampaignSquad(next),next,'fully stocked squad is an identity no-op');
});
test('F5: partial HQ ammo and medical stock are forecast, never overspent or hidden',()=>{
 let c=depleted();
 c={...c,supplies:{...c.supplies,ammo:11,medical:0}};
 const q=quoteCampaignSquadRefill(c);
 assert.equal(q.roundsIssued,11);
 assert.equal(q.cost.ammo,11);
 assert.equal(q.medicalIssued,0);
 assert.equal(q.cost.medical,0);
 assert.equal(q.roundsShort,q.roundsWanted-11);
 assert.ok(q.partial);
 assert.equal(q.lines[0].roundsIssued,11);
 assert.ok(q.lines[1].roundsShort>0);
 const next=refillCampaignSquad(c);
 assert.equal(next.supplies.ammo,0);
 assert.equal(next.supplies.medical,0);
 assert.deepEqual(next,manual(c));
 assert.equal(next.funds,c.funds,'refill uses owned reserves, not credits');
});
test('F5: no stock produces no mutation and a truthful partial quote',()=>{
 const c={...depleted(),supplies:{medical:0,ammo:0,flash:0}};
 const q=quoteCampaignSquadRefill(c);
 assert.equal(q.changed,false);
 assert.equal(q.partial,true);
 assert.equal(q.roundsIssued,0);
 assert.equal(q.medicalIssued,0);
 assert.equal(refillCampaignSquad(c),c);
});
test('F5: accepted contracts lock both quote and actual refill',()=>{
 const c=depleted(),locked=acceptContract(c,c.contracts[0].id);
 assert.equal(quoteCampaignSquadRefill(locked).available,false);
 assert.equal(quoteCampaignSquadRefill(locked).changed,false);
 assert.equal(quoteCampaignSquadRefill(locked).reason,'COMPLETE CURRENT DEPLOYMENT FIRST');
 assert.equal(refillCampaignSquad(locked),locked);
});
test('F5: squad order and distinct IDs define one deterministic finite stock spend',()=>{
 let c=depleted();
 c=hireRecruit(c);
 const spare=c.operators.at(-1);
 const originalSpare=structuredClone(spare);
 const duplicate={...c,squadIds:['rook','rook','moss','ash']};
 const q=quoteCampaignSquadRefill(duplicate);
 assert.deepEqual(q.lines.map(l=>l.id),['rook','moss','ash']);
 const done=refillCampaignSquad(duplicate);
 assert.deepEqual(done.operators.find(o=>o.id===spare.id),originalSpare);
 assert.deepEqual(done,manual({...duplicate,squadIds:['rook','moss','ash']}));
});
test('F5: operator quote matches actual individual service and conserves magazine IDs',()=>{
 const c=depleted(),op=c.operators[0];
 const q=quoteCampaignOperatorRefill(c,op.id);
 assert.equal(q.id,op.id);
 const next=resupplyOperator(c,op.id);
 assert.equal(next.supplies.ammo,c.supplies.ammo-q.roundsIssued);
 assert.deepEqual(next.operators[0].magazines.map(m=>m.id),op.magazines.map(m=>m.id));
 assert.equal(quoteCampaignOperatorRefill(c,'missing'),null);
});
test('F5: UI points only to HQ-authorized action; no duplicate ledger or free gadget restock',()=>{
 const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const flow=src('src/breach-campaign-flow.ts');
 const ui=src('src/campaign-ui.ts');
 const model=src('src/equipment-campaign-squad-refill.ts');
 assert.match(flow,/resupplySquad:\(\)=>applyVisibleCampaignAction\(refillCampaignSquad/);
 assert.match(ui,/quoteCampaignSquadRefill\(c\)/);
 assert.match(ui,/this\.handlers\.resupplySquad/);
 assert.match(ui,/quoteCampaignOperatorRefill\(c,person\.id\)/);
 assert.match(model,/next=resupplyOperator\(next,id\)/);
 assert.match(model,/next=resupplyMedicalOperator\(next,id\)/);
 assert.doesNotMatch(model,/replaceFieldQuantity|purchaseAmmo|purchaseMedical/);
});
