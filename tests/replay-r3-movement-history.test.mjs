import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession} from '../src/breach-game.ts';
import {MissionRecorder} from '../src/breach-replay.ts';
import {ReplayMovementHistory} from '../src/breach-replay-movement-history.ts';
test('actual trail samples measured movement, never authored waypoints',()=>{
 const s=newSession(0),rec=new MissionRecorder();
 const a=s.operators.find(x=>x.side==='blue');
 assert.ok(a);
 const first={...a.p};rec.capture(s,true);
 a.plan=[{id:5,kind:'move',p:{x:500,y:500}}];
 s.seconds=.1;a.p={x:first.x+22,y:first.y};rec.capture(s,true);
 s.seconds=.2;a.p={x:first.x+44,y:first.y};rec.capture(s,true);
 const history=new ReplayMovementHistory(rec.frames,[a.id]);
 const visible=history.segment(a.id,.2,Infinity);
 assert.equal(visible.length,3);
 assert.equal(visible.at(-1).p.x,first.x+44);
 assert.ok(visible.every(p=>p.p.x<500));
 assert.equal(history.segment(a.id,.11,Infinity).length,2);
 assert.equal(history.segment('absent',.2,Infinity).length,0);
});
test('long routes are downsampled only for rendering',()=>{
 const s=newSession(0),rec=new MissionRecorder(),actor=s.operators[0];
 for(let i=0;i<200;i++){
  s.seconds=i*.05;actor.p={x:100+i*4,y:180};rec.capture(s,true);
 }
 const history=new ReplayMovementHistory(rec.frames,[actor.id]);
 assert.ok(history.count>150);
 const rendered=history.segment(actor.id,10,Infinity,20);
 assert.ok(rendered.length<=21);
 assert.equal(rendered.at(-1).p.x,100+199*4);
 const recent=history.segment(actor.id,10,.4,20);
 assert.ok(recent.length<rendered.length);
});
