import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceWaitOrder} from '../src/breach-order-wait.ts';

const actor=()=>({id:'rook',name:'ROOK',side:'blue',health:100,velocity:20,
 waitRemaining:0,actionTimer:0,motorPause:null});
const session=()=>({doors:[],operators:[]});
test('ordinary WAIT completes only after authored duration and zeroes velocity',()=>{
 const s=session(),a=actor(),events=[];let finished=0;
 const n={kind:'wait',duration:.5};
 for(const dt of [.2,.2,.2])
  advanceWaitOrder(s,a,n,dt,()=>false,(...x)=>events.push(x),()=>{finished++});
 assert.equal(finished,1);
 assert.equal(a.velocity,0);
 assert.equal(events.length,0);
});
test('hold clear resets its timer on live contact and holds posture',()=>{
 const s=session(),a=actor();s.operators.push({side:'red',health:100});
 let finished=0;
 advanceWaitOrder(s,a,{kind:'holdClear',duration:.5},.6,()=>true,()=>{},()=>finished++);
 assert.equal(a.waitRemaining,0);
 assert.equal(a.motorPause,'contact');
 assert.equal(finished,0);
});
test('blocked entry WAIT preserves order and only notifies once at threshold',()=>{
 const s=session(),a=actor(),messages=[];let finished=0;
 for(let i=0;i<4;i++)
  advanceWaitOrder(s,a,{kind:'wait',doorId:'MISSING',duration:.5},1,
   ()=>false,(_s,msg)=>messages.push(msg),()=>finished++);
 assert.equal(finished,0);
 assert.equal(a.waitRemaining,0);
 assert.equal(messages.length,1);
 assert.match(messages[0],/DOOR MISSING/);
});
