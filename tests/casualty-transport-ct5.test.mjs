import test from 'node:test';import assert from 'node:assert/strict';
import {carrySupportPoint,proposeAttachedCarry} from '../src/breach-attached-carry.ts';
test('CT5 carry approaches support without a snap and follows once seated',()=>{
 const from={x:10,y:10};let body={x:25,y:10};
 const first=proposeAttachedCarry(body,from,from,0,1/60,()=>true);
 assert.ok(Math.hypot(first.x-body.x,first.y-body.y)<=.600001);
 for(let i=0;i<60;i++)body=proposeAttachedCarry(body,from,from,0,1/60,()=>true);
 assert.deepEqual(body,carrySupportPoint(from,0));
 const to={x:11,y:10};
 assert.deepEqual(proposeAttachedCarry(body,from,to,0,1/60,()=>true),carrySupportPoint(to,0));
 assert.equal(proposeAttachedCarry(body,from,to,0,1/60,()=>false),null);
 assert.deepEqual(proposeAttachedCarry(body,from,from,1,1/60,()=>true,true),body);
});
