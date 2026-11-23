/** R6.3 forensic-preserving real Session cancellation and UI projection. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,stepSession} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {ExecutionNoticeFeed} from '../src/ui/execution-feedback.ts';
import {liveExecutionNotice} from '../src/ui/live-execution-presentation.ts';

const pt=(x,y)=>({x,y});
const site={
 seed:6303,name:'R6.3 terminal order and feedback audit',training:true,
 layout:'corridor',rooms:[],roomCount:0,doors:[],cover:[],walls:[],
 windows:[],enemies:[],entrance:pt(120,120),
 spawn:[pt(120,120),pt(125,210),pt(135,235),pt(140,255)],
 objective:pt(240,120),extract:pt(245,120),
 bounds:{minX:0,minY:0,maxX:420,maxY:320}
};
const scoped=(session,feed,now=100)=>feed.update(
 session.events,session.phase,now,session.executionEvents,{
  session,actors:team(session),seconds:session.seconds,phase:session.phase
 });
test('R6.3 actual terminal GO is a historical failure plus brief typed notice',()=>{
 const s=newSession(0,6303,'full-view','standard','hold',site);
 try{
  const a=team(s)[0];
  s.phase='running';
  a.plan=[{id:6303,kind:'door',p:{...a.p},
   doorId:'R63-MISSING-DOOR',method:'open'}];
  stepSession(s,1/60);
  assert.equal(a.plan.length,0);
  assert.equal(a.failedOrders,1);
  assert.equal(a.completedOrders,0);
  const failure=a.lastFailedOrder;
  assert.equal(failure?.id,6303);
  assert.ok(s.executionEvents.some(e=>e.actor===a.id&&
   e.kind==='blocked'&&e.reason==='order-cancelled'));
  const recordedEvents=s.executionEvents.map(e=>({...e})),logs=[...s.events];
  const feed=new ExecutionNoticeFeed();
  const result=scoped(s,feed);
  assert.equal(result?.origin,'transition');
  assert.equal(result?.actorId,a.id);
  assert.equal(result?.orderId,null);
  assert.equal(result?.reason,'order-cancelled');
  assert.equal(liveExecutionNotice(result,team(s),s.seconds,s.phase),result);
  assert.deepEqual(s.events,logs);
  assert.deepEqual(s.executionEvents,recordedEvents,
   'live presentation may not revise replay evidence');
  assert.equal(a.completedOrders,0);
  // Editing after the genuine failed attempt invalidates the active banner.
  a.plan=[{id:6304,kind:'wait',p:{...a.p},duration:3}];
  assert.equal(scoped(s,feed,110),null);
  assert.equal(feed.peek(),null);
  assert.equal(a.failedOrders,1,'a UI dismissal must not erase forensic failure');
 }finally{activateSite(null);}
});

test('R6.3 new Quick Play Session reusing actor and order IDs has no ghost notice',()=>{
 const one=newSession(0,6303,'full-view','standard','hold',site);
 const feed=new ExecutionNoticeFeed();
 try{
  const a=team(one)[0];
  one.phase='running';
  a.plan=[{id:6303,kind:'door',p:{...a.p},
   doorId:'R63-MISSING-DOOR',method:'open'}];
  stepSession(one,1/60);
  assert.equal(scoped(one,feed)?.origin,'transition');
  const two=newSession(0,6303,'full-view','standard','hold',site);
  try{
   const fresh=team(two)[0];
   fresh.plan=[{id:6303,kind:'wait',p:{...fresh.p},duration:5}];
   two.phase='running';
   assert.equal(scoped(two,feed,125),null);
   assert.equal(feed.peek(),null);
   assert.notEqual(one,two);
   assert.equal(one.failedOrders,undefined);
  }finally{activateSite(null);}
 }finally{activateSite(null);}
});
