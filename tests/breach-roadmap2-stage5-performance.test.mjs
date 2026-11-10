/** Stage 5: intentionally test the evidence *gate*, not runner speed. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {taggedRows,validateStage5Evidence}
 from '../scripts/verification/breach-stage5-performance-contract.mjs';

const stats={avg:1,p50:.5,p95:1.2,max:2};
const row=(tag,data)=>tag+' '+JSON.stringify(data);
function fixture(){
 const env=row('ENVIRONMENT',{node:'v22.0.0',platform:'linux',arch:'x64'});
 const profiles=[];
 for(const seed of [3,17,61])for(const record of [false,true])
  profiles.push({seed,scale:'standard',record,hold:false,ticks:90,
   civilianPreview:false,civilianActors:0,actors:4,walls:30,cover:4,
   rooms:6,shots:0,groundCells:55,sim:{...stats},
   recording:record?{...stats}:undefined,peak:{ms:2,tick:17,phases:{}},
   slowTicks:[]});
 for(const record of [false,true])
  profiles.push({seed:17,scale:'expanded',record,hold:false,ticks:60,
   civilianPreview:false,civilianActors:0,actors:4,walls:100,cover:8,
   rooms:12,shots:0,groundCells:65,sim:{...stats},
   recording:record?{...stats}:undefined,peak:{ms:2,tick:17,phases:{}},
   slowTicks:[]});
 for(const scale of ['standard','expanded'])
  profiles.push({seed:17,scale,record:true,hold:false,
   ticks:scale==='standard'?90:60,civilianPreview:true,
   civilianActors:2,actors:6,walls:30,cover:4,rooms:6,shots:0,
   groundCells:55,sim:{...stats},recording:{...stats},
   peak:{ms:2,tick:17,phases:{}},slowTicks:[]});
 const geometry=[3,17,61].map(seed=>({seed,scale:'standard',
  actors:4,walls:30,cover:4,rooms:6,visibility180:{...stats},
  intelScan:{...stats},polygon:{...stats}}));
 geometry.push({...geometry[0],seed:17,scale:'expanded'});
 const combat={ticks:180,shots:12,actors:6,sim:{...stats},hot:[]};
 const simulationOutput=[env,...profiles.map(p=>row('SIMULATION',p)),
  ...geometry.map(p=>row('GEOMETRY',p)),row('COMBAT',combat)].join('\n');
 const retentionOutput=[
  row('ENVIRONMENT',{node:'v22.0.0',seconds:90,actors:4,forcedGC:true}),
  ...[30,60,90].map(seconds=>row('ROUND_LIFETIME',{
   seconds,frames:seconds*20,steps:seconds*60,
   captureP50ms:.2,captureP95ms:.4,captureMaxMs:.7,
   heapMB:45,sharedActorFields:seconds*3,complete:true
  })),
  row('FILM_COMPLETE',{seconds:90,frames:1800,truncated:false})
 ].join('\n');
 return {simulationOutput,retentionOutput,retentionSeconds:90};
}
function mutate(source,tag,callback){
 let applied=false;
 const modified=source.split('\n').map(line=>{
  if(!line.startsWith(tag+' ')||applied)return line;
  applied=true;
  return row(tag,callback(JSON.parse(line.slice(tag.length+1))));
 });
 assert.ok(applied,'fixture must contain '+tag);
 return modified.join('\n');
}
test('accepts complete host metrics and retains units without inventing FPS',()=>{
 const evidence=validateStage5Evidence(fixture());
 assert.equal(evidence.schemaVersion,1);
 assert.equal(evidence.workloadMatrix.length,10);
 assert.equal(evidence.geometry.length,4);
 assert.equal(evidence.retention.length,3);
 assert.match(evidence.measurement,/not device FPS/);
});
test('rejects malformed tagged JSON rather than silently skipping it',()=>{
 assert.throws(()=>taggedRows('SIMULATION {nope','SIMULATION'),/Malformed/);
});
test('fails closed on missing recorded civilian workload',()=>{
 const data=fixture();
 data.simulationOutput=data.simulationOutput.split('\n').filter(
  line=>!line.startsWith('SIMULATION ')||
  !(line.includes('"scale":"expanded"')&&line.includes('"civilianPreview":true'))
 ).join('\n');
 assert.throws(()=>validateStage5Evidence(data),/matrix is mandatory/);
});
test('fails closed on duplicated geometry seeds',()=>{
 const data=fixture();
 data.simulationOutput=mutate(data.simulationOutput,'GEOMETRY',g=>({
  ...g,seed:17,scale:'expanded'
 }));
 assert.throws(()=>validateStage5Evidence(data),/Duplicate geometry workload/);
});
test('rejects nonfinite or malformed timing instead of asserting host speed',()=>{
 const data=fixture();
 data.simulationOutput=mutate(data.simulationOutput,'COMBAT',
  c=>({...c,sim:{...c.sim,p95:null}}));
 assert.throws(()=>validateStage5Evidence(data),/finite/);
});
test('rejects incomplete long-round film even if timing is healthy',()=>{
 const data=fixture();
 data.retentionOutput=mutate(data.retentionOutput,'FILM_COMPLETE',
  r=>({...r,truncated:true}));
 assert.throws(()=>validateStage5Evidence(data),/truncated/);
});
test('rejects a 60 Hz full-frame recording masquerading as a 20 Hz baseline',()=>{
 const data=fixture();
 data.retentionOutput=mutate(data.retentionOutput,'ROUND_LIFETIME',
  r=>({...r,frames:r.seconds*60}));
 assert.throws(()=>validateStage5Evidence(data),/sample density/);
});
test('rejects missing 30-second memory checkpoints',()=>{
 const data=fixture();
 data.retentionOutput=data.retentionOutput.split('\n')
  .filter(line=>!line.includes('"seconds":60')).join('\n');
 assert.throws(()=>validateStage5Evidence(data),/every 30-second checkpoint/);
});
test('rejects no-shot combat probes that cannot measure the combat path',()=>{
 const data=fixture();
 data.simulationOutput=mutate(data.simulationOutput,'COMBAT',
  c=>({...c,shots:0}));
 assert.throws(()=>validateStage5Evidence(data),/actually fire/);
});
