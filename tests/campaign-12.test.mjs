import test from 'node:test';import assert from 'node:assert/strict';
import {newCampaign,acceptContract,resolveOperation,hireRecruit,assignOperatorToSlot,readCampaign,
 purchaseAmmo,resupplyOperator} from '../src/campaign-state.ts';
import {exportCampaign,importCampaign} from '../src/campaign-persistence.ts';
import {sharedService} from '../src/campaign-history.ts';
test('long campaign across 16 operations preserves contracts, recruits, resources and history',()=>{
 let c=newCampaign(672);
 c=hireRecruit(c);
 const recruit=c.operators.at(-1);
 c=assignOperatorToSlot(c,3,recruit.id);
 for(let i=0;i<16;i++){
  c=purchaseAmmo(c);
  c=resupplyOperator(c,c.squadIds[0]);
  const job=c.contracts.find(k=>k.status==='available'&&k.deadline>=c.day);
  assert.ok(job,'a viable contract must always exist');
  c=acceptContract(c,job.id);
  const ids=[c.squadIds[0],c.squadIds[1],c.squadIds[3]];
  const report={id:'stress-'+i,contractId:job.id,day:c.day,
   outcome:i%4===0?'failure':'success',grade:i%4===0?'F':'B',
   elapsed:90,participatingIds:ids,casualties:[],objective:i%4!==0,
   events:[],performance:ids.map(id=>({id,shots:12,hits:5,
    pointShots:6,aimedShots:6,longHits:1,injuryStage:0,
    survived:true,magazine:2,reserve:17}))};
  const completed=resolveOperation(c,report);
  assert.notDeepEqual(completed,c);
  assert.deepEqual(resolveOperation(completed,report),completed);
  c=completed;
 }
 assert.equal(c.day,17);assert.equal(c.history.length,16);
 assert.equal(new Set(c.history.map(r=>r.id)).size,16);
 assert.equal(c.operators.find(o=>o.id===recruit.id).missions,16);
 assert.equal(sharedService(c,'rook').find(x=>x.id==='moss')?.count,16);
 assert.ok(c.contracts.length<150);
 assert.ok(Object.values(c.regionalPressure).every(x=>x>=-3&&x<=3));
 assert.deepEqual(readCampaign(JSON.stringify(c)),c);
 assert.deepEqual(importCampaign(exportCampaign(c)),c);
});
test('campaign overlay avoids running tactical frame work while browsing management',()=>{
 const src=(await import('node:fs')).readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
 assert.match(src,/campaignMode==='menu'\|\|campaignMode==='home'/);
 assert.match(src,/campaignReturnButton/);
});