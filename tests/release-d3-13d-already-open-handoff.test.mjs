import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {openOrderSatisfiedBeforeApproach}
 from '../src/breach-order-movement.ts';

const door=(fraction=.99)=>({id:'FRONT',open:true,openFraction:fraction,
 kind:'hinged',a:{x:100,y:100},b:{x:100,y:140}});
const order=(method='open')=>({kind:'door',id:44,doorId:'FRONT',
 method,p:{x:60,y:110}});

test('D3.13D: already open physical door needs no new walk to old handle node',()=>{
 assert.equal(openOrderSatisfiedBeforeApproach(order(),[door()]),true);
 assert.equal(openOrderSatisfiedBeforeApproach(order(undefined),[door()]),true);
 assert.equal(openOrderSatisfiedBeforeApproach(order(),[door(1)]),true);
 assert.equal(openOrderSatisfiedBeforeApproach(order(),[door(.979)]),false);
 assert.equal(openOrderSatisfiedBeforeApproach(order(),[
  {...door(),open:false}]),false);
 assert.equal(openOrderSatisfiedBeforeApproach(order(),[]),false);
});
test('D3.13D: explicit KICK, CLOSE and HOLD are never silently skipped',()=>{
 for(const method of ['kick','close','hold'])
  assert.equal(openOrderSatisfiedBeforeApproach(order(method),[door()]),false);
 assert.equal(openOrderSatisfiedBeforeApproach(
  {...order(),kind:'move'},[door()]),false);
 assert.equal(openOrderSatisfiedBeforeApproach(order(),[
  {...door(),id:'DIFFERENT'}]),false);
});
test('D3.13D: only skips locomotion; real order handler remains authoritative',()=>{
 const movement=readFileSync(new URL('../src/breach-order-movement.ts',import.meta.url),'utf8');
 const executor=readFileSync(new URL('../src/breach-order-executor.ts',import.meta.url),'utf8');
 const doorOrder=readFileSync(new URL('../src/breach-order-door.ts',import.meta.url),'utf8');
 assert.match(movement,/!openOrderSatisfiedBeforeApproach\(n,s\.doors\)/);
 assert.match(executor,/executeMovementOrder\(s,a,n,dt,visibleThreat,profile\)\)return/);
 assert.match(executor,/executeDoorOrder\(s,a,n,dt\)/);
 assert.match(doorOrder,/door\.open&&\(door\.openFraction\?\?1\)>=\.98/);
 assert.match(doorOrder,/clearOpeningFootwork\(a,door\.id,n\.id\)/);
 assert.match(doorOrder,/pop\(a\);return true/);
});
