import test from 'node:test';
import assert from 'node:assert/strict';
import {allocateFlashSupply} from '../src/equipment-supply.ts';
import {newCampaign,readCampaign,purchaseFlash,acceptContract,resolveOperation}
 from '../src/campaign-state.ts';

test('flash issue never exceeds the mission limit or available stock',()=>{
 assert.deepEqual(allocateFlashSupply([1,1,1,1],4),[1,1,0,0]);
 assert.deepEqual(allocateFlashSupply([1,1,1,1],1),[1,0,0,0]);
 assert.deepEqual(allocateFlashSupply([1,1,1,1],0),[0,0,0,0]);
 assert.deepEqual(allocateFlashSupply([0,1,0,1],3),[0,1,0,1]);
 assert.deepEqual(allocateFlashSupply([Infinity,-1,2],2),[0,0,2]);
});
test('flash stock survives saves, purchases and older campaign migration',()=>{
 const c=newCampaign(73);
 assert.equal(c.supplies.flash,4);
 const old=JSON.parse(JSON.stringify(c));delete old.supplies.flash;
 assert.equal(readCampaign(JSON.stringify(old)).supplies.flash,4);
 const bought=purchaseFlash(c);
 assert.equal(bought.funds,c.funds-150);
 assert.equal(bought.supplies.flash,c.supplies.flash+2);
 assert.deepEqual(readCampaign(JSON.stringify(bought)),bought);
});
test('only actual throws cost stock after an operation, and only once',()=>{
 let c=newCampaign(10);const job=c.contracts[0];
 c=acceptContract(c,job.id);
 const report={id:'flash-use',contractId:job.id,day:1,
  outcome:'failure',grade:'F',elapsed:45,participatingIds:['rook'],
  casualties:[],objective:false,events:[],flashUsed:1};
 const done=resolveOperation(c,report);
 assert.equal(done.supplies.flash,3);
 assert.deepEqual(resolveOperation(done,report),done);
 assert.deepEqual(purchaseFlash(c),c);
});
