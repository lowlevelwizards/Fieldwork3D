import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ExecutionNoticeFeed,locateNoticeOrder}
 from '../src/ui/execution-feedback.ts';
import {liveExecutionNotice}
 from '../src/ui/live-execution-presentation.ts';
import {liveNoticeEligible}
 from '../src/ui/execution-notice-provenance.ts';

const actor=(plan,extra={})=>({
 id:'rook',health:4,plan:plan.map(id=>({id})),lastFailedOrder:null,...extra
});
const scope=(session,actors,seconds=1,phase='running')=>({
 session,actors,seconds,phase
});
const transition=(id,kind='blocked',orderId=44,reason='door-locked',t=1)=>({
 id,t,actor:'rook',p:{x:100,y:100},orderId,kind,reason,
 text:kind==='blocked'?'ROOK DOOR BLOCKED · LOCKED':'ROOK RESUMED'
});

test('R6.3 active warning is tied to the FIRST real authored order, not any queued id',()=>{
 const n={text:'blocked',label:'OBSTRUCTED',severity:'warning',priority:3,
  born:100,expires:2500,origin:'transition',actorId:'rook',
  orderId:44,eventId:7,eventAt:1,reason:'door-locked'};
 assert.equal(liveNoticeEligible(n,[actor([44,45])],1,'running'),true);
 assert.equal(liveNoticeEligible(n,[actor([45,44])],1,'running'),false);
 assert.equal(liveNoticeEligible(n,[actor([45])],1,'running'),false);
 assert.equal(liveNoticeEligible(n,[actor([])],1,'running'),false);
 assert.equal(liveNoticeEligible(n,[actor([44],{health:0})],1,'running'),false);
 assert.equal(liveNoticeEligible(n,[],1,'running'),false);
 assert.deepEqual(locateNoticeOrder(n,[actor([44,45])]),
  {actorId:'rook',orderId:44});
 assert.deepEqual(locateNoticeOrder(n,[actor([45,44])]),
  {actorId:'rook',orderId:null});
});

test('R6.3 recent typed terminal failure is briefly visible, but never resurrected',()=>{
 const fail={text:'ROOK ORDERS CANCELLED · 1 FAILED',label:'OBSTRUCTED',
  severity:'warning',priority:3,born:1,expires:2500,
  origin:'transition',actorId:'rook',orderId:null,
  eventId:11,eventAt:1,reason:'order-cancelled'};
 const recent=actor([],{lastFailedOrder:{id:44,at:1}});
 assert.equal(liveNoticeEligible(fail,[recent],1.01,'running'),true);
 assert.equal(liveNoticeEligible(fail,[recent],2.49,'running'),true);
 assert.equal(liveNoticeEligible(fail,[recent],2.5,'running'),false);
 assert.equal(liveNoticeEligible(fail,[recent],1.01,'planning'),false);
 assert.equal(liveNoticeEligible(fail,[actor([45],{
  lastFailedOrder:{id:44,at:1}})],1.01,'running'),false);
 assert.equal(liveNoticeEligible(fail,[actor([],{lastFailedOrder:{id:45,at:.7}})],
  1.01,'running'),false);
 assert.equal(liveNoticeEligible(fail,[actor([],{lastFailedOrder:null})],
  1.01,'running'),false);
 assert.equal(liveExecutionNotice(fail,[recent],1.2,'running'),fail);
});

test('R6.3 strict transition provenance survives later state change and never repeats',()=>{
 const feed=new ExecutionNoticeFeed(),session={};
 const blocked=transition(1);
 assert.equal(feed.update([],'running',100,[blocked],
  scope(session,[actor([44])],1))?.orderId,44);
 assert.equal(feed.update([],'running',150,[blocked],
  scope(session,[actor([45])],1.01)),null,
  'the retired blocked 44 must be evicted, not remain top-ranked');
 assert.equal(feed.peek(),null);
 assert.equal(feed.update([],'running',200,[blocked],
  scope(session,[actor([44])],1.02)),null,
  'old event 1 never reappears after its PlanNode id is recycled');
 const latest=transition(2,'blocked',44,'collision-wall',1.05);
 assert.equal(feed.update([],'running',220,[blocked,latest],
  scope(session,[actor([44])],1.05))?.eventId,2);
 const resumed=transition(3,'resumed',44,'moving',1.1);
 assert.equal(feed.update([],'running',230,[blocked,latest,resumed],
  scope(session,[actor([44])],1.1))?.label,'RESUMED');
 assert.equal(feed.update([],'running',231,[blocked,latest,resumed],
  scope(session,[actor([44])],1.1))?.label,'RESUMED');
});

