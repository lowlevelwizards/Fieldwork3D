import test from 'node:test';import assert from 'node:assert/strict';
import {newCampaign,acceptContract,resolveOperation,readCampaign} from '../src/campaign-state.ts';
test('successful intelligence mission creates persistent linked capture contract',()=>{
 let c=newCampaign(5);
 const ct=c.contracts.find(k=>k.kind==='intel')??c.contracts[0];
 // Existing generated contracts need not include intel; force a valid intelligence offer.
 c={...c,contracts:c.contracts.map(k=>k.id===ct.id?{...k,kind:'intel'}:k)};
 const accepted=acceptContract(c,ct.id);
 const report={id:'linked',contractId:ct.id,day:c.day,outcome:'success',grade:'A',
 elapsed:35,participatingIds:['rook'],casualties:[],objective:true,events:[]};
 const after=resolveOperation(accepted,report);
 const next=after.contracts.find(k=>k.followUpOf===ct.id);
 assert.equal(next?.kind,'capture');
 assert.equal(next?.region,ct.region);
 assert.ok(after.contracts.some(k=>k.id===ct.id&&k.status==='completed'));
 assert.ok(after.regionalPressure[ct.region]<c.regionalPressure[ct.region]);
 assert.deepEqual(readCampaign(JSON.stringify(after)),after);
});
test('regional pressure increases after failure and archives resolved contracts',()=>{
 let c=newCampaign(7);
 const ct=c.contracts[0];c=acceptContract(c,ct.id);
 const out=resolveOperation(c,{id:'failed-7',contractId:ct.id,day:c.day,
 outcome:'failure',grade:'F',elapsed:40,participatingIds:['rook'],
 casualties:['rook'],objective:false,events:[]});
 assert.ok(out.regionalPressure[ct.region]>0);
 assert.ok(out.contracts.some(k=>k.id===ct.id&&k.status==='failed'));
});