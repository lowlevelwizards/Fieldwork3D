import test from 'node:test';
import assert from 'node:assert/strict';
import {passageWait} from '../src/breach-passage.ts';
const first={id:'A-DOOR',a:{x:40,y:100},b:{x:88,y:100},open:true};
const second={id:'B-DOOR',a:{x:40,y:168},b:{x:88,y:168},open:true};
const actor=(id,y,goalY)=>({id,p:{x:64,y},goal:{x:64,y:goalY},
 health:4,blockedTime:0,active:true});
test('aligned vestibule shares a single lease across both doorways',()=>{
 const arriving=actor('arriving',80,200),inside=actor('inside',135,195);
 const leases={};
 assert.equal(passageWait(arriving,[first,second],[arriving,inside],leases,1),true);
 assert.equal(passageWait(inside,[first,second],[arriving,inside],leases,1),false);
 assert.equal(leases['zone:A-DOOR+B-DOOR'].actorId,'inside');
});
test('passage retains owner while passing the vestibule midpoint',()=>{
 const firstActor=actor('first',82,200),other=actor('second',195,60);
 const leases={};
 assert.equal(passageWait(firstActor,[first,second],[firstActor,other],leases,1),false);
 firstActor.p.y=134;
 assert.equal(passageWait(other,[first,second],[firstActor,other],leases,1.1),true);
 assert.equal(leases['zone:A-DOOR+B-DOOR'].actorId,'first');
 firstActor.p.y=218;
 assert.equal(passageWait(other,[first,second],[firstActor,other],leases,2),false);
});
test('perpendicular nearby doors remain independent narrow passages',()=>{
 const turn={id:'TURN',a:{x:90,y:100},b:{x:90,y:148},open:true};
 const a=actor('a',82,200);
 const leases={};
 passageWait(a,[first,turn],[a],leases,0);
 assert.equal(Object.keys(leases).some(k=>k.startsWith('zone:')),false);
});
