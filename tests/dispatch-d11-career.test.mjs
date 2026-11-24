import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newCampaign,acceptContract,resolveOperation,readCampaign}
 from '../src/campaign-state.ts';
import {createCampaignRules} from '../src/campaign-rules.ts';
import {newDispatchPilotCampaign} from '../src/dispatch-campaign-starter.ts';
import {assessDispatchForce,dispatchForceHistory}
 from '../src/dispatch-force-review.ts';
import {initialDispatchDepartment,advanceDispatchDepartment,
 dispatchStandingTier,validDispatchDepartment,validDispatchCareerReceipt}
 from '../src/dispatch-department.ts';

const force=(injured=0,down=0,surrenders=0)=>
 dispatchForceHistory(assessDispatchForce([
  ...Array.from({length:injured},(_,i)=>({
   id:i+1,shotId:i+1,at:i+1,victimId:'civilian-'+i,
   actorId:'rook',sourceSide:'blue',before:2,after:1,
   severity:'injured',p:{x:0,y:0}
  })),
  ...Array.from({length:down},(_,i)=>({
   id:100+i,shotId:100+i,at:100+i,victimId:'down-'+i,
   actorId:'rook',sourceSide:'blue',before:1,after:0,
   severity:'incapacitated',p:{x:0,y:0}
  }))
 ],Array.from({length:surrenders},(_,i)=>({
  id:200+i,t:200+i,kind:'surrender',actor:'hostile-'+i,
  text:'SURRENDERED'
 }))));

function report(c,job,index,options={}){
 return {id:'dispatch-11-'+index,contractId:job.id,day:c.day,
  outcome:'success',grade:'A',elapsed:45,participatingIds:[c.operators[0].id],
  casualties:[],objective:true,events:[],dispatchForce:force(),...options};
}
function settle(c,i,options={}){
 const job=c.contracts.find(k=>k.status==='available'&&k.deadline>=c.day);
 assert.ok(job,'another real contract available');
 return resolveOperation(acceptContract(c,job.id),report(c,job,i,options));
}

test('D11.0 baseline: only Dispatch starts with new service ledger',()=>{
 const d=newDispatchPilotCampaign(12041);
 assert.deepEqual(d.dispatchDepartment,initialDispatchDepartment());
 assert.equal(dispatchStandingTier(50),'DEVELOPING');
 for(const c of [newCampaign(12041),
  newCampaign(12041,createCampaignRules('operations')),
  newCampaign(12041,createCampaignRules('wasteland'))]){
  assert.equal(Object.hasOwn(c,'dispatchDepartment'),false);
  assert.deepEqual(readCampaign(JSON.stringify(c)),c);
 }
 assert.deepEqual(readCampaign(JSON.stringify(d)),d);
});

test('D11.1 success, objective and clean *reviewed* evidence award bounded standing',()=>{
 const first=advanceDispatchDepartment(undefined,{
  outcome:'success',objective:true,grade:'A',casualties:[],dispatchForce:force()
 });
 assert.deepEqual(first.receipt,{
  version:1,standingBefore:50,standingDelta:9,standingAfter:59,
  operatingSupport:100,reviewed:true,recognitions:[]
 });
 assert.equal(first.state.reviewed,1);
 const unknown=advanceDispatchDepartment(undefined,{
  outcome:'success',objective:true,grade:'A',casualties:[]
 });
 assert.equal(unknown.receipt.standingDelta,8,
  'no D10 harm evidence is not proof of clean force');
 assert.equal(unknown.state.reviewed,0);
 assert.equal(unknown.state.harmResponses,0);
 const harmful=advanceDispatchDepartment(undefined,{
  outcome:'success',objective:true,grade:'B',
  casualties:['rook'],dispatchForce:force(2,1,0)
 });
 assert.equal(harmful.receipt.standingDelta,-16);
 assert.equal(harmful.state.harmResponses,1);
 assert.equal(harmful.state.reviewed,1);
 assert.equal(harmful.receipt.operatingSupport,65,
  'support is grade-based, not a second financial harm penalty');
});

test('D11.2 bounded standing and appropriations do not backflow into score',()=>{
 const prev={...initialDispatchDepartment(),standing:99};
 const good=advanceDispatchDepartment(prev,{
  outcome:'success',objective:true,grade:'A',casualties:[],dispatchForce:force()
 });
 assert.equal(good.state.standing,100);
 assert.equal(good.receipt.standingDelta,1);
 assert.equal(good.receipt.operatingSupport,140);
 const low={...initialDispatchDepartment(),standing:0};
 const loss=advanceDispatchDepartment(low,{
  outcome:'failure',objective:false,grade:'F',
  casualties:['rook','moss','ash','vale'],
  dispatchForce:force(3,2)
 });
 assert.equal(loss.state.standing,0);
 assert.equal(loss.receipt.standingDelta,0);
 assert.equal(loss.receipt.operatingSupport,0);
 const emptySuccess=advanceDispatchDepartment(undefined,{
  outcome:'success',objective:false,grade:'A',casualties:[]
 });
 assert.equal(emptySuccess.receipt.operatingSupport,0);
});

test('D11.2 settlement grants supplement unchanged contract reward exactly once',()=>{
 const start=newDispatchPilotCampaign(12051),job=start.contracts[0];
 const accepted=acceptContract(start,job.id),r=report(accepted,job,1);
 const settled=resolveOperation(accepted,r);
 assert.equal(settled.funds,start.funds+job.reward+100);
 assert.equal(settled.dispatchDepartment.standing,59);
 assert.equal(settled.dispatchDepartment.operatingSupport,100);
 assert.equal(settled.history.at(-1).dispatchCareer.operatingSupport,100);
 assert.deepEqual(resolveOperation(settled,r),settled);
 assert.deepEqual(readCampaign(JSON.stringify(settled)),settled);
 const failed=start.contracts[0],lost=resolveOperation(
  acceptContract(start,failed.id),report(start,failed,2,{
   outcome:'failure',grade:'F',objective:false,dispatchForce:undefined
  }));
 assert.equal(lost.funds,start.funds,'failure pays no contract reward or support');
 assert.equal(lost.dispatchDepartment.responses,1);
 assert.equal(lost.dispatchDepartment.reviewed,0);
});

