import test from 'node:test';import assert from 'node:assert/strict';
import {newCampaign,acceptContract,resolveOperation} from '../src/campaign-state.ts';
import {careerEventsForOperation,sharedService} from '../src/campaign-history.ts';
test('career events use genuine friendly actor IDs and remain bounded',()=>{
 const c=newCampaign(1);
 const found=careerEventsForOperation(c,'op-1',[
  {id:1,t:1,kind:'wound',actor:'rook',text:'ROOK WOUNDED'},
  {id:2,t:1,kind:'down',actor:'guard1',text:'GUARD DOWN'},
  {id:3,t:1,kind:'door',actor:'moss',text:'MOSS OPENED DOOR'}
 ]);
 assert.deepEqual(found.map(e=>e.operatorId),['rook','moss']);
 assert.equal(found[0].operationId,'op-1');
});
test('shared service derives from committed mission history, not invented affinity',()=>{
 let c=newCampaign(44);
 assert.deepEqual(sharedService(c,'rook'),[]);
 for(let i=0;i<2;i++){
  const contract=c.contracts.find(k=>k.status==='available');
  c=acceptContract(c,contract.id);
  c=resolveOperation(c,{id:'op-'+i,contractId:contract.id,day:c.day,outcome:'success',
   grade:'A',elapsed:70,participatingIds:['rook','moss'],casualties:[],objective:true,events:[]});
 }
 assert.deepEqual(sharedService(c,'rook'),[{id:'moss',count:2}]);
});