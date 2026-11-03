import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {orderVisualScopes} from '../src/ui/order-visual-state.ts';
const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
const initial={watch:false,pace:'walk',posture:'stand',fire:'engage'};
test('WATCH begins after the node, persists along following movement, then ends',()=>{
  const plan=[
    {id:1,kind:'move',p:{x:10,y:0},aimMode:'track',
      aimPoint:{x:30,y:20}},
    {id:2,kind:'move',p:{x:20,y:0},paceState:'run'},
    {id:3,kind:'look',p:{x:20,y:0},aimMode:'free'},
    {id:4,kind:'move',p:{x:40,y:0}},
  ];
  const steps=orderVisualScopes(plan,initial);
  assert.equal(steps[0].watchBegins,true);
  assert.equal(steps[1].before.watch,true);
  assert.equal(steps[1].before.pace,'walk');
  assert.equal(steps[2].before.pace,'run');
  assert.equal(steps[2].watchEnds,true);
  assert.equal(steps[3].before.watch,false);
});
test('suppression targets and stance changes are represented without game state mutation',()=>{
  const plan=[
    {id:1,kind:'move',p:{x:15,y:30},postureState:'crouch',
      firePolicyState:'suppress',firePoint:{x:40,y:40}},
    {id:2,kind:'move',p:{x:20,y:35}},
  ];
  const old=JSON.stringify(plan);
  const steps=orderVisualScopes(plan,initial);
  assert.deepEqual(steps[0].suppressionPoint,{x:40,y:40});
  assert.equal(steps[1].before.fire,'suppress');
  assert.equal(steps[1].before.posture,'crouch');
  assert.equal(JSON.stringify(plan),old);
});
test('both visual paths use semantic order scope and neutral route drafts',()=>{
  const uses=main.match(/orderVisualScopes\(/g)??[];
  assert.equal(uses.length,2);
  assert.match(main,/function draftRouteNeighbors\(/);
  assert.match(main,/fillText\('DRAFT'/);
  assert.match(main,/semantics\.suppressionPoint/);
  assert.match(main,/a.id===selected&&a.firePolicy==='suppress'&&a.suppressPoint/);
  assert.match(main,/semantics\.watchEnds/);
});