test('D11.3 service recognitions and operator awards occur only once on milestones',()=>{
 let c=newDispatchPilotCampaign(12061);
 const firstOperator=c.operators[0].id;
 for(let i=1;i<=8;i++){
  c=settle(c,i,{dispatchForce:force(0,0,1),grade:'B'});
  assert.equal(c.dispatchDepartment.responses,i);
  assert.equal(c.dispatchDepartment.successful,i);
  if(i===3){
   assert.ok(c.dispatchDepartment.recognitions.includes('CONSISTENT RESPONSE'));
   assert.ok(c.dispatchDepartment.recognitions.includes('SURRENDER RESOLUTIONS'));
   assert.ok(c.operators.find(o=>o.id===firstOperator).distinctions.includes(
    'Dispatch Response Citation'));
   assert.ok(c.history.at(-1).dispatchCareer.recognitions.includes(
    'CONSISTENT RESPONSE'));
  }
 }
 assert.ok(c.operators.find(o=>o.id===firstOperator).distinctions.includes(
  'Dispatch Senior Service'));
 assert.equal(c.operators.find(o=>o.id===firstOperator).distinctions.filter(
  name=>name==='Dispatch Response Citation').length,1);
 assert.equal(c.journal.filter(e=>e.detail==='Earned distinction: Dispatch Response Citation').length,1);
 assert.equal(c.dispatchDepartment.recognitions.filter(
  name=>name==='CONSISTENT RESPONSE').length,1);
 assert.equal(c.dispatchDepartment.surrenders,8);
 assert.deepEqual(readCampaign(JSON.stringify(c)),c);
});

test('D11.1 older Dispatch save has no fabricated history but progresses next closeout',()=>{
 const saved=newDispatchPilotCampaign(12071);
 const legacy={...saved};
 delete legacy.dispatchDepartment;
 assert.equal(readCampaign(JSON.stringify(legacy)).dispatchDepartment,undefined);
 const next=settle(legacy,1,{dispatchForce:undefined});
 assert.equal(next.dispatchDepartment.responses,1);
 assert.equal(next.dispatchDepartment.reviewed,0);
 assert.equal(next.history.at(-1).dispatchCareer.reviewed,false);
});

test('D11.5 save tampering rejected, other templates unchanged',()=>{
 const base=newDispatchPilotCampaign(12081);
 const valid=settle(base,1);
 assert.equal(validDispatchDepartment(valid.dispatchDepartment),true);
 assert.equal(validDispatchCareerReceipt(valid.history.at(-1).dispatchCareer),true);
 for(const altered of [
  {...valid.dispatchDepartment,standing:101},
  {...valid.dispatchDepartment,responses:-1},
  {...valid.dispatchDepartment,successful:999},
  {...valid.dispatchDepartment,reviewed:999},
  {...valid.dispatchDepartment,recognitions:['ILLEGAL']},
  {...valid.dispatchDepartment,recognitions:['CONSISTENT RESPONSE','CONSISTENT RESPONSE']}
 ]){
  assert.equal(validDispatchDepartment(altered),false);
  assert.equal(readCampaign(JSON.stringify({...valid,dispatchDepartment:altered})),null);
 }
 const receipt=valid.history.at(-1).dispatchCareer;
 for(const changed of [
  {...receipt,version:2},{...receipt,operatingSupport:999},
  {...receipt,standingAfter:100},{...receipt,standingDelta:40},
  {...receipt,recognitions:['UNVERIFIED']}
 ]){
  assert.equal(validDispatchCareerReceipt(changed),false);
  const dirty={...valid,history:valid.history.map(h=>({
   ...h,dispatchCareer:changed
  }))};
  assert.equal(readCampaign(JSON.stringify(dirty)),null);
 }
 const baseLegacy=newCampaign(12082);
 const nonDispatch=settle(baseLegacy,2,{dispatchForce:undefined});
 assert.equal(Object.hasOwn(nonDispatch,'dispatchDepartment'),false);
 assert.equal(Object.hasOwn(nonDispatch.history.at(-1),'dispatchCareer'),false);
 assert.equal(nonDispatch.funds,baseLegacy.funds+
  baseLegacy.contracts[0].reward);
 assert.equal(readCampaign(JSON.stringify({...baseLegacy,
  dispatchDepartment:initialDispatchDepartment()})),null);
});

test('D11.4 operations room labels evidence and receipts without new policing claims',()=>{
 const ui=readFileSync(new URL('../src/campaign-ui.ts',import.meta.url),'utf8');
 const code=readFileSync(new URL('../src/campaign-state.ts',import.meta.url),'utf8');
 assert.match(ui,/DEPARTMENT SERVICE RECORD/);
 assert.match(ui,/OPERATIONAL STANDING/);
 assert.match(ui,/Unreviewed incidents are not counted/);
 const chronicle=readFileSync(new URL('../src/ui/campaign/chronicle-view.ts',import.meta.url),'utf8');
 assert.match(chronicle,/SUPPORT \+'/);
 assert.match(code,/advanceDispatchDepartment\(c.dispatchDepartment,r\)/);
 assert.match(code,/Dispatch Senior Service/);
});
