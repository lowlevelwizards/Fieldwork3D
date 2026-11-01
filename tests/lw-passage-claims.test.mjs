import test from 'node:test';import assert from 'node:assert/strict';
import {passageWait} from '../src/breach-passage.ts';
const door={id:'N',a:{x:250,y:200},b:{x:298,y:200},
 open:true,openedAt:0};
const left={id:'A',p:{x:273,y:175},goal:{x:273,y:230},
 health:4,blockedTime:0,active:true};
const right={id:'B',p:{x:274,y:227},goal:{x:274,y:170},
 health:4,blockedTime:0,active:true};
test('narrow passage retains owner and does not rewrite movement intents',()=>{
 const leases={};
 assert.equal(passageWait(left,[door],[left,right],leases,1),false);
 assert.equal(passageWait(right,[door],[left,right],leases,1.1),true);
 assert.equal(leases.N.actorId,'A');
 assert.deepEqual(left.goal,{x:273,y:230});
 assert.equal(passageWait(right,[door],[right],leases,2),false);
});
test('wide shutters do not serialize physically independent lanes',()=>{
 const wide={...door,b:{x:360,y:200}};
 assert.equal(passageWait(left,[wide],[left,right],{},1),false);
});
