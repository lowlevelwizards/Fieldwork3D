import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeD319FourSiteFailures,D319_FOCUS}
 from '../scripts/lib/d3-19c-four-site-triage.mjs';
const names=['house','townhouse','apartment','retail','office','garage',
 'warehouse','restaurant','motel','utility','clinic'];
const operator=(id,fields={})=>({
 id,arrived:true,remaining:0,failedOrders:0,remainingOrders:0,
 outcome:'arrived',...fields
});
function matrix(){
 return {corpus:'untouched-d3-18-fresh22',ticks:2700,
  rows:Array.from({length:22},(_,i)=>({
   seed:19001037+i*17779,archetype:names[i%11],
   scale:i<11?'small':'standard',
   modes:['authored','entry'].map(mode=>({
    mode,accepted:4,arrivals:4,
    operators:['rook','moss','ash','vale'].map(id=>operator(id)),
    endDoorStates:[]
   }))
  }))};
}
test('D3.19C four-site report keeps actor outcome and immutable seed/mode',()=>{
 const data=matrix();
 data.rows[3].modes[1].operators[2]=operator('ash',{
  arrived:false,outcome:'pending',remaining:12,remainingOrders:1,
  activeOrderDetails:{kind:'move',entryDoorId:'FRONT'},
  lastBlocker:'furniture',blockedSeconds:3.1,
  position:{x:1,y:2},goal:{x:3,y:4}
 });
 data.rows[10].modes[1].operators[0]=operator('rook',{
  arrived:false,outcome:'cancelled',remaining:130,
  failedOrders:1,lastFailedOrder:{reason:'locked'},
  activeOrderDetails:null
 });
 data.rows[8].modes[0].operators[1]=operator('moss',{
  arrived:false,outcome:'pending',remainingOrders:3,
  activeOrderDetails:{kind:'sync',syncCode:'GO'}
 });
 data.rows[5].modes[1].operators[3]=operator('vale',{
  arrived:false,outcome:'pending',remainingOrders:2,
  lastBlocker:'route',activeOrderDetails:{kind:'move'},
  retries:5
 });
 data.rows[16].modes[1].accepted=3;
 const report=analyzeD319FourSiteFailures(data);
 assert.deepEqual(report.targetArchetypes,D319_FOCUS);
 assert.equal(report.corpus,data.corpus);
 assert.equal(report.counts['furniture-obstruction'],1);
 assert.equal(report.counts['terminal-cancellation'],1);
 assert.equal(report.counts['queue-gate'],1);
 assert.equal(report.counts['route-unavailable'],1);
 assert.equal(report.counts['setup-rejected'],1);
 assert.equal(report.cases.length,5);
 const retail=report.cases.find(c=>c.actor==='ash');
 assert.ok(retail);
 assert.equal(retail.seed,data.rows[3].seed);
 assert.equal(retail.mode,'entry');
 assert.equal(retail.physicallyArrived,false);
 assert.deepEqual(retail.goal,{x:3,y:4});
 assert.equal(retail.blockedSeconds,3.1);
 assert.equal(report.bySite.retail.generated,1);
 assert.equal(report.bySite.retail.authored,0);
 assert.equal(report.bySite.garage.generated,2);
});
test('D3.19C never equates queue drain with reached or successful',()=>{
 const data=matrix();
 data.rows[8].modes[1].operators[0]=operator('rook',{
  arrived:false,outcome:'unreached',remainingOrders:0,
  remaining:23
 });
 data.rows[3].modes[0].operators[0]=operator('rook',{
  arrived:true,outcome:'cancelled',failedOrders:1,remainingOrders:0
 });
 const report=analyzeD319FourSiteFailures(data);
 assert.equal(report.counts['drained-unreached'],1);
 assert.equal(report.counts['terminal-cancellation'],1);
 assert.equal(report.cases.find(c=>c.archetype==='retail').physicallyArrived,true);
});
test('D3.19C refuses partial runs and missing authored/entry evidence',()=>{
 const data=matrix();
 assert.throws(()=>analyzeD319FourSiteFailures({...data,ticks:600}),/45s/);
 assert.throws(()=>analyzeD319FourSiteFailures({...data,rows:data.rows.slice(1)}),/22-site/);
 data.rows[3].modes[1].mode='authored';
 assert.throws(()=>analyzeD319FourSiteFailures(data),/authored and generated-entry/);
});
