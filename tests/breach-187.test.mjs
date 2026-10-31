import test from 'node:test';
import assert from 'node:assert/strict';
import {floorClearance} from '../src/breach-clearance.ts';
import {orderFailureText} from '../src/breach-nav-diagnostics.ts';
test('187: clearance returns signed radius and obstruction',()=>{
  const p=floorClearance({x:0,y:0});
  assert.ok(!p.walkable);assert.equal(p.reason,'bounds');
  assert.ok(floorClearance({x:180,y:210}).radius<=8);
});
test('187: errors distinguish clearance, route, downstream validity',()=>{
  const a={x:0,y:0},b={x:10,y:10};
  assert.match(orderFailureText(a,b,{canStand:()=>false,
    routeTo:()=>[]}),/CLEARANCE/);
  assert.match(orderFailureText(a,b,{canStand:()=>true,
    routeTo:()=>[]}),/ROUTE/);
  assert.match(orderFailureText(a,b,{canStand:()=>true,
    routeTo:()=>[b],remainingPlanValid:false}),/LATER/);
});
