import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classifyExecutionNotice,classifyExecutionTransition,ExecutionNoticeFeed,locateNoticeOrder} from '../src/ui/execution-feedback.ts';

test('events have a readable priority hierarchy',()=>{
 assert.equal(classifyExecutionNotice('ROOK DOWN — UNCONTROLLED BLEEDING').severity,'danger');
 assert.equal(classifyExecutionNotice('CONTACT HOSTILE').severity,'contact');
 assert.equal(classifyExecutionNotice('ROOK BLOCKED · DOOR').severity,'warning');
 assert.equal(classifyExecutionNotice('MOSS RELOADED').severity,'progress');
 assert.equal(classifyExecutionNotice('ROOK OPENED GATE').severity,'progress');
 assert.equal(classifyExecutionNotice('ROUTE SET').severity,'routine');
 const contact=classifyExecutionNotice('CONTACT HOSTILE');
 const reload=classifyExecutionNotice('ROOK RELOADED');
 assert.ok(contact.priority>reload.priority);
});
test('routine events cannot immediately bury injury/contact, but expire normally',()=>{
 const feed=new ExecutionNoticeFeed();
 assert.equal(feed.update([], 'planning',0),null);
 assert.equal(feed.update(['CONTACT NEAR DOOR'],'running',100)?.severity,'contact');
 assert.equal(feed.update(['CONTACT NEAR DOOR','ROOK RELOADED'],'running',200)?.severity,'contact');
 assert.equal(feed.update(['CONTACT NEAR DOOR','ROOK RELOADED'],'running',4301),null);
 assert.equal(feed.update(['CONTACT NEAR DOOR','ROOK RELOADED','ASH DOWN'],'running',4400)?.label,'URGENT');
 assert.equal(feed.update(['CONTACT NEAR DOOR','ROOK RELOADED','ASH DOWN'],'running',9700),null);
});
test('rollover of capped event log only enqueues new suffix',()=>{
 const feed=new ExecutionNoticeFeed();
 const old=Array.from({length:12},(_,i)=>'ROUTINE '+i);
 feed.update(old,'running',10);
 assert.equal(feed.update([...old.slice(1),'CONTACT AT HALL'],'running',20)?.text,'CONTACT AT HALL');
 assert.equal(feed.update([...old.slice(1),'CONTACT AT HALL'],'running',4220),null);
});
test('pause/resume cues are short, do not spam, and reset between missions',()=>{
 const feed=new ExecutionNoticeFeed();
 feed.update([],'planning',0);
 assert.equal(feed.update([],'running',10)?.text,'Executing planned orders');
 assert.equal(feed.update([],'running',20)?.text,'Executing planned orders');
 assert.equal(feed.update([],'planning',30)?.text,'Execution paused · Edit orders or resume');
 assert.equal(feed.update([],'planning',1700),null);
 feed.reset();
 assert.equal(feed.update([],'planning',1710),null);
});
test('HUD reads authoritative typed execution events and preserves presentation',()=>{
 const source=readFileSync(new URL('../src/ui/tactical-hud-controller.ts',import.meta.url),'utf8');
 assert.match(source,/noticeFeed\.update\(events,phase,performance\.now\(\),executionEvents\)/);
 assert.match(source,/state\.executionEvents/);
 assert.match(source,/noticeFeed\.reset\(\)/);
 assert.match(source,/node\.dataset\.severity=notice\.severity/);
});
test('structured status classification never parses human-readable text',()=>{
 const sample=(id,kind,reason,text='not an English status')=>({
  id,t:id/60,actor:'rook',p:{x:4,y:5},orderId:7,kind,reason,text
 });
 assert.equal(classifyExecutionTransition(sample(1,'blocked','door-locked')).severity,'warning');
 assert.equal(classifyExecutionTransition(sample(2,'holding','contact')).severity,'contact');
 assert.equal(classifyExecutionTransition(sample(3,'recovering','collision-furniture')).label,'RECOVERING');
 assert.equal(classifyExecutionTransition(sample(4,'started','moving')),null);
 const feed=new ExecutionNoticeFeed();
 assert.equal(feed.update([],'planning',0,[]),null);
 const blocked=sample(1,'blocked','door-locked');
 const first=feed.update([],'running',100,[blocked]);
 assert.equal(first?.label,'OBSTRUCTED');
 assert.equal(first?.text,'not an English status');
 assert.match(first?.recovery??'',/door/);
 assert.equal(feed.update([],'running',3800,[blocked]),null,'same ID cannot be redisplayed');
 const resumed=sample(2,'resumed','moving');
 assert.equal(feed.update([],'running',3900,[blocked,resumed])?.label,'RESUMED');
 const repeat=sample(3,'blocked','traffic-stall');
 assert.equal(feed.update([],'running',4000,[blocked,resumed,repeat])?.label,'OBSTRUCTED');
 assert.match(feed.update([],'running',4010,[blocked,resumed,repeat])?.recovery??'',/spacing/);
 feed.reset();
 assert.equal(feed.update([],'planning',5000,[]),null);
});
test('narrative input does not duplicate identical structured transitions',()=>{
 const feed=new ExecutionNoticeFeed();
 feed.update([],'planning',0,[]);
 const typed={id:1,t:1,actor:'rook',p:{x:0,y:0},orderId:1,
  kind:'blocked',reason:'order-failed',text:'ROOK BLOCKED'};
 const one=feed.update(['ROOK BLOCKED'],'running',100,[typed]);
 assert.equal(one?.label,'OBSTRUCTED');
 assert.equal(one?.priority,3);
});

test('TF3 carries typed actor and order, then validates before locating',()=>{
 const feed=new ExecutionNoticeFeed();
 feed.update([],'planning',0,[]);
 const e={id:1,t:1,actor:'moss',p:{x:23,y:14},orderId:42,
  kind:'blocked',reason:'door-locked',text:'MOSS STOPPED'};
 const n=feed.update([],'running',100,[e]);
 assert.equal(n.actorId,'moss');assert.equal(n.orderId,42);
 assert.deepEqual(locateNoticeOrder(n,[{id:'moss',plan:[{id:42}]}]),
  {actorId:'moss',orderId:42});
 assert.deepEqual(locateNoticeOrder(n,[{id:'moss',plan:[{id:7}]}]),
  {actorId:'moss',orderId:null});
 assert.equal(locateNoticeOrder(n,[{id:'rook',plan:[{id:42}]}]),null);
 const source=readFileSync(new URL('../src/ui/tactical-hud-controller.ts',import.meta.url),'utf8');
 assert.match(source,/data-locate-issue/);
 assert.match(source,/port\.selectUnit\(located\.actorId\)/);
 assert.match(source,/port\.selectedNode=located\.orderId/);
});
