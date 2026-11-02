import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classifyExecutionNotice,ExecutionNoticeFeed} from '../src/ui/execution-feedback.ts';

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
test('only known event log feeds UI, while paused state is explicit',()=>{
 const source=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
 assert.match(source,/executionNoticeFeed.update\(events,phase,performance\.now\(\)\)/);
 assert.match(source,/executionNoticeFeed.reset\(\)/);
 assert.match(source,/state\.started\?'PAUSED':'PLANNING'/);
 assert.match(source,/node\.dataset\.severity=notice\.severity/);
});