test('R6.3 one actor progressing does not erase another currently blocked actor',()=>{
 const feed=new ExecutionNoticeFeed(),session={};
 const alpha=transition(1),bravo={...transition(2),actor:'moss',
  orderId:8,text:'MOSS BLOCKED'};
 const actors=[actor([44]),{id:'moss',health:4,plan:[{id:8}]}];
 feed.update([],'running',100,[alpha,bravo],scope(session,actors,1));
 const rookResumed=transition(3,'resumed',44,'moving',1.1);
 const result=feed.update([],'running',110,[alpha,bravo,rookResumed],
  scope(session,actors,1.1));
 assert.equal(result?.text,'MOSS BLOCKED');
 assert.equal(result?.actorId,'moss');
});

test('R6.3 new Session never inherits old status, old events, or phase transitions',()=>{
 const feed=new ExecutionNoticeFeed();
 const sessionA={},sessionB={};
 const event=transition(1);
 assert.equal(feed.update([],'running',100,[event],
  scope(sessionA,[actor([44])],1))?.orderId,44);
 const switched=feed.update(['ROOK DOOR BLOCKED · LOCKED'],
  'running',101,[event],scope(sessionB,[actor([44])],1));
 assert.equal(switched,null,'the same actor/order id from prior site is not evidence');
 assert.equal(feed.peek(),null);
 const fresh=transition(2,'blocked',44,'door-locked',1.1);
 assert.equal(feed.update(['ROOK DOOR BLOCKED · LOCKED'],
  'running',120,[event,fresh],scope(sessionB,[actor([44])],1.1))?.eventId,2);
 assert.equal(feed.update(['ROOK DOOR BLOCKED · LOCKED'],'running',130,
  [event,fresh],scope(sessionB,[actor([])],1.2)),null);
});

test('R6.3 fresh terminal order failure remains a brief notice and archival log is intact',()=>{
 const feed=new ExecutionNoticeFeed(),session={};
 const failure=transition(7,'blocked',null,'order-cancelled',.5);
 const current=[actor([],{lastFailedOrder:{id:77,at:.5}})];
 assert.equal(feed.update(['ROOK ORDER CANCELLED'],'running',200,[failure],
  scope(session,current,.5))?.eventId,7);
 assert.equal(feed.update(['ROOK ORDER CANCELLED'],'running',201,[failure],
  scope(session,current,.6))?.label,'OBSTRUCTED');
 assert.equal(feed.update(['ROOK ORDER CANCELLED'],'running',450,[failure],
  scope(session,current,2.01)),null,
  'old terminal failure is no longer a live obstruction');
 assert.equal(failure.reason,'order-cancelled','forensic event is unmodified');
 assert.deepEqual(current[0].lastFailedOrder,{id:77,at:.5},
  'failure evidence remains in the real actor');
 const raw={text:'ROOK ORDER CANCELLED',label:'OBSTRUCTED',
  severity:'warning',priority:3,born:100,expires:2500,origin:'narrative'};
 assert.equal(liveNoticeEligible(raw,current,.5,'running'),false);
});

test('R6.3 HUD and locator use exact current Session and live notice on click',()=>{
 const hud=readFileSync(new URL('../src/ui/tactical-hud-controller.ts',
  import.meta.url),'utf8');
 assert.match(hud,/session\?\{session,actors:currentOrders\?\?\[\],seconds:session\.seconds/);
 assert.match(hud,/liveExecutionNotice\(noticeFeed\.peek\(\)/);
 assert.match(hud,/port\.state\.seconds,port\.state\.phase/);
 assert.match(hud,/port\.selectUnit\(located\.actorId\)/);
 const feed=readFileSync(new URL('../src/ui/execution-feedback.ts',
  import.meta.url),'utf8');
 assert.match(feed,/this\.sessionKey!==scope\.session/);
 assert.match(feed,/this\.lastExecutionId=executionEvents\.at\(-1\)\?\.id\?\?null/);
 assert.match(feed,/actor\.plan\[0\]\?\.id===id/);
 const source=readFileSync(new URL('../src/breach-execution-events.ts',
  import.meta.url),'utf8');
 assert.match(source,/orderId:number\|null/);
});

test('R6.3 no new GO authority or hidden data access in current notice policy',()=>{
 const source=readFileSync(new URL('../src/ui/execution-notice-provenance.ts',
  import.meta.url),'utf8');
 assert.doesNotMatch(source,/(?:from|import)\s*['"].*(?:breach-game|breach-navigation|world-context|actor-motor|replay)/);
 assert.doesNotMatch(source,/Date\.now|performance\.now|document\.|window\.|stepSession\(/);
});
