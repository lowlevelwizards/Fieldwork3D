import test from 'node:test';import assert from 'node:assert/strict';
import {chooseTransportStep} from '../src/breach-transport-recovery.ts';
test('CT6 denied pair step tries bounded alternatives, never bypasses geometry',()=>{
 const from={x:0,y:0},to={x:1,y:0};
 const r=chooseTransportStep(from,to,p=>p.x<=.5?{x:p.x-2,y:p.y}:null,()=>true);
 assert.deepEqual(r,{carrier:{x:.5,y:0},body:{x:-1.5,y:0},adjusted:true});
 assert.equal(chooseTransportStep(from,to,()=>null,()=>true),null);
 assert.equal(chooseTransportStep(from,to,p=>p.x<=.5?p:null,()=>false),null);
 assert.equal(chooseTransportStep(from,to,p=>p.x<=.5?p:null,()=>true,false),null);
});
