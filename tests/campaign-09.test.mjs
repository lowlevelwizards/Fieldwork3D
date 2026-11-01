import test from 'node:test';import assert from 'node:assert/strict';
import {newCampaign,acceptContract,resolveOperation,readCampaign} from '../src/campaign-state.ts';
test('individual starting aptitudes produce stable personal traits',()=>{
 const c=newCampaign(17);
 assert.equal(c.operators.length,4);
 assert.ok(c.operators.every(o=>o.trait.length>0));
 assert.ok(c.operators.every(o=>o.distinctions.length===0));
 assert.deepEqual(readCampaign(JSON.stringify(c)),c);
});
test('five genuine deployments yield one milestone only once',()=>{
 let c=newCampaign(19);
 for(let i=0;i<6;i++){
  const ct=c.contracts.find(k=>k.status==='available');
  c=acceptContract(c,ct.id);
  c=resolveOperation(c,{id:'op-'+i,contractId:ct.id,day:c.day,
   outcome:'success',grade:'A',elapsed:70,participatingIds:['rook'],
   casualties:[],objective:true,events:[]});
 }
 const rook=c.operators.find(o=>o.id==='rook');
 assert.ok(rook.distinctions.includes('Five Operations'));
 assert.equal(c.journal.filter(e=>e.kind==='distinction'&&e.detail.includes('Five Operations')).length,1);
 assert.equal(c.operators.find(o=>o.id==='moss').distinctions.length,0);
});
