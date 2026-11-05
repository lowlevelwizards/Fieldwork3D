import test from 'node:test';
import assert from 'node:assert/strict';
import {canAutoOpenEnRoute,autoDoorAtBodyContact}
 from '../src/breach-door.ts';
const plan=(method='open',doorId='D3')=>({kind:'door',doorId,method});
test('DNav-B2: closed FRONT can be opened while traveling to D3',()=>{
 assert.equal(canAutoOpenEnRoute(plan(),'FRONT'),true);
 assert.equal(canAutoOpenEnRoute(plan(),'D3'),true);
});
test('DNav-B2: an explicit KICK, CLOSE or HOLD never pre-opens its target',()=>{
 for(const method of ['kick','close','hold']){
  assert.equal(canAutoOpenEnRoute(plan(method),'D3'),false);
  assert.equal(canAutoOpenEnRoute(plan(method),'FRONT'),true,
   'other door remains traversable on the way to an authored action');
 }
});
test('DNav-B2: unrelated orders never permit automatic door magic',()=>{
 assert.equal(canAutoOpenEnRoute({kind:'reload'},'FRONT'),false);
 assert.equal(canAutoOpenEnRoute({kind:'wait'},'FRONT'),false);
 assert.equal(canAutoOpenEnRoute({kind:'move'},'FRONT'),true);
});
test('DNav-B2: detection only selects real nearby leaf, not hidden distant one',()=>{
 const front={id:'FRONT',a:{x:80,y:100},b:{x:130,y:100},
  open:false,openFraction:0};
 const other={id:'D3',a:{x:500,y:400},b:{x:550,y:400},
  open:false,openFraction:0};
 const at={x:106,y:109.6},toward={x:106,y:109.2};
 assert.equal(autoDoorAtBodyContact(at,toward,[other,front]),front);
 assert.equal(other.open,false);
});
