import test from 'node:test';
import assert from 'node:assert/strict';
import {route} from '../src/breach-core.ts';
import {newSession,team,planMove,planAim,insertPlanNode,
  deletePlanNode,undoPlan,redoPlan} from '../src/breach-game.ts';
import {routeLineHit} from '../src/breach-route-edit.ts';

const start={x:282,y:628},first={x:340,y:628},second={x:340,y:698};
const near=(a,b,eps=2)=>Math.abs(a-b)<=eps;
const midpointOnRoute=(a,b)=>{
  const segment=route(a,b);
  assert.ok(segment.length>=3,'test setup must include a multi-step routed line');
  const i=Math.floor(segment.length/2);
  const prev=segment[i-1],next=segment[i];
  return {x:(prev.x+next.x)/2,y:(prev.y+next.y)/2};
};
test('081: tapping the actual routed line returns the correct insertion index',()=>{
  const s=newSession(),actor=team(s)[0];
  assert.deepEqual(actor.p,start);
  assert.ok(planMove(s,'rook',first));
  assert.ok(planMove(s,'rook',second));
  const tap=midpointOnRoute(first,second);
  const hit=routeLineHit(actor.p,actor.plan,tap,p=>p,11);
  assert.ok(hit);
  assert.equal(hit.index,1,'the new node belongs before the second move');
  assert.ok(near(hit.point.x,tap.x)&&near(hit.point.y,tap.y));
  const id=s.nextId;
  assert.ok(insertPlanNode(s,'rook',hit.index,hit.point));
  assert.deepEqual(actor.plan.map(n=>n.id),[1,id,2]);
  assert.equal(actor.plan[1].kind,'move');
  assert.ok(planAim(s,'rook','track',{x:342,y:580},id,'pie'));
  assert.equal(actor.plan[1].aimMode,'track');
  assert.deepEqual(actor.plan.at(-1).p,second,'later route destination preserved');
  assert.ok(deletePlanNode(s,'rook',id));
  assert.deepEqual(actor.plan.map(n=>n.id),[1,2],
    'DELETE reconnects original route without clearing it');
  assert.ok(undoPlan(s,'rook'));
  assert.equal(actor.plan[1].id,id,'DELETE undo returns the inserted node');
  assert.ok(redoPlan(s,'rook'));
  assert.deepEqual(actor.plan.map(n=>n.id),[1,2]);
});
test('081: hit-testing uses projected screen pixels, not naive world coordinates',()=>{
  const s=newSession(),actor=team(s)[0];
  assert.ok(planMove(s,'rook',first));
  assert.ok(planMove(s,'rook',second));
  const project=p=>({x:.8*p.x+.3*p.y,y:.65*p.y-.14*p.x});
  const tap=midpointOnRoute(first,second);
  const hit=routeLineHit(actor.p,actor.plan,project(tap),project,13);
  assert.ok(hit);
  assert.equal(hit.index,1);
  assert.ok(near(hit.point.y,tap.y));
  assert.equal(routeLineHit(actor.p,actor.plan,{x:0,y:0},project,13),null,
    'unrelated camera taps do not mutate routes');
});
test('081: insertion also works after stationary LOOK and never creates an extra route',()=>{
  const s=newSession(),actor=team(s)[0];
  assert.ok(planMove(s,'rook',first));
  assert.ok(planAim(s,'rook','free',{x:343,y:690},undefined,'look'));
  assert.ok(planMove(s,'rook',second));
  const tap=midpointOnRoute(first,second);
  const hit=routeLineHit(actor.p,actor.plan,tap,p=>p);
  assert.equal(hit?.index,2,'insertion follows the existing look instruction');
  assert.ok(insertPlanNode(s,'rook',hit.index,hit.point));
  assert.equal(actor.plan[1].kind,'look');
  assert.equal(actor.plan[2].kind,'move');
  assert.deepEqual(actor.plan.at(-1).p,second);
});
test('081: route-line taps cannot select empty world space or mutate on a miss',()=>{
  const s=newSession(),actor=team(s)[0];
  assert.ok(planMove(s,'rook',second));
  assert.equal(routeLineHit(actor.p,actor.plan,{x:-600,y:200},
    p=>({x:p.x*2,y:p.y*2}),14),null);
  assert.equal(actor.plan.length,1);
});
